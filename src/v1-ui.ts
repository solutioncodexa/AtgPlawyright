import fs from 'fs';
import path from 'path';
import { expect, type Locator, type Page } from '@playwright/test';
import { defaultPassword, fixtures, stamp, users, v1 } from './env';
import { fillOtpFromYopmail } from './otp';

const loginEmail = "(//input[@id='dark-input'])[1]";
const loginPassword = "(//input[@id='dark-input'])[2]";
const loginSubmit = "xpath=//button[@type='submit' and contains(@class, 'ant-btn') and contains(., 'Sign in')]";
const loginError = "xpath=//div[contains(@class, 'ant-message') or contains(., 'Invalid') or contains(., 'incorrect') or contains(., 'failed')]";
const logoutItem = "xpath=//div[@role='menuitem' and .//span[normalize-space(.)='Logout']]";

export async function openV1Login(page: Page): Promise<void> {
  await page.goto(v1.loginUrl);
  await page.locator(`xpath=${loginEmail}`).waitFor();
}

export async function openV1Signup(page: Page): Promise<void> {
  await page.goto(`${v1.loginUrl}?sign-up`);
  await page.locator('#firstName').waitFor();
}

async function pickCountry(page: Page, country: string): Promise<void> {
  const field = page.locator('#countryCode');
  await field.click();
  await field.fill(country);
  await page.waitForTimeout(500);
  await field.press('ArrowDown');
  await field.press('Enter');
}

export async function fillSignupUntilVerification(
  page: Page,
  details: { first: string; last: string; email: string; password: string; phone: string; country?: string },
): Promise<void> {
  await page.locator('#firstName').fill(details.first);
  await page.locator('#lastName').fill(details.last);
  await page.locator('#light-input').first().fill(details.email);
  await page.locator('#emailConfirm').fill(details.email);
  await page.locator("xpath=//input[@id='light-input' and @type='password']").fill(details.password);
  await page.locator('#confirmPassword').fill(details.password);
  await pickCountry(page, details.country || 'Morocco');
  await page.locator("input[type='tel'].form-control").fill(details.phone);
  await page.locator('#hasEvoucher').click();
  await page.locator("xpath=//button[@type='submit' and .//span[normalize-space(.)='CREATE YOUR ACCOUNT']]").click();
  await page.locator("xpath=//h1[contains(., 'Verify your e-mail address')]").waitFor({ timeout: 20_000 });
}

export async function submitSignupCode(page: Page, code: string): Promise<void> {
  const boxes = page.locator("input[maxlength='1']");
  await boxes.first().click();
  if ((await boxes.count()) >= 6) {
    for (let i = 0; i < 6; i += 1) await boxes.nth(i).fill(code[i]);
  } else {
    await boxes.first().fill(code);
  }
  await page.locator("xpath=//button[@type='button' and .//span[normalize-space(.)='Verify']]").click();
  await page.locator("xpath=//div[contains(@class,'ant-notification-notice-success')]").waitFor({ timeout: 15_000 });
  await expect(page).toHaveURL(new RegExp(v1.loginUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), { timeout: 15_000 });
}

export async function loginV1(page: Page, role: 'admin' | 'subscriber'): Promise<void> {
  const user = users[role];
  await page.locator(`xpath=${loginEmail}`).fill(user.email);
  await page.locator(`xpath=${loginPassword}`).fill(user.password);
  await page.locator(loginSubmit).click();
  await page.locator("#dark-input[placeholder='Enter your 6-digit code']").waitFor();
  await fillOtpFromYopmail(page, user.email);
  const submit = page.locator("xpath=//button[@type='submit' and contains(., 'Submit')]");
  if (await submit.isVisible().catch(() => false)) await submit.click();
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 20_000 });
  await expect(page).toHaveURL(/\/workspace/);
}

export async function loginV1Invalid(page: Page, kind: 'invalidEmail' | 'invalidPassword'): Promise<void> {
  const user = users[kind];
  await page.locator(`xpath=${loginEmail}`).fill(user.email);
  await page.locator(`xpath=${loginPassword}`).fill(user.password);
  await page.locator(loginSubmit).click();
  await page.locator(loginError).waitFor();
}

