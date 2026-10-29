import fs from 'fs';
import path from 'path';
import { expect, type Page } from '@playwright/test';
import { defaultPassword, fixtures, v1 } from './env';
import { fillSignupUntilVerification, openV1Login, submitSignupCode } from './v1-ui';

const data = {
  first: 'test',
  last: 'hamza',
  country: 'Morocco',
  phone: '612345678',
  job: 'aaa',
  address: 'adresse',
  idNumber: '123456',
  dob: '2000-01-01',
  state: 'aaa',
  city: 'aaa',
  companyEmail: 'a@yopmail.com',
  companyPhone: '+212666666666',
  year: '2025',
  employees: '100',
  turnover: '100',
  description: 'aaa',
};

function emailAddress(): string {
  return `hamza${Math.floor(10000 + Math.random() * 90000)}@yopmail.com`;
}

async function signupAndLogin(page: Page, email: string): Promise<string> {
  await page.goto(`${v1.loginUrl}?sign-up`);
  await page.context().clearCookies();
  await fillSignupUntilVerification(page, {
    first: data.first,
    last: data.last,
    email,
    password: defaultPassword,
    phone: data.phone,
    country: data.country,
  });
  // const mail = await page.context().newPage();
  // const code = await readYopmailCode(mail, email.split('@')[0]);
  // await mail.close();
  await submitSignupCode(page, '123456');
  await openV1Login(page);
  await page.locator("(//input[@id='dark-input'])[1]").fill(email);
  await page.locator("(//input[@id='dark-input'])[2]").fill(defaultPassword);
  await page.locator("xpath=//button[@type='submit' and contains(., 'Sign in')]").click();
  // const loginMail = await page.context().newPage();
  // const otp = await readYopmailCode(loginMail, email.split('@')[0]);
  // await loginMail.close();
  const { enterOtp } = await import('./otp');
  await enterOtp(page, '123456');
  await page.locator("xpath=//button[@type='submit' and contains(., 'Submit')]").click();
  await expect(page).toHaveURL(/\/workspace/, { timeout: 30_000 });
  return email.split('@')[0];
}

async function pickAnt(page: Page, inputId: string, text?: string): Promise<void> {
  const trigger = page.locator(`xpath=//input[@id='${inputId}']/ancestor::div[contains(@class, 'ant-select')]//div[contains(@class,'ant-select-selector')]`);
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  if (text) {
    await page.locator(`#${inputId}`).fill(text);
    await page.waitForTimeout(500);
    await page.locator(`#${inputId}`).press('ArrowDown');
    await page.locator(`#${inputId}`).press('Enter');
    return;
  }
  await page.locator("xpath=(//div[contains(@class, 'ant-select-dropdown') and not(contains(@class, 'ant-select-dropdown-hidden'))]//div[contains(@class, 'ant-select-item-option-content')])[1]").click();
}

async function openCollapse(page: Page, title: string): Promise<void> {
  const item = page.locator(`xpath=//div[contains(@class,'ant-collapse-item')][.//span[contains(@class,'ant-collapse-header-text')][normalize-space(.)='${title}']]`);
  const open = item.locator('.ant-collapse-content-active');
  if (!(await open.isVisible().catch(() => false))) await item.locator('.ant-collapse-header').click();
}

async function pickInCollapse(page: Page, title: string, inputId: string): Promise<void> {
  await openCollapse(page, title);
  const trigger = page.locator(`xpath=(//div[contains(@class,'ant-collapse-item')][.//span[normalize-space(.)='${title}']]//input[@id='${inputId}']/ancestor::div[contains(@class,'ant-select')]//div[contains(@class,'ant-select-selector')])[1]`);
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.locator("xpath=(//div[contains(@class, 'ant-select-dropdown') and not(contains(@class, 'ant-select-dropdown-hidden'))]//div[contains(@class, 'ant-select-item-option-content')])[1]").click();
}

async function saveCollapse(page: Page, title: string): Promise<void> {
  await page.locator(`xpath=//div[contains(@class,'ant-collapse-item')][.//span[normalize-space(.)='${title}']]//button[@type='submit']`).click();
}

