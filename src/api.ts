import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { users, v1, v2 } from './env';

export type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

let cachedV1Token: string | undefined;

export async function loginAccount(
  request: APIRequestContext,
  baseUrl: string,
  username: string,
  password: string,
): Promise<{ accessToken: string; refreshToken?: string }> {
  const response = await request.post(`${baseUrl}/api/account/login`, {
    data: { username, password },
  });
  expect(response.status(), await response.text()).toBe(200);
  const body = (await response.json()) as { accessToken: string; refreshToken?: string };
  expect(body.accessToken).toBeTruthy();
  return body;
}

export async function v1Token(request: APIRequestContext): Promise<string> {
  if (!cachedV1Token) {
    const tokens = await loginAccount(request, v1.baseUrl, users.admin.email, users.admin.password);
    cachedV1Token = tokens.accessToken;
  }
  return cachedV1Token;
}

export async function v1Get(
  request: APIRequestContext,
  service: string,
  path: string,
  expected = 200,
  authenticated = true,
): Promise<APIResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authenticated) headers.Authorization = `Bearer ${await v1Token(request)}`;
  const response = await request.get(`${v1.baseUrl}/api/${service}${path}`, { headers });
  expect(response.status(), await response.text()).toBe(expected);
  return response;
}

export async function v1Json<T = Json>(request: APIRequestContext, service: string, path: string): Promise<T> {
  const response = await v1Get(request, service, path);
  return (await response.json()) as T;
}

export function assertObject(body: unknown): asserts body is Record<string, unknown> {
  expect(body).toEqual(expect.any(Object));
  expect(Array.isArray(body)).toBeFalsy();
}

export function assertList(body: unknown): asserts body is unknown[] {
  expect(Array.isArray(body)).toBeTruthy();
}

export function assertPage(body: unknown, size?: number): asserts body is { content: unknown[]; totalElements: number; pageSize?: number; pageNo?: number } {
  assertObject(body);
  expect(body).toHaveProperty('content');
  expect(body).toHaveProperty('totalElements');
  expect(Array.isArray(body.content)).toBeTruthy();
  if (size !== undefined) {
    expect(Number(body.pageSize)).toBe(size);
    expect(body.content).toHaveLength(size);
  }
}

export async function v2Login(
  request: APIRequestContext,
  username = users.admin.email,
  password = users.admin.password,
): Promise<{ accessToken: string; refreshToken: string }> {
  const tokens = await loginAccount(request, v2.baseUrl, username, password);
  expect(tokens.refreshToken).toBeTruthy();
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken as string };
}

export async function accountGet(request: APIRequestContext, token: string, path: string, expected = 200): Promise<APIResponse> {
  const response = await request.get(`${v2.baseUrl}/api/account${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  expect(response.status(), await response.text()).toBe(expected);
  return response;
}

export async function accountPost(
  request: APIRequestContext,
  token: string | undefined,
  path: string,
  data: unknown,
  expected = 200,
): Promise<APIResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await request.post(`${v2.baseUrl}/api/account${path}`, { headers, data });
  expect(response.status(), await response.text()).toBe(expected);
  return response;
}

export async function notificationGet(request: APIRequestContext, token: string, path: string): Promise<APIResponse> {
  const response = await request.get(`${v2.baseUrl}/api/notification${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  expect(response.status(), await response.text()).toBe(200);
  return response;
}
