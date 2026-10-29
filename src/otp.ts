import { expect, type Frame, type Page } from '@playwright/test';
import { v2 } from './env';

const MARKERS = [
  'ATG Platform',
  'Africa Trade Gateway',
  'MFA Code',
  'Verify your e-mail address',
  'verification code',
];

const OTP_PATTERNS = [
  /code to log in to the Africa Trade Gateway \(ATG\):\s*<strong>(\d{6})<\/strong>/i,
  /Your verification code[^0-9]{0,80}(\d{6})/i,
  /<strong>(\d{6})<\/strong>/,
  /(\d{6})/,
];

function isCaptcha(content: string): boolean {
  const low = (content || '').toLowerCase();
  return [
    'captcha',
    'recaptcha',
    'turnstile',
    'confirm you are human',
    'please confirm you\'re human',
    'verification failed',
    'challenges.cloudflare',
    "i'm not a robot",
    'i am not a robot',
    'je ne suis pas un robot',
    'remplissez le captcha',
    'showrc();',
  ].some((token) => low.includes(token));
}

function extractOtp(content: string): string | undefined {
  if (!content) return undefined;
  const specific = content.match(
    /code to log in to the Africa Trade Gateway \(ATG\):\s*<strong>(\d{6})<\/strong>/i,
  );
  if (specific?.[1]) return specific[1];
  const strong = content.match(/<strong>(\d{6})<\/strong>/);
  if (strong?.[1] && MARKERS.some((marker) => content.includes(marker))) return strong[1];
  if (isCaptcha(content)) return undefined;
  if (!MARKERS.some((marker) => content.includes(marker))) return undefined;
  for (const pattern of OTP_PATTERNS) {
    const match = content.match(pattern);
    if (match?.[1] && /^\d{6}$/.test(match[1])) return match[1];
  }
  return undefined;
}

function mailIdsFrom(html: string): string[] {
  const ids = new Set<string>();
  for (const match of html.matchAll(/\bg\(\s*this\s*,\s*['"]([^'"]+)['"]/gi)) {
    ids.add(match[1]);
  }
  for (const match of html.matchAll(/\bid=["']?(me_[^"'\s>]+|e_[^"'\s>]+)/gi)) {
    ids.add(match[1]);
  }
  return [...ids];
}

function mailIdVariants(id: string): string[] {
  const raw = id.replace(/^me_/, '').replace(/^m_/, '').replace(/^e_/, '');
  return [...new Set([`me_${raw}`, `e_${raw}`, id])];
}

async function dismissYopmailBanners(mailPage: Page): Promise<void> {
  for (const name of ['Accept', 'OK', 'I agree', "J'accepte", 'Agree', 'Necessary']) {
    const btn = mailPage.getByRole('button', { name, exact: false });
    if (await btn.first().isVisible().catch(() => false)) {
      await btn.first().click().catch(() => undefined);
    }
  }
}

async function frameContent(page: Page, frameId: string): Promise<string> {
  const handle = page.frame({ name: frameId }) || page.frames().find((frame) => frame.name() === frameId);
  if (!handle) return '';
  const text = await handle.locator('body').innerText().catch(() => '');
  const html = await handle.content().catch(() => '');
  return `${text}\n${html}`;
}

async function readMail(page: Page): Promise<{ found: boolean; content: string }> {
  const combined = await frameContent(page, 'ifmail');
  const found = MARKERS.some((marker) => combined.includes(marker)) && !isCaptcha(combined);
  return { found, content: combined };
}

async function clickTurnstileIn(scope: Page | Frame, page: Page): Promise<boolean> {
  const iframe = scope.locator('iframe[src*="challenges.cloudflare.com"], iframe[src*="turnstile"], iframe[title*="Cloudflare" i]').first();
  if (!(await iframe.isVisible().catch(() => false))) return false;
  const box = await iframe.boundingBox().catch(() => null);
  if (box) {
    await page.mouse.click(box.x + 26, box.y + Math.min(32, box.height / 2));
    return true;
  }
  await iframe.click({ position: { x: 26, y: 32 } }).catch(() => undefined);
  return true;
}

async function clickRecaptcha(page: Page): Promise<boolean> {
  let clicked = await clickTurnstileIn(page, page);
  const ifmail = page.frame({ name: 'ifmail' });
  if (ifmail) clicked = (await clickTurnstileIn(ifmail, page)) || clicked;
  try {
    const frames = [ifmail, page].flatMap((scope) => {
      if (!scope) return [];
      return 'childFrames' in scope ? scope.childFrames() : page.frames();
    });
    const recaptcha = frames.find((frame) => /recaptcha/i.test(frame.url()));
    if (recaptcha) {
      const box = recaptcha.locator('.recaptcha-checkbox-border, #recaptcha-anchor');
      if (await box.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await box.first().click();
        clicked = true;
      }
    }
  } catch {
    /* ignore */
  }
  if (clicked) await page.waitForTimeout(2000);
  return clicked;
}

async function clickLatestAtgMail(page: Page): Promise<void> {
  const inbox = page.frameLocator('#ifinbox, iframe[name="ifinbox"]');
  const atg = inbox
    .locator('button.lm, a.lm, .m, [onclick]')
    .filter({ hasText: /Africa Trade Gateway|verification code|ATG|MFA/i })
    .first();
  if (await atg.isVisible().catch(() => false)) {
    await atg.click().catch(() => undefined);
    return;
  }
  await inbox.locator('button.lm, a.lm, .m').first().click().catch(() => undefined);
}