export async function runSubscriberRegistration(page: Page): Promise<string> {
  const email = emailAddress();
  const log = path.join(process.cwd(), 'results', 'subscriber_registration_emails.txt');
  fs.mkdirSync(path.dirname(log), { recursive: true });
  fs.appendFileSync(log, `${email}\n`);
  const local = await signupAndLogin(page, email);

  await page.locator('xpath=/html/body/div[1]/div/div[2]/div[2]/div[1]').click();
  await page.locator('xpath=//*[@id="root"]/div/div[2]/button').click();
  await expect(page).toHaveURL(/\/workspace\/subscription\?step=TYPE_OF_ACCOUNT/);
  await pickAnt(page, 'businessPlan');
  await page.locator('#nameBusiness').fill(local);
  await page.locator('#numberBusiness').fill(local);
  await page.locator('#address').fill(local);
  await pickAnt(page, 'country', data.country);
  await page.locator("input[type='file']").first().setInputFiles(fixtures.pdf);
  await pickAnt(page, 'businessSectorsCodes', 'test');
  const submit = page.locator("xpath=//button[contains(@class, 'ant-btn-primary') and (.//span[normalize-space(.)='Submit'] or normalize-space(.)='Submit')]");
  await submit.click();
  await expect(page.locator('#nameBusiness')).toBeHidden({ timeout: 60_000 });
  await page.locator('xpath=/html/body/div[1]/div/div[2]/div/div/div/button').click();
  await expect(page).not.toHaveURL(/\/subscription/);

  const myProfile = page.locator("xpath=//li[@role='menuitem'][.//span[normalize-space(.)='My Profile']]");
  if (!(await myProfile.isVisible().catch(() => false))) {
    await page.locator("xpath=//div[contains(@class, 'ant-menu-submenu-title')][.//span[normalize-space(.)='Profile']]").click();
  }
  await myProfile.click();
  await page.locator('#basic_contactPerson').waitFor();
  await pickAnt(page, 'basic_contactPerson');
  await page.locator('#basic_jobTitle').fill(data.job);
  const dob = page.locator('#basic_dateOfBirth');
  if (await dob.isVisible().catch(() => false)) {
    await dob.fill(data.dob);
    await dob.press('Enter');
  }
  await page.locator('#basic_address').fill(data.address);
  await pickAnt(page, 'basic_idType');
  await page.locator('#basic_idNumber').fill(data.idNumber);
  await page.locator("xpath=//*[@id='basic']//button[.//span[normalize-space(.)='Save'] or normalize-space(.)='Save']").click();
  await expect(page.locator("xpath=//div[contains(@class,'ant-notification-notice-message')]")).toBeVisible();

  const company = page.locator("xpath=//li[@role='menuitem'][.//span[normalize-space(.)='Company Profile']]");
  if (!(await company.isVisible().catch(() => false))) {
    await page.locator("xpath=//div[contains(@class, 'ant-menu-submenu-title')][.//span[normalize-space(.)='Profile']]").click();
  }
  await company.click();
  await page.locator('#basic_state').waitFor();
  await openCollapse(page, 'Company Details');
  await page.locator('#basic_state').fill(data.state);
  await page.locator('#basic_city').fill(data.city);
  await page.locator('#basic_companyEmail').fill(data.companyEmail);
  await page.locator("xpath=//div[contains(@class,'ant-form-item')][.//label[@for='basic_phoneNumber']]//input[@type='tel']").fill(data.companyPhone);
  await page.locator('#basic_yearOfEstablishment').fill(data.year);
  await page.locator('#basic_yearOfEstablishment').press('Enter');
  await page.locator('#basic_numberOfEmployees').fill(data.employees);
  await page.locator('#basic_accountTurnover').fill(data.turnover);
  await page.locator('#basic_subscriptionAgreement').setInputFiles(fixtures.pdf);
  await page.locator('#basic_companyLogo').setInputFiles(fixtures.image);
  await page.locator('#basic_companyDescription').fill(data.description);
  await saveCollapse(page, 'Company Details');

  await openCollapse(page, 'Business Profile');
  for (const id of ['basic_businessNature', 'basic_productsOfInterest', 'basic_servicesOfInterest']) {
    await pickInCollapse(page, 'Business Profile', id);
  }
  await saveCollapse(page, 'Business Profile');

  await openCollapse(page, 'Contact and Preferences');
  for (const id of [
    'basic_matchingBusinessSectors',
    'basic_marketsOfInterest',
    'basic_matchingProductsOfInterest',
    'basic_matchingServiceOfInterest',
    'basic_matchingBusinessType',
    'basic_matchingBusinessNature',
  ]) {
    await pickInCollapse(page, 'Contact and Preferences', id);
  }
  await saveCollapse(page, 'Contact and Preferences');
  return email;
}

export async function runV1MultiSignup(page: Page): Promise<void> {
  const count = Number(process.env.NB_INSCRIPTIONS_V1 || process.env.NB_INSCRIPTIONS || 2);
  const log = path.join(process.cwd(), 'results', 'generated_signup_emails.txt');
  fs.mkdirSync(path.dirname(log), { recursive: true });
  for (let i = 0; i < count; i += 1) {
    const email = emailAddress();
    fs.appendFileSync(log, `${email}\n`);
    const local = await signupAndLogin(page, email);
    await page.locator('xpath=/html/body/div[1]/div/div[2]/div[2]/div[1]').click();
    await page.locator('xpath=//*[@id="root"]/div/div[2]/button').click();
    await expect(page).toHaveURL(/step=TYPE_OF_ACCOUNT/);
    await pickAnt(page, 'businessPlan');
    await page.locator('#nameBusiness').fill(local);
    await page.locator('#numberBusiness').fill(local);
    await page.locator('#address').fill(local);
    await pickAnt(page, 'country', data.country);
    await page.locator("input[type='file']").first().setInputFiles(fixtures.pdf);
    await pickAnt(page, 'businessSectorsCodes', 'test');
    await page.locator("xpath=//button[contains(@class, 'ant-btn-primary') and (.//span[normalize-space(.)='Submit'] or normalize-space(.)='Submit')]").click();
    await page.waitForTimeout(2000);
    await page.context().clearCookies();
    await page.goto(v1.loginUrl);
  }
}
