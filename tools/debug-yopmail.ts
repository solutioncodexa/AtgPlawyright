import fs from 'fs';
import os from 'os';
import path from 'path';
import { chromium } from '@playwright/test';

const inbox = process.env.YOPMAIL_INBOX || 'paka';
const profile = path.join(process.env.TEMP || os.tmpdir(), 'rf-atg-v2-chrome-yopmail');

async function dump(label: string, text: string) {
  const digits = [...text.matchAll(/\b(\d{6})\b/g)].map((m) => m[1]);
  console.log(`\n=== ${label} chars=${text.length} digits=${digits.join(',') || 'none'} ===`);
  console.log(text.replace(/\s+/g, ' ').slice(0, 1500));
}

(async () => {
  fs.mkdirSync(profile, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    locale: 'en-US',
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled', '--lang=en-US'],
    ignoreDefaultArgs: ['--enable-automation'],
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto('https://yopmail.com/', { waitUntil: 'domcontentloaded' });
  await page.locator('#login').waitFor({ timeout: 20_000 });
  await page.locator('#login').fill(inbox);
  await page.locator('#refreshbut').click();
  await page.waitForTimeout(3000);

  const turnstile = page.locator('iframe[src*="challenges.cloudflare.com"]');
  if (await turnstile.first().isVisible().catch(() => false)) {
    console.log('turnstile visible, clicking');
    await turnstile.first().click({ position: { x: 28, y: 32 } }).catch((e) => console.log('click err', e.message));
    await page.waitForTimeout(4000);
  }

  console.log('url', page.url());
  console.log('frames', page.frames().map((f) => `${f.name() || '-'} ${f.url()}`).join('\n'));

  const inboxFrame = page.frame({ name: 'ifinbox' });
  const inboxSrc = inboxFrame?.url() || (await page.locator('#ifinbox').getAttribute('src').catch(() => null));
  console.log('ifinbox src', inboxSrc);
  if (inboxSrc && inboxSrc.startsWith('http')) {
    const res = await page.request.get(inboxSrc);
    await dump(`GET ifinbox-url ${res.status()}`, await res.text());
  }

  for (const url of [
    `https://yopmail.com/inbox?login=${inbox}&p=1`,
    `https://yopmail.com/en/inbox?login=${inbox}&p=1`,
  ]) {
    const res = await page.request.get(url);
    await dump(`GET ${url} ${res.status()}`, await res.text());
  }

  const inboxHtml = await page.frame({ name: 'ifinbox' })?.content().catch(() => '') || '';
  const ids = [...inboxHtml.matchAll(/\bid=["']?([me_]*e_[^"'\s>]+)/gi)].map((m) => m[1]);
  console.log('ids from frame', ids.slice(0, 8));

  const allIds = [
    ...ids,
    ...[...(inboxHtml.matchAll(/\bid=["']?([me_]*e_[^"'\s>]+)/gi) || [])].map((m) => m[1]),
  ];
  const unique = [...new Set(allIds.length ? allIds : ['skip'])];
  for (const id of unique.slice(0, 3)) {
    if (id === 'skip') break;
    const meId = id.startsWith('m') ? id : `m${id}`;
    for (const pathName of ['/mail', '/en/mail']) {
      const url = `https://yopmail.com${pathName}?b=${inbox}&id=${encodeURIComponent(meId)}`;
      const res = await page.request.get(url);
      await dump(`GET ${pathName} id=${meId} ${res.status()}`, await res.text());
    }
  }

  await context.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
