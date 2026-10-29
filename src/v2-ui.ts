import fs from 'fs';
import path from 'path';
import { expect, type Page } from '@playwright/test';
import { fixtures, stamp, users, v2 } from './env';
import {
  appendKoraEvaluationInteraction,
  finalizeKoraEvaluationReport,
  lookupExpectedAnswer,
  startKoraEvaluationReport,
  waitForKoraResponseText,
} from './kora-report';
import { enterOtp, fillOtpFromYopmail } from './otp';

const resultsRoot = path.join(process.cwd(), 'results', 'atg_v2');

export async function openV2Login(page: Page): Promise<void> {
  await page.goto(v2.loginUrl);
  if (!/signin|signup|auth/i.test(page.url())) {
    await page.goto(v2.loginUrl, { waitUntil: 'domcontentloaded' });
  }
  await ensureEnglish(page);
  await page.locator('#signin-email').waitFor();
}

async function ensureEnglish(page: Page): Promise<void> {
  const english = page.getByText('English', { exact: false });
  if (await english.first().isVisible().catch(() => false)) return;
  const globe = page.locator("xpath=//button[@aria-haspopup='listbox'][.//svg[contains(@class,'lucide-globe')]]");
  if (await globe.isVisible().catch(() => false)) {
    await globe.click();
    await page.locator('[role="listbox"] span[lang="en"]').click().catch(() => undefined);
  }
}

export async function dismissMeetKora(page: Page): Promise<void> {
  const dismiss = page.getByRole('button', { name: 'Dismiss' });
  if (await dismiss.first().isVisible().catch(() => false)) {
    await dismiss.first().click();
  }
}

async function submitCredentials(page: Page, email: string, password: string): Promise<void> {
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.locator("button[type='submit']").click();
}

export async function loginShouldBeRejected(page: Page, email: string, password: string): Promise<void> {
  await openV2Login(page);
  await submitCredentials(page, email, password);
  await expect(page.getByText(/Invalid/i).first()).toBeVisible();
}

export async function logoutWorkspace(page: Page): Promise<void> {
  if (/signin|signup|auth/i.test(page.url()) && (await page.locator('#signin-email').isVisible().catch(() => false))) {
    return;
  }
  const operatorLogout = page.locator('.ant-menu-submenu-title').filter({ hasText: /^Logout$/ });
  if (await operatorLogout.first().isVisible().catch(() => false)) {
    await operatorLogout.first().click();
    await page.waitForURL(/signin|auth/i, { timeout: 30_000 });
    return;
  }
  const settings = page.getByRole('button', { name: /Open settings/i });
  if (await settings.first().isVisible().catch(() => false)) {
    await settings.first().click();
    await page.getByRole('menuitem', { name: /Log Out/i }).click();
    await page.waitForURL(/signin|auth/i, { timeout: 30_000 });
    return;
  }
  await page.goto(v2.loginUrl);
}

export async function loginV2WithOtp(
  page: Page,
  email: string,
  password: string,
  landed: 'operator' | 'v2',
): Promise<void> {
  await logoutWorkspace(page);
  await openV2Login(page);
  if (!/signin|signup|auth/i.test(page.url())) {
    await logoutWorkspace(page);
    await openV2Login(page);
  }
  await submitCredentials(page, email, password);
  const boxes = page.locator("input[id^='otp-'][maxlength='1']");
  const single = page.locator("#dark-input[placeholder='Enter your 6-digit code']");
  await boxes.or(single).first().waitFor({ timeout: 30_000 });
  await fillOtpFromYopmail(page, email);
  const verify = page.getByRole('button', { name: /Verify & continue/i });
  if ((await verify.isVisible().catch(() => false)) && (await verify.isEnabled().catch(() => false))) {
    await verify.click().catch(() => undefined);
  }
  const submit = page.locator("button[type='submit']");
  if (await submit.isVisible().catch(() => false)) await submit.click().catch(() => undefined);
  if (landed === 'operator') {
    await expect(page).toHaveURL(/\/workspace(?!\/v2)/, { timeout: 60_000 });
  } else {
    await expect(page).toHaveURL(/\/workspace\/v2(?!\/signin|\/signup)/, { timeout: 60_000 });
    await dismissMeetKora(page);
  }
}

