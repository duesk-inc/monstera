/**
 * 開発環境のみでログを出力するユーティリティ
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 開発環境のみで通常ログを出力
 * @param message ログメッセージ
 * @param optionalParams 追加パラメータ
 */
export const logDev = (message?: unknown, ...optionalParams: unknown[]): void => {
  if (isDevelopment) {
    console.log(message, ...optionalParams);
  }
};

/**
 * 開発環境のみで警告ログを出力
 * @param message 警告メッセージ
 * @param optionalParams 追加パラメータ
 */
export const warnDev = (message?: unknown, ...optionalParams: unknown[]): void => {
  if (isDevelopment) {
    console.warn(message, ...optionalParams);
  }
};

/**
 * 開発環境のみでエラーログを出力
 * @param message エラーメッセージ
 * @param optionalParams 追加パラメータ
 */
export const errorDev = (message?: unknown, ...optionalParams: unknown[]): void => {
  if (isDevelopment) {
    console.error(message, ...optionalParams);
  }
}; 