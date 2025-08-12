/**
 * ロール関連の定数定義
 * アプリケーション全体で使用するロールの定数を管理
 */

/**
 * ロール文字列定数
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  ENGINEER: 'engineer'
} as const;

/**
 * ロール数値定数（バックエンドとの対応）
 */
export const ROLE_VALUES = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  MANAGER: 3,
  ENGINEER: 4
} as const;

/**
 * 文字列から数値へのマッピング
 */
export const ROLE_STRING_TO_VALUE = {
  [ROLES.SUPER_ADMIN]: ROLE_VALUES.SUPER_ADMIN,
  [ROLES.ADMIN]: ROLE_VALUES.ADMIN,
  [ROLES.MANAGER]: ROLE_VALUES.MANAGER,
  [ROLES.ENGINEER]: ROLE_VALUES.ENGINEER
} as const;

/**
 * 数値から文字列へのマッピング
 */
export const ROLE_VALUE_TO_STRING = {
  [ROLE_VALUES.SUPER_ADMIN]: ROLES.SUPER_ADMIN,
  [ROLE_VALUES.ADMIN]: ROLES.ADMIN,
  [ROLE_VALUES.MANAGER]: ROLES.MANAGER,
  [ROLE_VALUES.ENGINEER]: ROLES.ENGINEER
} as const;

/**
 * ロール表示名（日本語）
 */
export const ROLE_DISPLAY_NAMES = {
  [ROLES.SUPER_ADMIN]: 'スーパー管理者',
  [ROLES.ADMIN]: '管理者',
  [ROLES.MANAGER]: 'マネージャー',
  [ROLES.ENGINEER]: 'エンジニア'
} as const;

/**
 * ロール文字列の型定義
 */
export type RoleType = typeof ROLES[keyof typeof ROLES];

/**
 * ロール数値の型定義
 */
export type RoleValueType = typeof ROLE_VALUES[keyof typeof ROLE_VALUES];

/**
 * 管理者権限を持つロールのリスト
 */
export const ADMIN_ROLES: ReadonlyArray<RoleType> = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MANAGER
] as const;

/**
 * すべてのロールのリスト（権限順）
 */
export const ALL_ROLES: ReadonlyArray<RoleType> = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.ENGINEER
] as const;

/**
 * ロールが管理者権限を持つかチェック
 */
export const isAdminRole = (role: RoleType): boolean => {
  return ADMIN_ROLES.includes(role);
};

/**
 * ロールの権限レベルを比較（数値が小さいほど権限が高い）
 */
export const hasHigherOrEqualPermission = (userRole: RoleType, requiredRole: RoleType): boolean => {
  const userValue = ROLE_STRING_TO_VALUE[userRole];
  const requiredValue = ROLE_STRING_TO_VALUE[requiredRole];
  return userValue <= requiredValue;
};

/**
 * 数値からロール文字列への変換
 */
export const convertRoleValueToString = (value: number): RoleType | 'unknown' => {
  return ROLE_VALUE_TO_STRING[value as RoleValueType] || 'unknown';
};

/**
 * ロール文字列から数値への変換
 */
export const convertRoleStringToValue = (role: RoleType): RoleValueType => {
  return ROLE_STRING_TO_VALUE[role];
};