export async function loginAsRole(page: Page, role: 'admin' | 'companyAdmin'): Promise<void> {
  const user = role === 'admin' ? users.admin : users.companyAdmin;
  await loginV2WithOtp(page, user.email, user.password, role === 'admin' ? 'operator' : 'v2');
  if (role === 'admin') {
    await page.locator("xpath=//aside|//*[contains(normalize-space(.),'ATG Operator')]").first().waitFor({ timeout: 20_000 });
  } else if (!/\/workspace\/v2\/workspace/.test(page.url())) {
    await page.goto(v2.workspaceUrl);
    await expect(page).toHaveURL(/\/workspace\/v2\/workspace/, { timeout: 60_000 });
    await dismissMeetKora(page);
  }
  const shotDir = path.join(resultsRoot, 'screenshots', 'login');
  fs.mkdirSync(shotDir, { recursive: true });
  await page.screenshot({
    path: path.join(shotDir, role === 'admin' ? 'atg_classic_dashboard_after_login.png' : 'atg_v2_dashboard_after_login.png'),
  });
}

export async function workspaceLoaded(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/workspace\/v2\/workspace|\/workspace(?!\/v2\/signin|\/v2\/signup|\/auth)/);
  await dismissMeetKora(page);
}

async function clickExact(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name, exact: true }).filter({ visible: true }).last().click();
}

async function clickOption(page: Page, name: string | RegExp): Promise<void> {
  const option = page.getByRole('option', { name }).or(page.locator('.ant-select-item-option').filter({ hasText: name })).first();
  if (await option.isVisible().catch(() => false)) {
    await option.click();
    return;
  }
  await page.getByText(name).first().click();
}

export async function onboardBusinessByOperator(page: Page, id = stamp()): Promise<string> {
  const handle = `hamza${id}`;
  const email = `${handle}@yopmail.com`;
  const phone = '+212 666 666 666';
  const wizard = page.getByLabel('Onboard a user');

  const operation = page.getByRole('menuitem', { name: 'Operation Management' });
  await operation.scrollIntoViewIfNeeded();
  await operation.getByText('Operation Management', { exact: true }).click();
  await page.getByText('Subscription', { exact: true }).click();
  await page.getByText('Assisted Onboarding', { exact: true }).click();
  await page.getByRole('button', { name: /Onboard a user/ }).click();
  await page.getByRole('button', { name: /A business/ }).click();
  await clickExact(page, 'Continue');

  await wizard.getByRole('textbox', { name: 'Acme Trading Ltd.' }).fill(handle);
  await wizard.getByRole('textbox', { name: 'RC1234567' }).fill(handle);
  const country = wizard.getByRole('combobox').filter({ visible: true }).first();
  await country.click();
  await country.fill('moro');
  await clickOption(page, /^Morocco$/);
  await wizard.getByRole('textbox', { name: 'info@company.com' }).fill(email);
  await clickExact(page, 'Continue');

  const phoneField = page.getByRole('textbox', { name: 'Phone number' }).filter({ visible: true });
  await phoneField.fill(phone);
  await page.getByText('Select the type of business', { exact: true }).click();
  await clickOption(page, 'Government Institution');
  const sector = page.getByRole('button', { name: 'Business sector (ISIC)' });
  await sector.click();
  await page.getByRole('button', { name: /Agriculture, forestry/ }).click();
  await page.getByRole('button', { name: /Crop and animal production/ }).click();
  await sector.click();
  const upload = page.getByRole('button', { name: /Upload certificate/ });
  const file = upload.locator('input[type="file"]');
  const certificate = (await file.count()) > 0 ? file : upload;
  await certificate.setInputFiles(fixtures.pdf);
  await clickExact(page, 'Continue');

  await page.getByRole('combobox').filter({ visible: true }).last().click();
  await clickOption(page, /SPECIAL PACKAGE/);
  await clickExact(page, 'Continue');

  await page.getByRole('textbox', { name: 'First name' }).fill('hamza');
  await page.getByRole('textbox', { name: 'Last name' }).fill('hamza');
  await page.getByRole('textbox', { name: 'you@example.com' }).fill(email);
  await page.getByRole('textbox', { name: 'Phone number' }).filter({ visible: true }).last().fill(phone);
  await page.getByRole('button', { name: 'Create account' }).click();
  const close = page.locator('button').filter({ hasText: 'Close', visible: true }).last();
  await expect(close).toBeVisible({ timeout: 60_000 });
  await close.click();
  await expect(page.getByRole('button', { name: /Onboard a user/ })).toBeVisible();
  return email;
}

