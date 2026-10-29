import fs from 'fs';
import { expect, test } from '../../../src/ui-fixtures';
import { fixtures, v1 } from '../../../src/env';
import { editCmsPage } from '../../../src/cms';
import { inviteIndividual, loginV1, loginV1Invalid, logoutFromDashboard, openV1Login, signUpNewUser } from '../../../src/v1-ui';
import { runSubscriberRegistration, runV1MultiSignup } from '../../../src/subscriber';

test.describe('ATG v1 login', () => {
  test.beforeEach(async ({ page }) => {
    await openV1Login(page);
  });

  test('Open Login Page', async ({ page }) => {
    await expect(page).toHaveURL(/\/auth/);
  });

  test('Login With Valid Admin', async ({ page }) => {
    await loginV1(page, 'admin');
  });

  test('Login With Valid Subscriber', async ({ page }) => {
    await loginV1(page, 'subscriber');
  });

  test('Login With Invalid Email Should Fail', async ({ page }) => {
    await loginV1Invalid(page, 'invalidEmail');
  });

  test('Login With Invalid Password Should Fail', async ({ page }) => {
    await loginV1Invalid(page, 'invalidPassword');
  });
});

test.describe('ATG v1 signup', () => {
  test('Sign Up New User', async ({ page }) => {
    await openV1Login(page);
    const email = await signUpNewUser(page);
    expect(email).toContain('@yopmail.com');
  });
});

test.describe('ATG v1 logout', () => {
  test('Logout From Dashboard', async ({ page }) => {
    await openV1Login(page);
    await loginV1(page, 'admin');
    await logoutFromDashboard(page);
    await expect(page).toHaveURL(new RegExp(v1.loginUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test.describe('ATG v1 subscriber registration', () => {
  test('Subscriber Registration', async ({ page }) => {
    const email = await runSubscriberRegistration(page);
    expect(email).toContain('@yopmail.com');
  });

  test('Multi Sign Up Registrations', async ({ page }) => {
    await runV1MultiSignup(page);
  });
});

test.describe('ATG v1 CMS', () => {
  test('CMS With Variable', async ({ page }) => {
    await editCmsPage(page, 'About ATG Page', true);
  });
  test('CMS Home Page', async ({ page }) => {
    await editCmsPage(page, 'Home Page', true);
  });
  test('CMS About ATG Page', async ({ page }) => {
    await editCmsPage(page, 'About ATG Page', true);
  });
  test('CMS ATG Ecosystem Page', async ({ page }) => {
    await editCmsPage(page, 'ATG Ecosystem Page', true);
  });
  test('CMS Footer Page', async ({ page }) => {
    await editCmsPage(page, 'Footer', false);
  });
});

test.describe('ATG v1 AI assistant', () => {
  test('AI Assistant Chatbot Smoke', async ({ page }) => {
    await openV1Login(page);
    await loginV1(page, 'subscriber');
    await page.locator('xpath=//*[@id="root"]/div/section/header/div/div[3]/div[3]/div[1]/div/div[1]').click();
    const input = page.locator("xpath=//input[contains(@placeholder,'What would you like to know about African Trade')]");
    await input.waitFor({ timeout: 30_000 });
    const questions = fs.readFileSync(fixtures.v1Questions, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    expect(questions.length).toBeGreaterThan(0);
    for (const question of questions) {
      await input.fill(question);
      await input.press('Enter');
      await expect(page.getByText('Thinking')).toBeHidden({ timeout: 180_000 }).catch(() => undefined);
    }
    await expect(input).toBeVisible();
  });
});

test.describe('ATG v1 invite individual subscriber', () => {
  test('Invite An Individual Subscriber Successfully', async ({ page }) => {
    await openV1Login(page);
    await loginV1(page, 'admin');
    const email = await inviteIndividual(page);
    expect(email).toContain('@yopmail.com');
  });
});
