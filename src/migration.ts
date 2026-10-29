import fs from 'fs';
import { fixtures, users } from './env';

type MigrationUser = {
  email: string;
  subscriber_subscription_id: string | null;
  array_agg?: string[];
};

export type EnrichedUser = MigrationUser & {
  roles: string[];
  isSubscriber: boolean;
  isUserOnly: boolean;
  hasFiAgent: boolean;
  missingSubscriptionId: boolean;
};

function loadUsers(): EnrichedUser[] {
  const raw = JSON.parse(fs.readFileSync(fixtures.migrationUsers, 'utf8')) as MigrationUser[];
  return raw.map((user) => {
    const roles = new Set(user.array_agg || []);
    return {
      ...user,
      roles: [...roles].sort(),
      isSubscriber: roles.has('ATG_SUBSCRIBER'),
      isUserOnly: roles.size > 0 && [...roles].every((role) => role === 'ATG_USER'),
      hasFiAgent: roles.has('ATG_FI_AGENT'),
      missingSubscriptionId: user.subscriber_subscription_id == null,
    };
  });
}

function take(emails: string[], limit = 0): string[] {
  return limit ? emails.slice(0, limit) : emails;
}

export function grantBasicCandidates(limit = 0): string[] {
  return take(
    loadUsers()
      .filter((user) => user.isUserOnly && user.missingSubscriptionId)
      .map((user) => user.email),
    limit,
  );
}

export function subscriberCandidates(limit = 0): string[] {
  return take(
    loadUsers()
      .filter((user) => user.isSubscriber && user.missingSubscriptionId)
      .map((user) => user.email),
    limit,
  );
}

export function fiSubscriberCandidates(limit = 0): string[] {
  return take(
    loadUsers()
      .filter((user) => user.isSubscriber && user.hasFiAgent && user.missingSubscriptionId)
      .map((user) => user.email),
    limit,
  );
}

export function legacyConsumerCandidates(sponsorEmail: string, limit = 5): string[] {
  return take(
    loadUsers()
      .filter(
        (user) =>
          user.isSubscriber &&
          user.missingSubscriptionId &&
          user.email !== sponsorEmail &&
          !user.hasFiAgent,
      )
      .map((user) => user.email),
    limit,
  );
}

export function firstOrThrow(emails: string[], label: string): string {
  if (!emails[0]) throw new Error(`No ${label} candidate in migration_users.json`);
  return emails[0];
}

export const migrationAdmin = {
  username: process.env.MIGRATION_ADMIN_USERNAME || users.admin.email,
  password: process.env.MIGRATION_ADMIN_PASSWORD || users.admin.password,
};

export const migrationData = {
  companySecondary: '680bfe85-bafe-4775-8aa8-3c51228073bf',
  companyTertiary: '7a5f13b9-850b-4af9-b8a6-82bb272d1de8',
  grantBasicValid: { userEmail: 'paziwu@yopmail.com', assignCompanyAdmin: false },
  grantBasicTestb2b01: { userEmail: 'testb2b01@yopmail.com', assignCompanyAdmin: true },
  grantBasicTestingnew: { userEmail: 'testingnew@yopmail.com', assignCompanyAdmin: false },
  grantBasicTransfer16: { userEmail: 'transfer16@yopmail.com', assignCompanyAdmin: true },
  grantBasic: { assignCompanyAdmin: false, batchLimit: 5 },
  correctPackage: {
    basicPackageId: 'd510241d-1b80-4d14-9319-a17b9346a2e4',
    fiCorporateSponsorPackageId: '4f3a1a80-ba59-4ad8-a7fd-442ae287e475',
  },
  attachUser: {
    userEmail: 'samieuahidi2mdlcom@ypomail.com',
    targetCompanyId: '7b114929-1def-42a7-ac90-6b7062a84157',
  },
  assignAdmin: {
    userEmail: 'test_sync_m2@yopmail.com',
    companyId: 'b36c7d22-4796-498e-8e38-bbc176ce06bf',
  },
};