export async function logoutFromDashboard(page: Page): Promise<void> {
  const item = page.locator(logoutItem);
  await item.scrollIntoViewIfNeeded();
  await item.click();
  await expect(page).toHaveURL(new RegExp('/auth'), { timeout: 15_000 });
}

export async function signUpNewUser(page: Page): Promise<string> {
  const email = `hamza${Math.floor(10000 + Math.random() * 90000)}rf@yopmail.com`;
  await page.goto(`${v1.loginUrl}?sign-up`);
  await fillSignupUntilVerification(page, {
    first: 'hamza',
    last: 'hamza',
    email,
    password: defaultPassword,
    phone: '612345678',
  });
  const code = await readCodeOnNewPage(page, email);
  await submitSignupCode(page, code);
  const log = path.join(process.cwd(), 'results', 'signed_up_emails.txt');
  fs.mkdirSync(path.dirname(log), { recursive: true });
  fs.appendFileSync(log, `${email}\n`);
  return email;
}

async function readCodeOnNewPage(page: Page, email: string): Promise<string> {
  return '123456';
  /*
  const mail = await page.context().newPage();
  try {
    const { readYopmailCode } = await import('./otp');
    return await readYopmailCode(mail, email.split('@')[0]);
  } finally {
    await mail.close();
  }
  */
}

export async function inviteIndividual(page: Page, first = 'John', last = 'Doe', country = 'Morocco'): Promise<string> {
  const email = `individual${Math.floor(10000 + Math.random() * 90000)}@yopmail.com`;
  const store = fixtures.lastInviteEmail;
  fs.mkdirSync(path.dirname(store), { recursive: true });
  fs.writeFileSync(store, email);

  const modal = page.locator("xpath=//div[contains(@class, 'ant-modal-content')]");
  if (await modal.isVisible().catch(() => false)) {
    await page.locator("xpath=//div[contains(@class, 'ant-modal-content')]//button[.//span[normalize-space(.)='Continue']]").click().catch(() => undefined);
  }

  const sidebar = page.locator("xpath=//aside[contains(@class, 'ant-layout-sider')]");
  await sidebar.waitFor();
  await clickText(page, 'Operation Management');
  await clickText(page, 'Subscription');
  await page.locator("xpath=//div[@role='tab' and contains(@id, '-tab-assisted-subscription')]").click();
  await page.locator("xpath=//div[@role='tab' and contains(@id, '-tab-invite')]").click();
  await page.locator("xpath=//button[.//span[normalize-space(.)='Invite Subscriber']]").click();
  await page.locator("xpath=//div[contains(@class, 'ant-modal') or contains(@class, 'ant-drawer')]//form").waitFor();
  await page.locator("input[type='radio'][value='individual']").click();
  await page.locator('#firstName').fill(first);
  await page.locator('#lastName').fill(last);
  await page.locator('#email').fill(email);
  const countryTrigger = page.locator("xpath=//div[contains(@class, 'ant-select') and .//input[@id='companyCountry']]");
  await countryTrigger.click();
  await page.locator('#companyCountry').fill(country);
  await page.locator(`xpath=//div[contains(@class, 'ant-select-item-option-content') and contains(., "${country}")]`).first().click();
  const invite = page.locator("xpath=//button[@type='submit' and .//span[normalize-space(.)='Invite']]");
  await expect(invite).toBeEnabled();
  await invite.click();
  await expect(page.getByText(/successfully/i)).toBeVisible({ timeout: 15_000 });
  await page.goto('https://yopmail.com/');
  await page.locator('#login').fill(email.split('@')[0]);
  await page.locator('#refreshbut').click();
  return email;
}

async function clickText(page: Page, text: string): Promise<void> {
  const item: Locator = page.locator(`xpath=//span[normalize-space(.)='${text}']`).first();
  await item.scrollIntoViewIfNeeded();
  await item.click();
}

export function randomSignupEmail(prefix = 'hamza'): string {
  return `${prefix}${stamp()}@yopmail.com`;
}
