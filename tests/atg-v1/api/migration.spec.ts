import { expect, test } from '@playwright/test';
import { v1 } from '../../../src/env';
import {
  fiSubscriberCandidates,
  firstOrThrow,
  grantBasicCandidates,
  legacyConsumerCandidates,
  migrationAdmin,
  migrationData,
  subscriberCandidates,
} from '../../../src/migration';

async function token(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const response = await request.post(`${v1.baseUrl}/api/account/login`, {
    data: { username: migrationAdmin.username, password: migrationAdmin.password },
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { accessToken: string }).accessToken;
}

async function postAllow(
  request: import('@playwright/test').APIRequestContext,
  access: string,
  path: string,
  body: unknown,
  allowed: number[],
): Promise<void> {
  const response = await request.post(`${v1.baseUrl}/api/account${path}`, {
    headers: { Authorization: `Bearer ${access}` },
    data: body,
  });
  expect(allowed, await response.text()).toContain(response.status());
}

test.describe('ATG v1 subscription migration', () => {
  test('Grant Basic Subscription Valid User', async ({ request }) => {
    const access = await token(request);
    await postAllow(request, access, '/migration/grant-basic-subscription', {
      userEmail: migrationData.grantBasicValid.userEmail,
      assignCompanyAdmin: migrationData.grantBasicValid.assignCompanyAdmin,
    }, [200, 500]);
  });

  test('Grant Basic Subscription Testb2b01', async ({ request }) => {
    const access = await token(request);
    await postAllow(request, access, '/migration/grant-basic-subscription', {
      userEmail: migrationData.grantBasicTestb2b01.userEmail,
      assignCompanyAdmin: true,
    }, [200, 400, 500]);
  });

  test('Grant Basic Subscription Testingnew', async ({ request }) => {
    const access = await token(request);
    await postAllow(request, access, '/migration/grant-basic-subscription', {
      userEmail: migrationData.grantBasicTestingnew.userEmail,
      assignCompanyAdmin: false,
    }, [200, 400, 500]);
  });

  test('Grant Basic Subscription Transfer16', async ({ request }) => {
    const access = await token(request);
    await postAllow(request, access, '/migration/grant-basic-subscription', {
      userEmail: migrationData.grantBasicTransfer16.userEmail,
      assignCompanyAdmin: true,
    }, [200, 400, 500]);
  });

  test.skip('Grant Basic Subscription', async ({ request }) => {
    const access = await token(request);
    await postAllow(request, access, '/migration/grant-basic-subscription', {
      userEmail: firstOrThrow(grantBasicCandidates(1), 'grant-basic'),
      assignCompanyAdmin: false,
    }, [200]);
  });

  test('Enable FI Sponsor', async ({ request }) => {
    const access = await token(request);
    await postAllow(request, access, '/migration/enable-fi-sponsor', {
      userEmail: firstOrThrow(fiSubscriberCandidates(1), 'FI subscriber'),
    }, [202]);
  });

  test('Attach User To Company', async ({ request }) => {
    const access = await token(request);
    await postAllow(request, access, '/migration/attach-user-to-company', {
      userEmail: migrationData.attachUser.userEmail,
      targetCompanyId: migrationData.attachUser.targetCompanyId,
    }, [200, 500]);
  });

  test.skip('Attach User To Company Secondary', async ({ request }) => {
    const access = await token(request);
    await postAllow(request, access, '/migration/attach-user-to-company', {
      userEmail: grantBasicCandidates()[2],
      targetCompanyId: migrationData.companySecondary,
    }, [200]);
  });

  test.skip('Attach User To Company Tertiary', async ({ request }) => {
    const access = await token(request);
    await postAllow(request, access, '/migration/attach-user-to-company', {
      userEmail: firstOrThrow(subscriberCandidates(1), 'subscriber'),
      targetCompanyId: migrationData.companyTertiary,
    }, [200]);
  });

  test('Assign Company Admin', async ({ request }) => {
    const access = await token(request);
    await postAllow(request, access, '/migration/assign-company-admin', {
      userEmail: migrationData.assignAdmin.userEmail,
      companyId: migrationData.assignAdmin.companyId,
    }, [200]);
  });

  test('Correct Subscriber Package To Basic', async ({ request }) => {
    const access = await token(request);
    await postAllow(request, access, '/migration/correct-subscriber-package', {
      userEmail: firstOrThrow(subscriberCandidates(1), 'subscriber'),
      targetPackageId: migrationData.correctPackage.basicPackageId,
    }, [202]);
  });

  test('Correct Subscriber Package To FI Corporate Sponsor', async ({ request }) => {
    const access = await token(request);
    await postAllow(request, access, '/migration/correct-subscriber-package', {
      userEmail: firstOrThrow(fiSubscriberCandidates(1), 'FI subscriber'),
      targetPackageId: migrationData.correctPackage.fiCorporateSponsorPackageId,
    }, [202]);
  });

  test('Legacy Consumers To Sponsor', async ({ request }) => {
    const access = await token(request);
    const sponsor = firstOrThrow(fiSubscriberCandidates(1), 'FI subscriber');
    await postAllow(request, access, '/migration/legacy-consumers-to-sponsor', {
      sponsorEmail: sponsor,
      consumerEmails: [firstOrThrow(legacyConsumerCandidates(sponsor, 1), 'legacy consumer')],
    }, [202]);
  });

  test('Grant Basic Subscription Invalid Request Should Fail', async ({ request }) => {
    const access = await token(request);
    const response = await request.post(`${v1.baseUrl}/api/account/migration/grant-basic-subscription`, {
      headers: { Authorization: `Bearer ${access}` },
      data: {},
    });
    expect(response.status()).toBe(422);
  });
});

test.describe('ATG v1 grant basic batch', () => {
  test.skip('Grant Basic Subscription Batch', async ({ request }) => {
    const access = await token(request);
    for (const email of grantBasicCandidates(migrationData.grantBasic.batchLimit)) {
      await postAllow(request, access, '/migration/grant-basic-subscription', {
        userEmail: email,
        assignCompanyAdmin: migrationData.grantBasic.assignCompanyAdmin,
      }, [200, 400, 404, 409, 500]);
    }
  });
});
