/**
 * 深いレベルでのマージを行うユーティリティ関数
 * undefined や null の値をデフォルト値で置き換える
 */
export function deepMergeWithDefaults<T extends Record<string, any>>(
  data: T | null | undefined,
  defaults: T
): T {
  if (!data || typeof data !== 'object') {
    return defaults;
  }

  const result = { ...defaults };

  for (const key in defaults) {
    if (Object.prototype.hasOwnProperty.call(defaults, key)) {
      const defaultValue = defaults[key];
      const dataValue = data[key];

      if (dataValue === null || dataValue === undefined) {
        result[key] = defaultValue;
      } else if (typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
        result[key] = deepMergeWithDefaults(dataValue, defaultValue);
      } else {
        result[key] = dataValue;
      }
    }
  }

  return result;
}