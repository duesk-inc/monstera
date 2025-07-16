/**
 * テスト用メールアドレスの定数定義
 * これらのメールアドレスはテスト専用で、実際のユーザーには使用しないこと
 */

// ロール別テストメールアドレス
export const TEST_EMAILS = {
  // ロール別
  admin: 'admin@duesk.co.jp',
  manager: 'manager_test@duesk.co.jp',
  engineer: 'engineer_test@duesk.co.jp',
  sales: 'sales_test@duesk.co.jp',

  // 汎用
  default: 'test@duesk.co.jp',

  // 特殊用途
  uniqueTest1: 'unique_test1@duesk.co.jp',
  uniqueTest2: 'unique_test2@duesk.co.jp',

  // モックデータ
  mockMale: 'yamada@duesk.co.jp',
  mockFemale: 'sato@duesk.co.jp',
} as const;

// テスト用パスワード
export const TEST_PASSWORDS = {
  default: 'Test1234!',
  admin: 'admin123',
  engineer: 'engineer123',
  plain: 'password',
  password123: 'password123',
} as const;

// テストユーザー情報
export interface TestUser {
  email: string;
  password: string;
  role: string;
  name: string;
}

// 標準的なテストユーザー
export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: TEST_EMAILS.admin,
    password: TEST_PASSWORDS.admin,
    role: 'admin',
    name: 'テスト管理者',
  },
  manager: {
    email: TEST_EMAILS.manager,
    password: TEST_PASSWORDS.default,
    role: 'manager',
    name: 'テスト マネージャー',
  },
  engineer: {
    email: TEST_EMAILS.engineer,
    password: TEST_PASSWORDS.default,
    role: 'engineer',
    name: 'テスト エンジニア',
  },
  sales: {
    email: TEST_EMAILS.sales,
    password: TEST_PASSWORDS.default,
    role: 'sales',
    name: 'テスト 営業',
  },
  default: {
    email: TEST_EMAILS.default,
    password: TEST_PASSWORDS.default,
    role: 'user',
    name: 'テストユーザー',
  },
};

// メールアドレスからテストユーザー情報を取得
export function getTestUserByEmail(email: string): TestUser | undefined {
  return Object.values(TEST_USERS).find(user => user.email === email);
}

// ロールからテストユーザー情報を取得
export function getTestUserByRole(role: string): TestUser | undefined {
  return Object.values(TEST_USERS).find(user => user.role === role);
}

// テスト用メールアドレスかどうかを判定
export function isTestEmail(email: string): boolean {
  return Object.values(TEST_EMAILS).includes(email as any);
}