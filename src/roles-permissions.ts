import fs from 'fs';
import path from 'path';
import { expect, type Page } from '@playwright/test';
import { users, v2 } from './env';
import { dismissMeetKora, loginV2WithOtp, logoutWorkspace } from './v2-ui';

const KEEP_ON_DISABLE = 'atg.profile.read.own';
const shotRoot = path.join(process.cwd(), 'results', 'atg_v2', 'screenshots', 'roles-permissions');

export const QUICK_ACTION_CODES = [
  'atg.quickactions.financing.view',
  'atg.quickactions.identity-verification.view',
  'atg.quickactions.investment-partners.view',
  'atg.quickactions.listed-tenders.view',
  'atg.quickactions.members-requests.view',
  'atg.quickactions.name-screening.view',
  'atg.quickactions.product-search.view',
  'atg.quickactions.publication-search.view',
  'atg.quickactions.risk-assessment.view',
  'atg.quickactions.shipment-tracking.view',
  'atg.quickactions.trade-news.view',
];

export const QUICK_ACTION_TILES = [
  'Perform Name Screening',
  'Search for a Product',
  'Verify an Identity',
  'Search for a Publication',
  'Risk Assessment',
  'Track Shipment',
  'View listed tenders',
  'Get investment partners',
  'Get financing',
  'Members & Requests',
  'Trade News',
] as const;

/** Excel SP Administrator sheet — UI codes (joinrequest, not join.request). */
export const SP_ADMIN_BASELINE = [
  'atg.audit.view.own',
  'atg.finance.read',
  'atg.finance.request.submit',
  'atg.investment.delete.own',
  'atg.investment.update.own',
  'atg.finance.request.approve.own',
  'atg.investment.create',
  'atg.investment.read',
  'atg.tender.create',
  'atg.tender.feedback.submit',
  'atg.tender.update.own',
  'atg.tender.delete.own',
  'atg.tender.read',
  'atg.kora.converse',
  'atg.joinrequest.decide.own',
  'atg.member.invite.own',
  'atg.member.role.assign.own',
  'atg.joinrequest.list.own',
  'atg.member.list.own',
  'atg.member.suspend.own',
  'atg.company.read.own',
  'atg.company.update.own',
  'atg.profile.read.own',
  'atg.company.submit.own',
  'atg.entity.transition.request',
  'atg.profile.update.own',
  'atg.sponsor.invite.own',
  'atg.sponsor.manage.own',
  'atg.sponsor.list.own',
];

/** UAT SP Auditor live baseline before enable-all (v11): 17 ON, members/profile/QA off. */
export const SP_AUDITOR_BASELINE = [
  'atg.audit.view.own',
  'atg.finance.read',
  'atg.finance.request.submit',
  'atg.investment.delete.own',
  'atg.investment.update.own',
  'atg.finance.request.approve.own',
  'atg.investment.create',
  'atg.investment.read',
  'atg.tender.create',
  'atg.tender.feedback.submit',
  'atg.tender.update.own',
  'atg.tender.delete.own',
  'atg.tender.read',
  'atg.kora.converse',
  'atg.sponsor.invite.own',
  'atg.sponsor.manage.own',
  'atg.sponsor.list.own',
];

/** Excel Business Administrator: all 29 assigned. Same codes as SP Admin. */
export const BUSINESS_ADMIN_BASELINE = [...SP_ADMIN_BASELINE];

/** Excel Business Maker: 12 Initially Assigned. */
export const BUSINESS_MAKER_BASELINE = [
  'atg.audit.view.own',
  'atg.finance.read',
  'atg.finance.request.submit',
  'atg.investment.read',
  'atg.tender.feedback.submit',
  'atg.tender.read',
  'atg.kora.converse',
  'atg.joinrequest.list.own',
  'atg.member.list.own',
  'atg.company.read.own',
  'atg.profile.read.own',
  'atg.profile.update.own',
];

/** Excel Business Checker: 16 Initially Assigned. */
export const BUSINESS_CHECKER_BASELINE = [
  'atg.audit.view.own',
  'atg.finance.read',
  'atg.finance.request.submit',
  'atg.finance.request.approve.own',
  'atg.investment.read',
  'atg.tender.feedback.submit',
  'atg.tender.read',
  'atg.kora.converse',
  'atg.joinrequest.list.own',
  'atg.member.list.own',
  'atg.company.read.own',
  'atg.profile.read.own',
  'atg.profile.update.own',
  'atg.sponsor.invite.own',
  'atg.sponsor.manage.own',
  'atg.sponsor.list.own',
];

