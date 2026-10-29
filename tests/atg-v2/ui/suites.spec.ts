import { expect, test } from '../../../src/ui-fixtures';
import { stamp, users } from '../../../src/env';
import { inviteIndividual } from '../../../src/v1-ui';
import {
  chooseAccountType,
  companyWizardFiveSteps,
  duplicateAdminEmailRejected,
  emptyRequiredFieldsBlockContinue,
  fillCompanyBusinessStep,
  individualWizardThreeSteps,
  loginAsRole,
  loginShouldBeRejected,
  onboardBusinessByOperator,
  openCompanyRequests,
  openOrganization,
  openPersonal,
  openSignupFromSignIn,
  openVerification,
  personalEmailReadOnly,
  registerNewCompany,
  registerNewIndividual,
  runMultiSignups,
  saveJobTitle,
  sendKoraQuestions,
  streetAndPhone,
  toggleTaxExemption,
  workspaceHub,
  workspaceLoaded,
} from '../../../src/v2-ui';

test.describe('ATG v2 company admin login', () => {
  test('Invalid Password Is Rejected', async ({ page }) => {
    await loginShouldBeRejected(page, users.companyAdmin.email, 'WrongPass!1');
  });
  test('Company Admin Signs In And Reaches Workspace', async ({ page }) => {
    await loginAsRole(page, 'companyAdmin');
    await workspaceLoaded(page);
  });
});

test.describe('ATG v2 company admin workspace', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, 'companyAdmin');
  });
  test('Workspace Hub Is Available Without Operator Modules', async ({ page }) => {
    await workspaceHub(page);
  });
  test('Company Requests Page Opens', async ({ page }) => {
    await openCompanyRequests(page);
  });
});

test.describe('ATG v2 company admin settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, 'companyAdmin');
  });
  test('Organization Information Shows Business Profile', async ({ page }) => {
    await openOrganization(page);
  });
  test('Verification Centre Shows Status', async ({ page }) => {
    await openVerification(page);
  });
});

test.describe('ATG v2 company admin personal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, 'companyAdmin');
  });
  test('Email Is Read Only On Personal Information', async ({ page }) => {
    await openPersonal(page);
    await personalEmailReadOnly(page, users.companyAdmin.email);
  });
  test('Street Address Label And Phone Flag', async ({ page }) => {
    await openPersonal(page);
    await streetAndPhone(page);
  });
  test('Company Admin Saves A Job Title Change', async ({ page }) => {
    await saveJobTitle(page, `TEST Job ${stamp()}`);
  });
});

test.describe('ATG v2 admin login', () => {
  test('Invalid Password Is Rejected', async ({ page }) => {
    await loginShouldBeRejected(page, users.admin.email, 'WrongPass!1');
  });
  test('Admin Signs In And Reaches Workspace', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await expect(page).toHaveURL(/\/workspace/);
    await expect(page).not.toHaveURL(/\/workspace\/v2\//);
  });
});

test.describe('ATG v2 admin invite', () => {
  test('Invite An Individual Subscriber Successfully', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const email = await inviteIndividual(page);
    expect(email).toContain('@yopmail.com');
  });
});

test.describe('ATG v2 operator onboarding', () => {
  test('Onboard A Business Account By Operator', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const email = await onboardBusinessByOperator(page);
    expect(email).toMatch(/^hamza.+@yopmail\.com$/);
  });
});

test.describe('ATG v2 signup entry', () => {
  test('Signup Opens And Can Reach Account Step', async ({ page }) => {
    await openSignupFromSignIn(page);
  });
  test('Company Account Type Shows Five Steps', async ({ page }) => {
    await openSignupFromSignIn(page);
    await chooseAccountType(page, 'company');
    await companyWizardFiveSteps(page);
    await emptyRequiredFieldsBlockContinue(page);
  });
  test('Individual Account Type Shows Three Steps And Upgrade Copy', async ({ page }) => {
    await openSignupFromSignIn(page);
    await chooseAccountType(page, 'individual');
    await individualWizardThreeSteps(page);
  });
});

test.describe('ATG v2 company registration', () => {
  test('Financial Services Provider Shows Tax Exemption Fields', async ({ page }) => {
    const id = stamp();
    await openSignupFromSignIn(page);
    await chooseAccountType(page, 'company');
    await fillCompanyBusinessStep(page, `RF Tax ${id}`, `TAX${id}`, `rf.tax.${id}@yopmail.com`);
    await toggleTaxExemption(page);
  });
  test('Duplicate Admin Email Is Rejected', async ({ page }) => {
    await duplicateAdminEmailRejected(page, users.companyAdmin.email, stamp());
  });
  test('Register A New Company Through Verify Email', async ({ page }) => {
    const email = await registerNewCompany(page);
    expect(email).toContain('@yopmail.com');
  });
});

test.describe('ATG v2 individual registration', () => {
  test('Register A New Individual Through Verify Email', async ({ page }) => {
    const email = await registerNewIndividual(page);
    expect(email).toContain('@yopmail.com');
  });
});

test.describe('ATG v2 multi signup', () => {
  test('Multi Sign Up Registrations', async ({ page }) => {
    await runMultiSignups(page);
  });
});

test.describe('ATG v2 Kora AI', () => {
  test('Kora Ai Chatbot Smoke On Workspace V2', async ({ page }) => {
    test.setTimeout(4 * 60 * 60 * 1000);
    await loginAsRole(page, 'companyAdmin');
    await workspaceLoaded(page);
    await sendKoraQuestions(page);
  });
});

