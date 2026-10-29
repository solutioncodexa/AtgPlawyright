import { expect, test } from '@playwright/test';
import { accountGet, accountPost, notificationGet, v2Login } from '../../../src/api';
import { users } from '../../../src/env';

test.describe.serial('ATG v2 API smoke', () => {
  let accessToken = '';
  let refreshToken = '';

  test.beforeAll(async ({ request }) => {
    const tokens = await v2Login(request);
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  });

  test('Login Admin Returns Access Token', async () => {
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
  });

  test('Refresh Token Returns New Access Token', async ({ request }) => {
    const response = await accountPost(request, accessToken, '/v2/auth/refresh-token', {
      username: users.admin.email,
      refreshToken,
    });
    const body = (await response.json()) as { accessToken: string };
    expect(body.accessToken).toBeTruthy();
    accessToken = body.accessToken;
    const info = await accountGet(request, accessToken, '/v2/auth/user-info');
    expect((await info.json()) as object).toHaveProperty('userInfo');
  });

  test('Get User Info Matches Admin Email', async ({ request }) => {
    const response = await accountGet(request, accessToken, '/v2/auth/user-info');
    const body = (await response.json()) as { userInfo: { email: string; id: string; username: string } };
    expect(body.userInfo.email).toBe(users.admin.email);
    expect(body.userInfo.id).toBeTruthy();
  });

  test('Get Personal Profile Matches Admin Email', async ({ request }) => {
    const response = await accountGet(request, accessToken, '/v2/profile');
    const body = (await response.json()) as { email: string; firstName: string; lastName: string };
    expect(body.email).toBe(users.admin.email);
    expect(body.firstName).toBeTruthy();
  });

  test('Get Verification Centre For Admin', async ({ request }) => {
    const response = await accountGet(request, accessToken, '/v2/verification-centre');
    const body = (await response.json()) as { status: string; progress: unknown; submissionState: string };
    expect(body.status).toBeTruthy();
    expect(body.submissionState).toBeTruthy();
    expect(body).toHaveProperty('progress');
  });

  test('Get Company Profile As Admin', async ({ request }) => {
    const response = await accountGet(request, accessToken, '/v2/company/profile');
    const body = (await response.json()) as { companyName: string; status: string };
    expect(body.companyName).toBeTruthy();
    expect(body).toHaveProperty('status');
  });

  test('Get Company Profile As Company Admin', async ({ request }) => {
    const company = await v2Login(request, users.companyAdmin.email, users.companyAdmin.password);
    const response = await accountGet(request, company.accessToken, '/v2/company/profile');
    const body = (await response.json()) as { companyName: string };
    expect(body.companyName).toBeTruthy();
    const restored = await v2Login(request);
    accessToken = restored.accessToken;
    refreshToken = restored.refreshToken;
  });

  test('Get Pending Company Join Requests Page', async ({ request }) => {
    const response = await accountGet(request, accessToken, '/v2/company-join-requests/pending?page=0&size=5');
    const body = (await response.json()) as { pageNo: number; content: unknown[]; totalElements: number };
    expect(Number(body.pageNo)).toBe(0);
    expect(Array.isArray(body.content)).toBeTruthy();
  });

  test('Get Companies Paged As Admin', async ({ request }) => {
    const response = await accountGet(request, accessToken, '/companies/paged?pageNo=0&pageSize=5');
    const body = (await response.json()) as { pageSize: number; content: Array<Record<string, unknown>> };
    expect(Number(body.pageSize)).toBe(5);
    expect(body.content).toHaveLength(5);
    expect(body.content[0]).toHaveProperty('companyId');
    expect(body.content[0]).toHaveProperty('name');
  });

  test('Get Notifications Page', async ({ request }) => {
    const response = await notificationGet(request, accessToken, '/notifications?pageNo=0&pageSize=5&sortDir=ASC');
    const body = (await response.json()) as { pageNo: number; content: unknown[]; totalElements: number };
    expect(Number(body.pageNo)).toBe(0);
    expect(Array.isArray(body.content)).toBeTruthy();
  });

  test('Get Notifications Unread Count', async ({ request }) => {
    const response = await notificationGet(request, accessToken, '/notifications/count-unread');
    const count = (await response.json()) as number;
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('User Info Without Token Is Unauthorized', async ({ request }) => {
    const { v2 } = await import('../../../src/env');
    const response = await request.get(`${v2.baseUrl}/api/account/v2/auth/user-info`);
    expect(response.status()).toBe(401);
  });

  test('Refresh Token Without Username Fails Validation', async ({ request }) => {
    const response = await accountPost(request, accessToken, '/v2/auth/refresh-token', { refreshToken }, 400);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
