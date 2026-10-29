import { expect, test } from '@playwright/test';
import { assertList, assertObject, assertPage, v1Get, v1Json } from '../../../src/api';
import { users } from '../../../src/env';

test.describe('ATG v1 API account', () => {
  test('Login Returns Access Token', async ({ request }) => {
    const { v1Token } = await import('../../../src/api');
    expect(await v1Token(request)).toBeTruthy();
  });

  test('Get Userinfo Matches Admin Email', async ({ request }) => {
    const body = await v1Json<Record<string, string>>(request, 'account', '/userinfo');
    expect(body.email).toBe(users.admin.email);
    expect(body).toHaveProperty('userId');
  });

  test('Get Screening Config', async ({ request }) => {
    const body = await v1Json(request, 'account', '/screening');
    assertList(body);
    expect(body.length).toBeGreaterThan(0);
  });

  test('Get Current User Company', async ({ request }) => {
    const body = await v1Json(request, 'account', '/companies');
    assertObject(body);
    expect(body).toHaveProperty('companyId');
  });

  test('Get Companies Paged', async ({ request }) => {
    const body = await v1Json(request, 'account', '/companies/paged?pageNo=0&pageSize=5');
    assertPage(body, 5);
  });

  test('Get Invited Admins Page', async ({ request }) => {
    assertPage(await v1Json(request, 'account', '/get_admins'));
  });

  test('Get Invited Users Page', async ({ request }) => {
    assertPage(await v1Json(request, 'account', '/invited_users'));
  });

  test('Userinfo Without Token Is Unauthorized', async ({ request }) => {
    await v1Get(request, 'account', '/userinfo', 401, false);
  });
});

test.describe('ATG v1 API a2f', () => {
  for (const [name, path] of [
    ['Get Investment Opportunities', '/investment_opportunities?page=0&size=5'],
    ['Get Financing Opportunities', '/financing_opportunities?page=0&size=5'],
    ['Get Access Finance List', '/access_finance?page=0&size=5'],
    ['Get Investment Providers', '/investment_provider?page=0&size=5'],
  ] as const) {
    test(name, async ({ request }) => {
      const body = await v1Json<Record<string, unknown>>(request, 'a2f', path);
      expect(body.status).toBe('SUCCESS');
      expect(body).toHaveProperty('data');
    });
  }

  test('Get Investment Provider Countries', async ({ request }) => {
    const body = await v1Json(request, 'a2f', '/investment_provider/getCountry');
    assertList(body);
    expect(body.length).toBeGreaterThan(0);
  });

  test('Get Investment Provider Names', async ({ request }) => {
    assertList(await v1Json(request, 'a2f', '/data/investmentProvider'));
  });
});

test.describe('ATG v1 API cms', () => {
  test('Get Faqs List', async ({ request }) => {
    const body = await v1Json(request, 'cms', '/faqs');
    assertList(body);
    expect(body.length).toBeGreaterThan(0);
  });
  test('Get Faqs Paged', async ({ request }) => {
    assertPage(await v1Json(request, 'cms', '/faqs/paged'));
  });
  for (const [name, path] of [
    ['Get News List', '/news'],
    ['Get Events List', '/events'],
    ['Get Publications List', '/publications'],
    ['Get Website Feedback User Categories', '/feedback/website/user-categories'],
    ['Get Website Feedback Page Urls', '/feedback/website/page-urls'],
  ] as const) {
    test(name, async ({ request }) => {
      assertList(await v1Json(request, 'cms', path));
    });
  }
  test('Get Campaigns Page', async ({ request }) => {
    assertPage(await v1Json(request, 'cms', '/campaigns'));
  });
});

test.describe('ATG v1 API discount', () => {
  test('Get Discounts List', async ({ request }) => {
    assertList(await v1Json(request, 'discount', '/discounts'));
  });
  test('Get Available Discounts Page', async ({ request }) => {
    assertPage(await v1Json(request, 'discount', '/discounts/availableDiscounts'));
  });
  test('Get Available Evouchers Page', async ({ request }) => {
    assertPage(await v1Json(request, 'discount', '/evouchers/availableEvouchers'));
  });
});