async function clearAndType(page: Page, selector: string, value: string): Promise<void> {
  const field = page.locator(selector);
  await field.waitFor();
  await field.fill(value);
}

async function selectLabel(page: Page, selector: string, label: string): Promise<void> {
  const field = page.locator(selector).first();
  await field.waitFor();
  const tag = await field.evaluate((el) => el.tagName.toLowerCase());
  if (tag === 'select') {
    await field.selectOption({ label });
    return;
  }
  await field.click();
  await page.getByRole('option', { name: label }).first().click();
}

export async function openSignupFromSignIn(page: Page): Promise<void> {
  await page.goto(v2.signupUrl);
  await ensureEnglish(page);
  const clear = page.getByRole('button', { name: /Clear draft/i });
  if (await clear.isVisible().catch(() => false)) {
    await clear.click();
    const confirm = page.getByRole('button', { name: /Clear|Confirm|Yes/i });
    if (await confirm.first().isVisible().catch(() => false)) await confirm.first().click();
  }
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Company/ }).first()).toBeVisible();
  await expect(page.getByText('Step 1 of')).toBeVisible();
}

export async function chooseAccountType(page: Page, type: 'company' | 'individual'): Promise<void> {
  if (type === 'company') {
    await page.getByRole('button', { name: /Full access to MANSA|Company/ }).first().click();
  } else {
    await page.getByRole('button', { name: /Limited access|Individual/ }).first().click();
    await expect(page.getByText(/upgrade an individual account/i)).toBeVisible();
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

export async function companyWizardFiveSteps(page: Page): Promise<void> {
  for (const label of ['Account', 'Business', 'Business KYC', 'Admin user', 'Verify email']) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
}

export async function individualWizardThreeSteps(page: Page): Promise<void> {
  await expect(page.getByText('Step 2 of 3')).toBeVisible();
  await expect(page.locator('#admin-first')).toBeVisible();
  await expect(page.locator('#admin-gender')).toBeVisible();
  await expect(page.locator('#admin-nationality')).toBeVisible();
}

export async function emptyRequiredFieldsBlockContinue(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/\/auth/);
  await expect(page).not.toHaveURL(/workspace\/v2\/workspace/);
}

export async function fillCompanyBusinessStep(page: Page, name: string, regNo: string, email: string): Promise<void> {
  await expect(page.getByRole('heading', { name: /Tell us about your business/ })).toBeVisible();
  await clearAndType(page, '#signup-business-name', name);
  await clearAndType(page, '#signup-regnum', regNo);
  await selectLabel(page, '#signup-country', 'Morocco');
  await clearAndType(page, '#signup-business-email', email);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

async function selectIsic(page: Page): Promise<void> {
  await page.locator("xpath=//*[@aria-label='Business sector (ISIC)'] | //button[contains(.,'Search by section or division')]").first().click();
  const popover = page.locator('[data-v2-popover]');
  await popover.waitFor();
  await popover.getByRole('button', { name: /Agriculture, forestry and fishing/ }).click();
  await popover.getByRole('button', { name: /Crop and animal production/ }).click();
  await page.getByRole('heading', { name: /A few more business details/ }).click();
  await expect(popover).toBeHidden({ timeout: 8_000 });
}

export async function fillCompanyKycStep(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: /A few more business details/ })).toBeVisible();
  await page.locator('input[type="tel"]').first().fill('600000000');
  await selectLabel(page, "xpath=//label[contains(.,'Type of Business')]/following::select[1]", 'Other');
  await selectIsic(page);
  await page.locator('#signup-cert').setInputFiles(fixtures.pdf);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Create the admin account/ })).toBeVisible();
}

