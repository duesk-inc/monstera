/**
 * キャメルケースからスネークケースに変換する
 * 例: camelCase -> camel_case
 */
export const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * スネークケースからキャメルケースに変換する
 * 例: snake_case -> snakeCase
 */
export const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * オブジェクト内のすべてのキーをキャメルケースからスネークケースに変換する
 * 再帰的に処理するため、ネストされたオブジェクトや配列も変換される
 */
export const convertCamelToSnake = <T>(obj: unknown): T => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj as T;
  }

  // 配列の場合は各要素に対して再帰的に処理
  if (Array.isArray(obj)) {
    return obj.map(item => convertCamelToSnake(item)) as unknown as T;
  }

  // オブジェクトの場合は各プロパティに対して再帰的に処理
  const result: Record<string, unknown> = {};
  Object.keys(obj as object).forEach(key => {
    const snakeKey = camelToSnake(key);
    result[snakeKey] = convertCamelToSnake((obj as Record<string, unknown>)[key]);
  });

  return result as T;
};

/**
 * オブジェクト内のすべてのキーをスネークケースからキャメルケースに変換する
 * 再帰的に処理するため、ネストされたオブジェクトや配列も変換される
 */
export const convertSnakeToCamel = <T>(obj: unknown): T => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj as T;
  }

  // 配列の場合は各要素に対して再帰的に処理
  if (Array.isArray(obj)) {
    return obj.map(item => convertSnakeToCamel(item)) as unknown as T;
  }

  // オブジェクトの場合は各プロパティに対して再帰的に処理
  const result: Record<string, unknown> = {};
  Object.keys(obj as object).forEach(key => {
    const camelKey = snakeToCamel(key);
    result[camelKey] = convertSnakeToCamel((obj as Record<string, unknown>)[key]);
  });

  return result as T;
}; 