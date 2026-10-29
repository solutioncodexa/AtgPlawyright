import { expect, test } from '../../../src/ui-fixtures';
import { users } from '../../../src/env';
import {
  BUSINESS_ADMIN_BASELINE,
  BUSINESS_CHECKER_BASELINE,
  BUSINESS_MAKER_BASELINE,
  expectDisabledSurfaces,
  expectEnabledSurfaces,
  loginRoleUser,
  publishPermissionSet,
  restoreRoleBaseline,
  SP_ADMIN_BASELINE,
  SP_AUDITOR_BASELINE,
} from '../../../src/roles-permissions';

test.describe('ATG v2 SP Administrator roles and permissions', () => {
  test('Enable all, verify filuveb, disable all, verify, restore baseline', async ({ page }) => {
    test.setTimeout(40 * 60 * 1000);
    const roleCode = 'sp.admin';
    const label = 'sp-admin';

    try {
      await test.step('Dual-admin publish enable-all including Quick Actions', async () => {
        await publishPermissionSet(page, roleCode, 'all');
      });

      await test.step('Sign in as SP Administrator filuveb', async () => {
        await loginRoleUser(page, users.spAdmin.email, users.spAdmin.password);
      });

      await test.step('Enabled: Excel surfaces + 11 Quick Actions (no submit/invite)', async () => {
        await expectEnabledSurfaces(page, label);
      });

      await test.step('Dual-admin publish disable-all (keep atg.profile.read.own)', async () => {
        await publishPermissionSet(page, roleCode, 'none');
      });

      await test.step('Sign in as SP Administrator filuveb after disable', async () => {
        await loginRoleUser(page, users.spAdmin.email, users.spAdmin.password);
      });

      await test.step('Disabled: members gated; other leaks recorded as soft fails', async () => {
        await expectDisabledSurfaces(page, label);
        await expect(page.getByText(/Only a company administrator or auditor can view the member list/i)).toBeVisible();
      });
    } finally {
      await test.step('Restore SP Administrator Excel baseline (29, Quick Actions off)', async () => {
        await restoreRoleBaseline(page, roleCode, SP_ADMIN_BASELINE);
      });
    }
  });
});

test.describe('ATG v2 SP Auditor roles and permissions', () => {
  test('Enable all, verify wujygyco, disable all, verify, restore baseline', async ({ page }) => {
    test.setTimeout(40 * 60 * 1000);
    const roleCode = 'sp.auditor';
    const label = 'sp-auditor';

    try {
      await test.step('Dual-admin publish enable-all including Quick Actions', async () => {
        await publishPermissionSet(page, roleCode, 'all');
      });

      await test.step('Sign in as SP Auditor wujygyco', async () => {
        await loginRoleUser(page, users.spAuditor.email, users.spAuditor.password);
      });

      await test.step('Enabled: Excel surfaces + 11 Quick Actions (no submit/invite)', async () => {
        await expectEnabledSurfaces(page, label);
      });

      await test.step('Dual-admin publish disable-all (keep atg.profile.read.own)', async () => {
        await publishPermissionSet(page, roleCode, 'none');
      });

      await test.step('Sign in as SP Auditor wujygyco after disable', async () => {
        await loginRoleUser(page, users.spAuditor.email, users.spAuditor.password);
      });

      await test.step('Disabled: members gated; other leaks recorded as soft fails', async () => {
        await expectDisabledSurfaces(page, label);
        await expect(page.getByText(/Only a company administrator or auditor can view the member list/i)).toBeVisible();
      });
    } finally {
      await test.step('Restore SP Auditor baseline (17, members/profile/QA off)', async () => {
        await restoreRoleBaseline(page, roleCode, SP_AUDITOR_BASELINE);
      });
    }
  });
});