const PERMISSION_CATALOG = [...SP_ADMIN_BASELINE, ...QUICK_ACTION_CODES].sort((a, b) => b.length - a.length);

export type PermissionSet = 'all' | 'none' | 'baseline';

function codeFromLabel(text: string): string | undefined {
  return PERMISSION_CATALOG.find((code) => text.includes(code));
}

async function shot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(shotRoot, { recursive: true });
  await page.screenshot({ path: path.join(shotRoot, `${name}.png`), fullPage: true }).catch(() => undefined);
}

async function openRoleEditor(page: Page, roleCode: string): Promise<void> {
  await page.goto(v2.roleEditorUrl(roleCode), { waitUntil: 'domcontentloaded' });
  await page.locator('label.ant-checkbox-wrapper').first().waitFor({ timeout: 45_000 });
  await expect(page.getByText(/Permissions/i).first()).toBeVisible();
}

async function selectedCount(page: Page): Promise<number> {
  const text = await page.locator('body').innerText();
  const match = text.match(/(\d+)\s+selected/i);
  return match ? Number(match[1]) : 0;
}

async function applyPermissionSet(page: Page, set: PermissionSet, baseline: string[]): Promise<void> {
  const wraps = page.locator('label.ant-checkbox-wrapper');
  const count = await wraps.count();
  const wanted = new Set(baseline);

  for (let i = 0; i < count; i += 1) {
    const wrap = wraps.nth(i);
    const box = wrap.locator('input[type=checkbox]');
    if (await box.isDisabled().catch(() => true)) continue;
    const text = ((await wrap.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    const checked = await box.isChecked();
    const code = codeFromLabel(text);

    let shouldCheck = checked;
    if (set === 'all') shouldCheck = true;
    else if (set === 'none') shouldCheck = code === KEEP_ON_DISABLE;
    else if (!code) shouldCheck = false;
    else if (code.startsWith('atg.quickactions')) shouldCheck = false;
    else shouldCheck = wanted.has(code);

    if (set === 'none' && !text && checked) continue;
    if (checked === shouldCheck) continue;
    await wrap.click();
  }

  const selected = await selectedCount(page);
  if (set === 'all') expect(selected).toBeGreaterThanOrEqual(40);
  else if (set === 'none') expect(selected).toBe(1);
  else expect(selected).toBe(baseline.length);
}

async function saveDraft(page: Page): Promise<void> {
  const save = page.getByRole('button', { name: 'Save as draft' });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText(/Draft v\d+ saved|pending draft/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/DRAFT/)).toBeVisible();
}

async function publishDraft(page: Page): Promise<void> {
  const publish = page.getByRole('button', { name: /Publish v\d+/ });
  await expect(publish).toBeEnabled({ timeout: 20_000 });
  await publish.click();
  await expect(page.getByText(/Published v\d+/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/ACTIVE/)).toBeVisible();
  await page.waitForTimeout(10_000);
}

export async function publishPermissionSet(
  page: Page,
  roleCode: string,
  set: PermissionSet,
  baseline: string[] = SP_ADMIN_BASELINE,
): Promise<void> {
  await loginV2WithOtp(page, users.admin.email, users.admin.password, 'operator');
  await openRoleEditor(page, roleCode);
  await applyPermissionSet(page, set, baseline);
  await saveDraft(page);
  await logoutWorkspace(page);

  await loginV2WithOtp(page, users.publisher.email, users.publisher.password, 'operator');
  await openRoleEditor(page, roleCode);
  await publishDraft(page);
  await logoutWorkspace(page);
}

export async function loginRoleUser(page: Page, email: string, password: string): Promise<void> {
  await loginV2WithOtp(page, email, password, 'v2');
  await page.goto(v2.workspaceBase);
  await dismissMeetKora(page);
}

export async function expectEnabledSurfaces(page: Page, label: string): Promise<void> {
  await page.goto(v2.workspaceBase);
  await dismissMeetKora(page);
  await shot(page, `${label}-home-enabled`);
  for (const tile of QUICK_ACTION_TILES) {
    await expect(page.getByRole('button', { name: new RegExp(tile, 'i') }).first()).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Kora AI' }).first()).toBeVisible();

  await page.goto(v2.membersUrl);
  await expect(page.getByRole('heading', { name: 'Members & Requests' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Invite member/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Join requests/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /History/i })).toBeVisible();
  await shot(page, `${label}-members-enabled`);

  await page.goto(v2.organizationUrl);
  await expect(page.getByText('Business Profile')).toBeVisible();
  await expect(page.getByRole('button', { name: /Submit Information/i })).toBeVisible();

  await page.goto(v2.personalUrl);
  await expect(page.getByRole('heading', { name: 'My Personal Information' })).toBeVisible();

  await page.goto(v2.tendersUrl);
  await expect(page.getByRole('heading', { name: /^Tenders$/ })).toBeVisible();

  // Post form is not a roles-permissions gate. Connect shows it only when the
  // package has billing feature POST TENDERS REQUEST. Without it the SPA
  // bounces to the workspace hub — Excel status is Blocked, not Failed.
  await page.goto(v2.tenderPostUrl, { waitUntil: 'domcontentloaded' });
  const postForm = page.getByRole('heading', { name: /Post contract request/i });
  const bouncedHome = page.getByRole('heading', { name: /What can I help you with today/i });
  await Promise.race([
    postForm.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined),
    bouncedHome.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined),
  ]);
  if (await postForm.isVisible().catch(() => false)) {
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  } else {
    await expect(
      bouncedHome.or(page.getByRole('heading', { name: /^Tenders$/ })),
      'Post contract request form is blocked by Connect billing, not by atg.tender.create',
    ).toBeVisible();
  }

  await page.goto(v2.financeUrl);
  await expect(page.getByRole('heading', { name: /Access to Finance/i })).toBeVisible();
  await page.goto(v2.investmentUrl);
  await expect(page.getByRole('heading', { name: /^Investment$/ })).toBeVisible();
}