export async function toggleTaxExemption(page: Page): Promise<void> {
  await selectLabel(page, "xpath=//label[contains(.,'Type of Business')]/following::select[1]", 'Financial Services Provider');
  await expect(page.getByText(/tax exemption/i)).toBeVisible();
  await page.getByText('Yes', { exact: true }).click();
  const cert = page.locator("xpath=//label[contains(.,'Tax Certificate Number')]/following::input[1]");
  await expect(cert).toBeVisible();
  await expect(page.locator("xpath=//label[contains(.,'Date of Issuance')]/following::input[1]")).toBeVisible();
  await page.getByText('No', { exact: true }).click();
  await expect(cert).toHaveCount(0);
}

export async function fillAdminUserStep(page: Page, first: string, last: string, email: string, password: string): Promise<void> {
  await page.locator('#admin-first').fill(first);
  await page.locator('#admin-last').fill(last);
  await page.locator('#admin-email').fill(email);
  await page.locator('#admin-phone').fill('600000001');
  await page.locator('#admin-password').fill(password);
  await page.locator('#admin-confirm').fill(password);
  await page.locator('#admin-terms').click();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
}

export async function fillIndividualDetails(page: Page, first: string, last: string, email: string, password: string): Promise<void> {
  await page.locator('#admin-first').fill(first);
  await page.locator('#admin-last').fill(last);
  await page.locator('#admin-email').fill(email);
  await page.locator('#admin-gender').selectOption({ label: 'Male' });
  await page.locator('#admin-nationality').click();
  const search = page.locator("xpath=//*[@data-v2-popover]//input | //input[contains(@placeholder,'Search country')]");
  if (await search.first().isVisible().catch(() => false)) await search.first().fill('Morocco');
  await page.getByRole('option', { name: /Morocco/ }).click();
  await page.locator('#admin-phone').fill('600000002');
  await page.locator('#admin-password').fill(password);
  await page.locator('#admin-confirm').fill(password);
  await page.locator('#admin-terms').click();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
}

export async function verifySignupEmail(page: Page, email: string): Promise<void> {
  // const mail = await page.context().newPage();
  // const code = await readYopmailCode(mail, email.split('@')[0]);
  // await mail.close();
  // await page.bringToFront();
  await enterOtp(page, '123456');
  await page.getByRole('button', { name: /Verify & continue/ }).click();
}

export async function registerNewCompany(page: Page, id = stamp()): Promise<string> {
  const email = `hamza.company.${id}@yopmail.com`;
  await openSignupFromSignIn(page);
  await chooseAccountType(page, 'company');
  await companyWizardFiveSteps(page);
  await fillCompanyBusinessStep(page, `AA Co ${id}`, `RF${id}`, email);
  await fillCompanyKycStep(page);
  await fillAdminUserStep(page, 'hamza', 'hamza', email, 'Admin@123');
  await verifySignupEmail(page, email);
  await workspaceLoaded(page);
  return email;
}

export async function registerNewIndividual(page: Page, id = stamp()): Promise<string> {
  const email = `hamza.ind.${id}@yopmail.com`;
  await openSignupFromSignIn(page);
  await chooseAccountType(page, 'individual');
  await individualWizardThreeSteps(page);
  await fillIndividualDetails(page, 'hamza', 'individual', email, 'Admin@123');
  await verifySignupEmail(page, email);
  await workspaceLoaded(page);
  return email;
}