test.describe('ATG v1 API epc', () => {
  test('Get Epc User Info', async ({ request }) => {
    const body = await v1Json<Record<string, string>>(request, 'epc', '/userInfo');
    assertObject(body);
    expect(body.email).toBe(users.admin.email);
  });
  test('Get Epc Company', async ({ request }) => {
    const body = await v1Json(request, 'epc', '/companies');
    assertObject(body);
    expect(body).toHaveProperty('companyId');
  });
  test('Get All Project Names', async ({ request }) => {
    assertPage(await v1Json(request, 'epc', '/allProjectName'));
  });
  test('Get Project Names With Id', async ({ request }) => {
    assertPage(await v1Json(request, 'epc', '/projectNamesWithId'));
  });
  test('Get Tenders By Company', async ({ request }) => {
    assertList(await v1Json(request, 'epc', '/tendersByCompany'));
  });
});

test.describe('ATG v1 API messaging', () => {
  test('Get Contact Us Page', async ({ request }) => {
    assertPage(await v1Json(request, 'messaging', '/contact_us'));
  });
  test('Get Chat Rooms Page', async ({ request }) => {
    assertPage(await v1Json(request, 'messaging', '/chat/rooms'));
  });
});

test.describe('ATG v1 API notification', () => {
  test('Get Notifications Page', async ({ request }) => {
    const body = await v1Json<{ pageNo: number }>(request, 'notification', '/notifications?pageNo=0&pageSize=5&sortDir=ASC');
    assertPage(body);
    expect(Number(body.pageNo)).toBe(0);
  });
  test('Get Unread Notifications Count', async ({ request }) => {
    const count = await v1Json<number>(request, 'notification', '/notifications/count-unread');
    expect(Number.isInteger(count)).toBeTruthy();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('ATG v1 API package', () => {
  test('Get All Packages', async ({ request }) => {
    const body = await v1Json<Array<Record<string, unknown>>>(request, 'package', '/allPackages');
    assertList(body);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('title');
  });
  test('Get Available Packages Page', async ({ request }) => {
    assertPage(await v1Json(request, 'package', '/available_packages'));
  });
  test('Get All Available Packages Page', async ({ request }) => {
    assertPage(await v1Json(request, 'package', '/allAvailablePackages'));
  });
  test('Get Basic Package', async ({ request }) => {
    const body = await v1Json(request, 'package', '/basic');
    assertObject(body);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('title');
  });
  test('Get License Count', async ({ request }) => {
    const body = await v1Json(request, 'package', '/license_count');
    assertObject(body);
    expect(body).toHaveProperty('basic');
  });
});

test.describe('ATG v1 API payment', () => {
  test('Get Banks Page', async ({ request }) => {
    assertPage(await v1Json(request, 'payment', '/bank/banks'));
  });
  test('Get Activated Banks List', async ({ request }) => {
    const body = await v1Json(request, 'payment', '/bank/activatedBanksList');
    assertList(body);
    expect(body.length).toBeGreaterThan(0);
  });
  test('Get Billing Status', async ({ request }) => {
    const response = await v1Get(request, 'payment', '/billing/billing_status');
    expect(await response.text()).not.toBe('');
  });
  test('Get Payments Page', async ({ request }) => {
    assertPage(await v1Json(request, 'payment', '/payment?page=0&size=5'));
  });
});

test.describe('ATG v1 API storage', () => {
  test('Get Public Object Endpoint Is Reachable', async ({ request }) => {
    await v1Get(request, 'storage', '/public/rf-smoke-missing-key');
  });
  test('Get Private Object Endpoint Is Reachable', async ({ request }) => {
    await v1Get(request, 'storage', '/private/rf-smoke-missing-key');
  });
  test('Get Public Presigned Url', async ({ request }) => {
    const response = await v1Get(request, 'storage', '/public/presigned/rf-smoke-missing-key');
    expect(await response.text()).toContain('http');
  });
});

test.describe('ATG v1 API unavailable', () => {
  test('Developer Definition Is Unavailable', async ({ request }) => {
    const { v1 } = await import('../../../src/env');
    const response = await request.get(`${v1.baseUrl}/api-docs/developer`);
    expect(response.status()).toBe(500);
  });
  test('Freight Definition Is Unavailable', async ({ request }) => {
    const { v1 } = await import('../../../src/env');
    const response = await request.get(`${v1.baseUrl}/api-docs/freight`);
    expect(response.status()).toBe(404);
  });
});
