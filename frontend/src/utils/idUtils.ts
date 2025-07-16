/**
 * ID関連のユーティリティ関数
 */

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

/**
 * API通信時にバックエンドのスネークケースをフロントエンドのキャメルケースに変換する
 * @param {Record<string, any> | any[] | any} data - 変換する対象のオブジェクト
 * @returns {T} - 変換された型付きオブジェクト
 */
export const convertToCamelCase = <T>(data: JsonValue): T => {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map(item => convertToCamelCase<JsonValue>(item)) as unknown as T;
  }

  const camelCaseData: Record<string, JsonValue> = {};
  Object.entries(data as Record<string, JsonValue>).forEach(([key, value]) => {
    // snake_case から camelCase への変換
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelCaseData[camelKey] = convertToCamelCase<JsonValue>(value);
  });

  return camelCaseData as unknown as T;
};

/**
 * API通信時にフロントエンドのキャメルケースをバックエンドのスネークケースに変換する
 * @param {Record<string, JsonValue> | JsonValue[] | JsonValue} data - 変換する対象のオブジェクト
 * @returns {Record<string, JsonValue> | JsonValue[] | JsonValue} - 変換されたオブジェクト
 */
export const convertToSnakeCase = (data: Record<string, JsonValue> | JsonValue[] | JsonValue): Record<string, JsonValue> | JsonValue[] | JsonValue => {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => convertToSnakeCase(item));
  }

  const snakeCaseData: Record<string, JsonValue> = {};
  Object.entries(data as Record<string, JsonValue>).forEach(([key, value]) => {
    // camelCase から snake_case への変換
    const snakeKey = key.replace(/([A-Z])/g, letter => `_${letter.toLowerCase()}`);
    snakeCaseData[snakeKey] = convertToSnakeCase(value);
  });

  return snakeCaseData;
};

/**
 * ユーザーIDが有効なUUIDフォーマットかどうかをチェックする
 * @param {string} userId - チェックするユーザーID
 * @returns {boolean} - 有効なUUIDフォーマットかどうか
 */
export const isValidUUID = (userId: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(userId);
};

/**
 * 文字列がUUIDフォーマットかどうかを確認し、無効な場合はエラーをスローする
 * @param {string} id - 確認するID文字列
 * @throws {Error} - 無効なUUID形式の場合
 */
export const validateUUID = (id: string): void => {
  if (!isValidUUID(id)) {
    throw new Error(`無効なUUID形式: ${id}`);
  }
};

/**
 * IDフィールドを含むオブジェクトからUUIDの正当性を検証する
 * @param {Record<string, unknown>} data - 検証するオブジェクト
 * @param {string[]} idFields - 検証するIDフィールド名の配列（例: ['id', 'userId']）
 * @returns {boolean} - すべてのIDフィールドが有効かどうか
 */
export const validateObjectIDs = (data: Record<string, unknown>, idFields: string[]): boolean => {
  return idFields.every(field => {
    const value = data[field];
    return typeof value !== 'string' || isValidUUID(value);
  });
};

/**
 * IDフィールドの名前をキャメルケースからスネークケースに変換する
 * 例: userId -> user_id
 * @param {string} idField - 変換するIDフィールド名
 * @returns {string} - 変換後のフィールド名
 */
export const convertIDFieldToSnakeCase = (idField: string): string => {
  // ID で終わるフィールド名を特別に処理
  if (idField.endsWith('Id')) {
    // userId -> user_id のように変換
    return idField.replace(/([a-z])Id$/, '$1_id');
  }
  // 通常のキャメルケース -> スネークケース変換
  return idField.replace(/([A-Z])/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * IDフィールドの名前をスネークケースからキャメルケースに変換する
 * 例: user_id -> userId
 * @param {string} idField - 変換するIDフィールド名
 * @returns {string} - 変換後のフィールド名
 */
export const convertIDFieldToCamelCase = (idField: string): string => {
  // _id で終わるフィールド名を特別に処理
  if (idField.endsWith('_id')) {
    // user_id -> userId のように変換
    return idField.replace(/_id$/, 'Id');
  }
  // 通常のスネークケース -> キャメルケース変換
  return idField.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}; 