import path from 'path';

export const PLAYWRIGHT_ROOT = path.resolve(__dirname, '..');

const ENVIRONMENTS = {
  staging: {
    baseUrl: 'https://staging-atg.peaqock.com',
    workspaceUrl: 'https://staging-atg.peaqock.com/workspace',
    loginUrl: 'https://staging-atg.peaqock.com/workspace/auth',
  },
  uat: {
    baseUrl: 'https://uat.atg.africa',
    workspaceUrl: 'https://uat.atg.africa/workspace',
    loginUrl: 'https://uat.atg.africa/workspace/auth',
  },
} as const;

type EnvName = keyof typeof ENVIRONMENTS;

function envName(): EnvName {
  const name = (process.env.ROBOT_ENV || 'staging').toLowerCase();
  return name === 'uat' ? 'uat' : 'uat';
}

const current = ENVIRONMENTS[envName()];

export const v1 = {
  ...current,
  publicHome: `${current.baseUrl}/`,
  publicAbout: `${current.baseUrl}/about-atg`,
  publicSolutions: `${current.baseUrl}/solutions`,
  yopmailUrl: 'https://yopmail.com/',
};

const v2Base = current.baseUrl;

export const v2 = {
  baseUrl: v2Base,
  workspaceBase: `${v2Base}/workspace/v2`,
  loginUrl: `${v2Base}/workspace/v2/signin`,
  signupUrl: `${v2Base}/workspace/v2/signup`,
  workspaceUrl: `${v2Base}/workspace/v2/workspace`,
  companyRequestsUrl: `${v2Base}/workspace/v2/company-requests`,
  personalUrl: `${v2Base}/workspace/v2/settings/personal`,
  organizationUrl: `${v2Base}/workspace/v2/settings/company`,
  verificationUrl: `${v2Base}/workspace/v2/settings/verification`,
  membersUrl: `${v2Base}/workspace/v2/company/members`,
  tendersUrl: `${v2Base}/workspace/v2/connect/tenders`,
  tenderPostUrl: `${v2Base}/workspace/v2/connect/tenders/post-contract-request`,
  financeUrl: `${v2Base}/workspace/v2/connect/access-to-finance`,
  investmentUrl: `${v2Base}/workspace/v2/connect/investment`,
  roleEditorUrl: (code: string) => `${v2Base}/workspace/roles-permissions/${code}`,
  yopmailUrl: 'https://yopmail.com/',
};

export const users = {
  admin: {
    email: process.env.ATG_ADMIN_EMAIL || 'shadowadmin@yopmail.com',
    password: process.env.ATG_ADMIN_PASSWORD || 'Admin@123',
  },
  subscriber: {
    email: process.env.ATG_SUBSCRIBER_EMAIL || 'test4350@yopmail.com',
    password: process.env.ATG_SUBSCRIBER_PASSWORD || process.env.ATG_DEFAULT_PASSWORD || 'Admin@123',
  },
  companyAdmin: {
    email: process.env.ATG_COMPANY_ADMIN_EMAIL || 'paka@yopmail.com',
    password: process.env.ATG_COMPANY_ADMIN_PASSWORD || 'Admin@123',
  },
  publisher: {
    email: process.env.ATG_PUBLISHER_EMAIL || 'shadowshadowadmin@yopmail.com',
    password: process.env.ATG_PUBLISHER_PASSWORD || process.env.ATG_DEFAULT_PASSWORD || 'Admin@123',
  },
  spAdmin: {
    email: process.env.ATG_SP_ADMIN_EMAIL || 'filuveb@yopmail.com',
    password: process.env.ATG_SP_ADMIN_PASSWORD || process.env.ATG_DEFAULT_PASSWORD || 'Admin@123',
  },
  spAuditor: {
    email: process.env.ATG_SP_AUDITOR_EMAIL || 'wujygyco@yopmail.com',
    password: process.env.ATG_SP_AUDITOR_PASSWORD || process.env.ATG_DEFAULT_PASSWORD || 'Admin@123',
  },
  ba: {
    email: process.env.ATG_BA_EMAIL || 'fomo@yopmail.com',
    password: process.env.ATG_BA_PASSWORD || process.env.ATG_DEFAULT_PASSWORD || 'Admin@123',
  },
  maker: {
    email: process.env.ATG_MAKER_EMAIL || 'waxaliz@yopmail.com',
    password: process.env.ATG_MAKER_PASSWORD || process.env.ATG_DEFAULT_PASSWORD || 'Admin@123',
  },
  checker: {
    email: process.env.ATG_CHECKER_EMAIL || 'bileral@yopmail.com',
    password: process.env.ATG_CHECKER_PASSWORD || process.env.ATG_DEFAULT_PASSWORD || 'Admin@123',
  },
  invalidEmail: {
    email: 'invalid-user@yopmail.com',
    password: 'Admin@123',
  },
  invalidPassword: {
    email: process.env.ATG_ADMIN_EMAIL || 'shadowadmin@yopmail.com',
    password: 'WrongPassword123',
  },
};

export const defaultPassword = process.env.ATG_DEFAULT_PASSWORD || 'Admin@123';

export const fixtures = {
  pdf: path.join(PLAYWRIGHT_ROOT, 'data', 'fixtures', 'sample_upload.pdf'),
  image: path.join(PLAYWRIGHT_ROOT, 'data', 'fixtures', 'sample_upload.png'),
  migrationUsers: path.join(PLAYWRIGHT_ROOT, 'data', 'atg_v1', 'api', 'migration_users.json'),
  lastInviteEmail: path.join(PLAYWRIGHT_ROOT, 'results', 'atg_v1', 'operation', 'last_invite_email.txt'),
  v1Questions: path.join(PLAYWRIGHT_ROOT, 'data', 'atg_v1', 'ai_assistant', 'questions_smoke.txt'),
  v1Expected: path.join(PLAYWRIGHT_ROOT, 'data', 'atg_v1', 'ai_assistant', 'expected_answers_smoke.txt'),
  v2AllQuestions: path.join(PLAYWRIGHT_ROOT, 'data', 'atg_v2', 'ai_assistant', 'all_questions.txt'),
  v2Questions:
    process.env.KORA_QUESTIONS_FILE ||
    path.join(PLAYWRIGHT_ROOT, 'data', 'atg_v2', 'ai_assistant', 'questions.txt'),
  v2Expected:
    process.env.KORA_EXPECTED_FILE ||
    path.join(PLAYWRIGHT_ROOT, 'data', 'atg_v2', 'ai_assistant', 'expected_answers.txt'),
};

export function stamp(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}