test.describe('ATG v2 Business Administrator roles and permissions', () => {
  test('Enable all, verify fomo, disable all, verify, restore baseline', async ({ page }) => {
    test.setTimeout(40 * 60 * 1000);
    const roleCode = 'business.admin';
    const label = 'ba';

    try {
      await test.step('Dual-admin publish enable-all including Quick Actions', async () => {
        await publishPermissionSet(page, roleCode, 'all');
      });

      await test.step('Sign in as Business Administrator fomo', async () => {
        await loginRoleUser(page, users.ba.email, users.ba.password);
      });

      await test.step('Enabled: Excel surfaces + 11 Quick Actions (no submit/invite)', async () => {
        await expectEnabledSurfaces(page, label);
      });

      await test.step('Dual-admin publish disable-all (keep atg.profile.read.own)', async () => {
        await publishPermissionSet(page, roleCode, 'none');
      });

      await test.step('Sign in as Business Administrator fomo after disable', async () => {
        await loginRoleUser(page, users.ba.email, users.ba.password);
      });

      await test.step('Disabled: members gated; other leaks recorded as soft fails', async () => {
        await expectDisabledSurfaces(page, label);
        await expect(page.getByText(/Only a company administrator or auditor can view the member list/i)).toBeVisible();
      });
    } finally {
      await test.step('Restore Business Administrator Excel baseline (29, Quick Actions off)', async () => {
        await restoreRoleBaseline(page, roleCode, BUSINESS_ADMIN_BASELINE);
      });
    }
  });
});

test.describe('ATG v2 Business Maker roles and permissions', () => {
  test('Enable all, verify waxaliz, disable all, verify, restore baseline', async ({ page }) => {
    test.setTimeout(40 * 60 * 1000);
    const roleCode = 'business.maker';
    const label = 'maker';

    try {
      await test.step('Dual-admin publish enable-all including Quick Actions', async () => {
        await publishPermissionSet(page, roleCode, 'all');
      });

      await test.step('Sign in as Business Maker waxaliz', async () => {
        await loginRoleUser(page, users.maker.email, users.maker.password);
      });

      await test.step('Enabled: Excel surfaces + 11 Quick Actions (no submit/invite)', async () => {
        await expectEnabledSurfaces(page, label);
      });

      await test.step('Dual-admin publish disable-all (keep atg.profile.read.own)', async () => {
        await publishPermissionSet(page, roleCode, 'none');
      });

      await test.step('Sign in as Business Maker waxaliz after disable', async () => {
        await loginRoleUser(page, users.maker.email, users.maker.password);
      });

      await test.step('Disabled: members gated; other leaks recorded as soft fails', async () => {
        await expectDisabledSurfaces(page, label);
        await expect(page.getByText(/Only a company administrator or auditor can view the member list/i)).toBeVisible();
      });
    } finally {
      await test.step('Restore Business Maker Excel baseline (12, Quick Actions off)', async () => {
        await restoreRoleBaseline(page, roleCode, BUSINESS_MAKER_BASELINE);
      });
    }
  });
});

test.describe('ATG v2 Business Checker roles and permissions', () => {
  test('Enable all, verify bileral, disable all, verify, restore baseline', async ({ page }) => {
    test.setTimeout(40 * 60 * 1000);
    const roleCode = 'business.checker';
    const label = 'checker';

    try {
      await test.step('Dual-admin publish enable-all including Quick Actions', async () => {
        await publishPermissionSet(page, roleCode, 'all');
      });

      await test.step('Sign in as Business Checker bileral', async () => {
        await loginRoleUser(page, users.checker.email, users.checker.password);
      });

      await test.step('Enabled: Excel surfaces + 11 Quick Actions (no submit/invite)', async () => {
        await expectEnabledSurfaces(page, label);
      });

      await test.step('Dual-admin publish disable-all (keep atg.profile.read.own)', async () => {
        await publishPermissionSet(page, roleCode, 'none');
      });

      await test.step('Sign in as Business Checker bileral after disable', async () => {
        await loginRoleUser(page, users.checker.email, users.checker.password);
      });

      await test.step('Disabled: members gated; other leaks recorded as soft fails', async () => {
        await expectDisabledSurfaces(page, label);
        await expect(page.getByText(/Only a company administrator or auditor can view the member list/i)).toBeVisible();
      });
    } finally {
      await test.step('Restore Business Checker Excel baseline (16, Quick Actions off)', async () => {
        await restoreRoleBaseline(page, roleCode, BUSINESS_CHECKER_BASELINE);
      });
    }
  });
});
