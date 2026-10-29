import { execSync, spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import { test as base, chromium, type Browser, type BrowserContext } from '@playwright/test';

/** Same TEMP profile Robot uses so Yopmail Cloudflare cookies survive between runs. */
export const YOPMAIL_PROFILE_DIR = path.join(
  process.env.TEMP || os.tmpdir(),
  'rf-atg-v2-chrome-yopmail',
);

const DEBUG_PORT = Number(process.env.YOPMAIL_CHROME_PORT || 9333);

const ATG_ORIGINS = [
  'https://uat.atg.africa',
  'https://staging-atg.peaqock.com',
  'https://atg.africa',
];

function chromeExecutable(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || 'chrome';
}

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
  });
}

async function waitForPort(port: number, timeoutMs = 25_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await portOpen(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Chrome debug port ${port} did not open`);
}

function pidsOnPort(port: number): string[] {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    return [
      ...new Set(
        out
          .split(/\r?\n/)
          .map((line) => line.trim().split(/\s+/).pop() || '')
          .filter((pid) => pid && pid !== '0'),
      ),
    ];
  } catch {
    return [];
  }
}

function killChromeOnDebugPort(): void {
  for (const pid of pidsOnPort(DEBUG_PORT)) {
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } catch {
      /* already gone */
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForChromeGone(timeoutMs = 15_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    killChromeOnDebugPort();
    if (!(await portOpen(DEBUG_PORT)) && pidsOnPort(DEBUG_PORT).length === 0) {
      await sleep(400);
      return;
    }
    await sleep(300);
  }
}

function rmBestEffort(target: string): void {
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES' || code === 'ENOENT') return;
    throw error;
  }
}

function wipeRestoredTabs(profileDir: string): void {
  const defaults = path.join(profileDir, 'Default');
  for (const name of ['Current Session', 'Current Tabs', 'Last Session', 'Last Tabs', 'Sessions']) {
    rmBestEffort(path.join(defaults, name));
  }
}

async function clearAtgSession(context: BrowserContext): Promise<void> {
  const page = context.pages()[0] ?? (await context.newPage());
  const client = await context.newCDPSession(page);
  for (const origin of ATG_ORIGINS) {
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'all' }).catch(() => undefined);
  }
  const cookies = await context.cookies();
  for (const cookie of cookies) {
    if (/yopmail|cloudflare/i.test(cookie.domain)) continue;
    if (!/atg|peaqock/i.test(cookie.domain)) continue;
    await context.clearCookies({ name: cookie.name, domain: cookie.domain }).catch(() => undefined);
  }
}

async function closeBrowser(browser: Browser | undefined, chrome: ChildProcess | undefined): Promise<void> {
  await browser?.close().catch(() => undefined);
  if (chrome?.pid && !chrome.killed) {
    try {
      process.kill(chrome.pid);
    } catch {
      /* ignore */
    }
  }
  await waitForChromeGone();
}

export const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, use) => {
    fs.mkdirSync(YOPMAIL_PROFILE_DIR, { recursive: true });
    await waitForChromeGone();
    wipeRestoredTabs(YOPMAIL_PROFILE_DIR);
    await sleep(300);

    const chrome = spawn(
      chromeExecutable(),
      [
        `--user-data-dir=${YOPMAIL_PROFILE_DIR}`,
        `--remote-debugging-port=${DEBUG_PORT}`,
        '--remote-debugging-address=127.0.0.1',
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-session-crashed-bubble',
        '--hide-crash-restore-bubble',
        '--homepage=about:blank',
        'about:blank',
      ],
      { stdio: 'ignore' },
    );
    try {
      await waitForPort(DEBUG_PORT);
    } catch (error) {
      await closeBrowser(undefined, chrome);
      throw error;
    }

    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${DEBUG_PORT}`);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    for (const leftover of context.pages().slice(1)) {
      await leftover.close().catch(() => undefined);
    }
    await clearAtgSession(context);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('about:blank').catch(() => undefined);

    try {
      await use(context);
    } finally {
      for (const open of context.pages()) {
        await open.close().catch(() => undefined);
      }
      await closeBrowser(browser, chrome);
    }
  },
  page: async ({ context }, use) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('about:blank').catch(() => undefined);
    await use(page);
  },
});

export { expect } from '@playwright/test';