export async function expectDisabledSurfaces(page: Page, label: string): Promise<void> {
  await page.goto(v2.workspaceBase);
  await dismissMeetKora(page);
  await shot(page, `${label}-home-disabled`);
  await expect(page.getByRole('button', { name: /Members & Requests/i })).toHaveCount(0);

  for (const tile of QUICK_ACTION_TILES.filter((name) => name !== 'Members & Requests')) {
    expect
      .soft(
        await page.getByRole('button', { name: new RegExp(tile, 'i') }).count(),
        `${tile} should be hidden when its Quick Action permission is off`,
      )
      .toBe(0);
  }
  expect
    .soft(await page.getByRole('button', { name: 'Kora AI' }).count(), 'SPA-014 Kora should be hidden when atg.kora.converse is off')
    .toBe(0);

  await page.goto(v2.membersUrl);
  await expect(page.getByText(/Only a company administrator or auditor can view the member list/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Invite member/i })).toHaveCount(0);
  await shot(page, `${label}-members-disabled`);

  const settings = page.getByRole('button', { name: /Open settings/i });
  if (await settings.first().isVisible().catch(() => false)) {
    await settings.first().click();
    await expect(page.getByRole('menuitem', { name: /Members & Requests/i })).toHaveCount(0);
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  await page.goto(v2.tendersUrl);
  expect
    .soft(
      await page.getByRole('heading', { name: /^Tenders$/ }).isVisible().catch(() => false),
      'SPA-013 tenders listing should be hidden when atg.tender.read is off',
    )
    .toBeFalsy();
  expect
    .soft(
      await page.getByRole('button', { name: /Post contract request/i }).count(),
      'SPA-009 Post contract request should be hidden when atg.tender.create is off',
    )
    .toBe(0);

  await page.goto(v2.financeUrl);
  expect
    .soft(
      await page.getByRole('heading', { name: /Access to Finance/i }).isVisible().catch(() => false),
      'SPA-002 finance listing should be hidden when atg.finance.read is off',
    )
    .toBeFalsy();

  await page.goto(v2.investmentUrl);
  expect
    .soft(
      await page.getByRole('heading', { name: /^Investment$/ }).isVisible().catch(() => false),
      'SPA-008 investment listing should be hidden when atg.investment.read is off',
    )
    .toBeFalsy();

  await page.goto(v2.personalUrl);
  await expect(page.getByRole('heading', { name: 'My Personal Information' })).toBeVisible();
}

export async function restoreRoleBaseline(page: Page, roleCode: string, baseline: string[]): Promise<void> {
  await publishPermissionSet(page, roleCode, 'baseline', baseline);
}