async function fetchMailBodyById(page: Page, inbox: string): Promise<string | undefined> {
  const inboxFrame = page.frame({ name: 'ifinbox' });
  const inboxHtml = (await inboxFrame?.content().catch(() => '')) || (await frameContent(page, 'ifinbox'));
  const ids = mailIdsFrom(inboxHtml);
  if (ids.length) console.log(`[yopmail] inbox ids: ${ids.slice(0, 4).join(', ')}`);
  const inboxUrl = inboxFrame?.url() || '';
  const yp = new URL(inboxUrl || 'https://yopmail.com/').searchParams;
  for (const id of ids.slice(0, 8)) {
    for (const variant of mailIdVariants(id)) {
      for (const pathName of ['/mail', '/en/mail']) {
        const url = new URL(`https://yopmail.com${pathName}`);
        url.searchParams.set('b', inbox);
        url.searchParams.set('id', variant);
        if (yp.get('yp')) url.searchParams.set('yp', yp.get('yp') || '');
        if (yp.get('yj')) url.searchParams.set('yj', yp.get('yj') || '');
        const res = await page.request.get(url.href).catch(() => null);
        if (!res || !res.ok()) continue;
        const code = extractOtp(await res.text());
        if (code) return code;
      }
    }
  }
  return undefined;
}

async function openYopmailInbox(mailPage: Page, inbox: string): Promise<void> {
  await mailPage.goto(v2.yopmailUrl, { waitUntil: 'domcontentloaded' });
  await dismissYopmailBanners(mailPage);
  const login = mailPage.locator('#login');
  await login.waitFor({ timeout: 20_000 });
  await login.fill(inbox);
  await mailPage.locator('#refreshbut').click();
  await mailPage.waitForTimeout(3000);
}

export async function readYopmailCode(mailPage: Page, inbox: string, timeoutMs = 180_000): Promise<string> {
  let intercepted: string | undefined;
  mailPage.on('response', async (res) => {
    if (!/\/mail\?/i.test(res.url()) || !res.ok()) return;
    const code = extractOtp(await res.text().catch(() => ''));
    if (code) intercepted = code;
  });

  await openYopmailInbox(mailPage, inbox);
  const deadline = Date.now() + timeoutMs;
  let lastContent = '';
  let lastCaptchaClick = 0;

  while (Date.now() < deadline) {
    if (intercepted) return intercepted;

    await clickLatestAtgMail(mailPage);
    const byId = await fetchMailBodyById(mailPage, inbox);
    if (byId) return byId;

    const { found, content } = await readMail(mailPage);
    lastContent = content;
    const code = extractOtp(content);
    if (found && code) return code;

    const inboxText = await frameContent(mailPage, 'ifinbox');
    const pageText = `${await mailPage.locator('body').innerText().catch(() => '')}\n${content}\n${inboxText}`;
    if (isCaptcha(pageText) || isCaptcha(content)) {
      console.warn(
        '[WARN] Yopmail captcha is up. Auto-clicking it. If it stays, check it in Chrome. The test will wait.',
      );
      if (Date.now() - lastCaptchaClick > 8_000) {
        await clickRecaptcha(mailPage);
        lastCaptchaClick = Date.now();
      }
      await mailPage.waitForTimeout(3000);
      continue;
    }

    await mailPage.locator('#refreshbut').click().catch(() => undefined);
    await mailPage.waitForTimeout(5000);
  }

  const snippet = (lastContent || '').replace(/\s+/g, ' ').slice(0, 180);
  await mailPage.screenshot({ path: 'test-results/yopmail-last.png', timeout: 5_000 }).catch(() => undefined);
  throw new Error(`No ATG verification email found for ${inbox}. Snippet: ${JSON.stringify(snippet)}`);
}

export async function enterOtp(page: Page, code: string): Promise<void> {
  expect(code).toMatch(/^\d{6}$/);
  const boxes = page.locator("input[id^='otp-'][maxlength='1']");
  if ((await boxes.count()) >= 6 && (await boxes.first().isVisible().catch(() => false))) {
    await boxes.first().click();
    for (let i = 0; i < 6; i++) {
      await boxes.nth(i).fill(code[i]);
    }
    return;
  }
  const single = page.locator("#dark-input[placeholder='Enter your 6-digit code']");
  await single.waitFor({ timeout: 15_000 });
  await single.click();
  await single.fill(code);
  if ((await single.inputValue()) !== code) {
    await single.fill(code);
    expect(await single.inputValue()).toBe(code);
  }
}

export async function fillOtpFromYopmail(page: Page, email: string): Promise<void> {
  const inbox = email.split('@')[0];
  await page.waitForTimeout(2000);
  const mail = await page.context().newPage();
  try {
    const code = await readYopmailCode(mail, inbox);
    await mail.close();
    await page.bringToFront();
    await enterOtp(page, code);
    const submit = page.locator("button[type='submit']");
    if (await submit.isVisible().catch(() => false)) {
      await submit.click().catch(() => undefined);
    }
  } finally {
    await mail.close().catch(() => undefined);
  }
}