export async function duplicateAdminEmailRejected(page: Page, existingEmail: string, id: string): Promise<void> {
  await openSignupFromSignIn(page);
  await chooseAccountType(page, 'company');
  await fillCompanyBusinessStep(page, `RF Dup ${id}`, `DUP${id}`, `rf.dup.${id}@yopmail.com`);
  await fillCompanyKycStep(page);
  await fillAdminUserStep(page, 'RF', 'Dup', existingEmail, 'Admin@123');
  await expect(page.getByText(/already exists/i)).toBeVisible();
}

export async function runMultiSignups(page: Page): Promise<void> {
  const type = (process.env.SIGNUP_ACCOUNT_TYPE || 'individual').toLowerCase();
  const count = Number(process.env.NB_INSCRIPTIONS || 1);
  if (type !== 'company' && type !== 'individual') throw new Error(`SIGNUP_ACCOUNT_TYPE must be company or individual. Got: ${type}`);
  const log = path.join(process.cwd(), 'results', 'atg_v2', 'generated_signup_emails.txt');
  fs.mkdirSync(path.dirname(log), { recursive: true });
  for (let i = 0; i < count; i += 1) {
    const id = `${stamp()}${i + 1}`;
    const email = type === 'company' ? await registerNewCompany(page, id) : await registerNewIndividual(page, id);
    fs.appendFileSync(log, `${type}\t${email}\n`);
    await page.context().clearCookies();
  }
}

export async function openPersonal(page: Page): Promise<void> {
  await page.goto(v2.personalUrl);
  await expect(page).toHaveURL(/\/settings\/personal/);
  await expect(page.getByRole('heading', { name: 'My Personal Information' })).toBeVisible();
}

export async function personalEmailReadOnly(page: Page, email: string): Promise<void> {
  const disabled = page.locator('input[disabled]').first();
  await expect(disabled).toBeVisible();
  await expect(disabled).toBeDisabled();
  await expect(page.getByText(email)).toBeVisible();
}

export async function streetAndPhone(page: Page): Promise<void> {
  const street = page.getByText('Street Address');
  if (!(await street.isVisible().catch(() => false))) await expect(page.getByText('Address').first()).toBeVisible();
  await expect(page.locator('input[placeholder="12 Marina Road, Lagos"]')).toBeVisible();
  const phone = await page.locator('#personal-phone-number input[type="tel"]').inputValue();
  if (phone.includes('+212')) {
    const title = await page.locator('#personal-phone-number .selected-flag').getAttribute('title');
    expect(title).toContain('212');
    expect(title).toContain('Morocco');
  }
}

