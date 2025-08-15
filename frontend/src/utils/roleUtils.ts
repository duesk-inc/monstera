/**
 * 単一ロールシステム用ユーティリティ関数
 * バックエンドと同じロジックで権限チェックを行う
 */

/**
 * ユーザーが必要な権限を持っているかチェック
 * 数値が小さいほど権限が高い（1: SuperAdmin > 4: Engineer）
 * @param userRole ユーザーのロール（数値）
 * @param requiredRole 必要なロール（数値）
 * @returns 権限があればtrue
 */
export const hasPermission = (userRole: number, requiredRole: number): boolean => {
  return userRole <= requiredRole;
};

/**
 * 管理者権限以上かチェック
 * @param userRole ユーザーのロール（数値）
 * @returns SuperAdmin(1)またはAdmin(2)の場合true
 */
export const isAdmin = (userRole: number): boolean => {
  return userRole <= 2;
};

/**
 * マネージャー権限以上かチェック
 * @param userRole ユーザーのロール（数値）
 * @returns SuperAdmin(1)、Admin(2)、Manager(3)の場合true
 */
export const isManager = (userRole: number): boolean => {
  return userRole <= 3;
};

/**
 * エンジニア権限以上かチェック（実質全員）
 * @param userRole ユーザーのロール（数値）
 * @returns 有効なロールの場合true
 */
export const isEngineer = (userRole: number): boolean => {
  return userRole >= 1 && userRole <= 4;
};

/**
 * ロールの文字列表現を数値に変換
 * @param roleString ロール文字列
 * @returns ロール数値
 */
export const roleStringToNumber = (roleString: string): number => {
  const roleMap: Record<string, number> = {
    'super_admin': 1,
    'admin': 2,
    'manager': 3,
    'engineer': 4,
    'employee': 4, // 後方互換性
    'user': 4,     // 後方互換性
  };
  return roleMap[roleString.toLowerCase()] || 4;
};

/**
 * ロールの数値を文字列表現に変換
 * @param roleNumber ロール数値
 * @returns ロール文字列
 */
export const roleNumberToString = (roleNumber: number): string => {
  const roleMap: Record<number, string> = {
    1: 'super_admin',
    2: 'admin',
    3: 'manager',
    4: 'engineer',
  };
  return roleMap[roleNumber] || 'engineer';
};

/**
 * ロールの表示名を取得
 * @param roleNumber ロール数値
 * @returns 日本語表示名
 */
export const getRoleDisplayName = (roleNumber: number): string => {
  const displayNames: Record<number, string> = {
    1: 'スーパー管理者',
    2: '管理者',
    3: 'マネージャー',
    4: 'エンジニア',
  };
  return displayNames[roleNumber] || 'エンジニア';
};

/**
 * 有効なロールかチェック
 * @param roleNumber ロール数値
 * @returns 1-4の範囲内であればtrue
 */
export const isValidRole = (roleNumber: number): boolean => {
  return roleNumber >= 1 && roleNumber <= 4;
};

/**
 * Feature Flag: マルチロール機能が有効かチェック
 * @returns 環境変数ENABLE_MULTI_ROLEがtrueの場合true
 */
export const isMultiRoleEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    // サーバーサイドの場合
    return process.env.ENABLE_MULTI_ROLE === 'true';
  }
  // クライアントサイドの場合（Next.jsのpublicEnvを使用する場合）
  // 現在はサーバーサイドの環境変数のみ対応
  return false;
};