export async function saveJobTitle(page: Page, jobTitle: string): Promise<void> {
  await openPersonal(page);
  await page.locator('#personal-phone-number input[type="tel"]').waitFor();
  await expect(page.locator('#personal-phone-number input[type="tel"]')).not.toHaveValue('');
  const job = page.locator('#personal-job-title input');
  await job.evaluate((input, value) => {
    const element = input as HTMLInputElement;
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    const tracker = (element as HTMLInputElement & { _valueTracker?: { setValue: (v: string) => void } })._valueTracker;
    descriptor?.set?.call(element, '');
    tracker?.setValue(element.value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    descriptor?.set?.call(element, value as string);
    tracker?.setValue('');
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, jobTitle);
  const pending = page.getByText('Pending profile data cannot be modified');
  const save = page.getByRole('button', { name: 'Save Changes' });
  const submit = page.getByRole('button', { name: /Submit Information/ });
  if (await save.isVisible().catch(() => false)) await save.click();
  else await submit.click();
  if (await pending.isVisible().catch(() => false)) {
    throw new Error('Profile is locked pending MANSA (Bug 011). Job title was not saved.');
  }
  await expect(page.getByText('Changes saved.')).toBeVisible();
  await expect(job).toHaveValue(jobTitle);
  await page.reload();
  await openPersonal(page);
  await expect(page.locator('#personal-job-title input')).toHaveValue(jobTitle, { timeout: 30_000 });
}

export async function openOrganization(page: Page): Promise<void> {
  await page.goto(v2.organizationUrl);
  await expect(page).toHaveURL(/\/settings\/company/);
  await expect(page.getByText('Business Profile')).toBeVisible();
}

export async function openVerification(page: Page): Promise<void> {
  await page.goto(v2.verificationUrl);
  await expect(page).toHaveURL(/\/settings\/verification/);
  await expect(page.getByText('Verification')).toBeVisible();
}

export async function workspaceHub(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'My Workspace' }).click();
  await expect(page).toHaveURL(/\/workspace\/v2\/workspace/);
  const search = page.locator("input[type='search'], input[placeholder*='Kora AI'], input[placeholder*='Search anything']");
  if (!(await search.first().isVisible().catch(() => false))) {
    await expect(page.getByText('Search anything with Kora AI')).toBeVisible();
  }
  await expect(page.getByText('Featured Products for you')).toBeVisible();
  const controls = [
    page.getByRole('button', { name: 'Notifications' }),
    page.getByRole('button', { name: 'App switcher' }),
    page.getByRole('button', { name: 'Help' }),
    page.getByRole('button', { name: 'Kora AI' }),
  ];
  const visible = await Promise.all(controls.map((control) => control.first().isVisible().catch(() => false)));
  expect(visible.some(Boolean)).toBeTruthy();
  await expect(page.getByRole('button', { name: 'Company Management' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Screening Configuration' })).toHaveCount(0);
}

export async function openCompanyRequests(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Company requests' }).click();
  await expect(page).toHaveURL(/\/company-requests/);
  await expect(page.getByText('Company join requests')).toBeVisible();
}

export async function sendKoraQuestions(page: Page): Promise<void> {
  await dismissMeetKora(page);
  await page.getByRole('button', { name: 'Kora AI' }).first().click();
  const input = page.locator("xpath=//*[@aria-label='Kora AI Assistant']//textarea | //textarea[contains(@placeholder,'Enter a prompt')] | //input[contains(@placeholder,'Enter a prompt')]").first();
  await input.waitFor({ timeout: 30_000 });

  const questions = [
    ...new Set(
      fs
        .readFileSync(fixtures.v2Questions, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
  expect(questions.length).toBeGreaterThan(0);

  const qaRaw = fs.existsSync(fixtures.v2Expected) ? fs.readFileSync(fixtures.v2Expected, 'utf8') : '';
  const runId = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  const outputDir = path.join(process.cwd(), 'results', 'atg_v2', 'ui', 'kora_ai');
  const screensDir = path.join(outputDir, 'screenshots', 'runs', `run_${runId}`);
  const reportPath = path.join(outputDir, 'reports', `run_summary_${runId}.txt`);
  fs.mkdirSync(screensDir, { recursive: true });
  startKoraEvaluationReport(reportPath, runId, fixtures.v2Questions, fixtures.v2Expected);

  for (let i = 0; i < questions.length; i += 1) {
    const question = questions[i];
    await page.getByText(/Thinking|Gathering insights/i).first().waitFor({ state: 'hidden', timeout: 180_000 }).catch(() => undefined);
    await page.waitForTimeout(2000);
    await input.fill(question);
    await expect(input).toHaveValue(question);
    await page.screenshot({ path: path.join(screensDir, `question_${i + 1}.png`) });
    const send = page.getByRole('button', { name: 'Send' });
    if (await send.isEnabled().catch(() => false)) await send.click();
    else await input.press('Enter');
    const aiResponse = await waitForKoraResponseText(page);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(screensDir, `response_${i + 1}.png`) });
    const expected = lookupExpectedAnswer(qaRaw, question);
    appendKoraEvaluationInteraction(reportPath, i + 1, question, expected, aiResponse);
    if (i < questions.length - 1) {
      await page.getByRole('button', { name: 'New chat' }).click();
      await input.waitFor({ timeout: 15_000 });
      await page.waitForTimeout(2000);
    }
  }
  finalizeKoraEvaluationReport(reportPath);
  console.log(`Rapport Kora v2 : ${reportPath} | captures : ${screensDir}`);
  await expect(input).toBeVisible();
}
