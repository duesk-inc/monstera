/**
 * APIレスポンス処理のユーティリティ関数
 */

import { DebugLogger } from '@/lib/debug/logger';

/**
 * APIレスポンスからデータを安全に抽出する
 * バックエンドのレスポンス形式の違いを吸収する
 * 
 * @param response Axiosレスポンスオブジェクト
 * @param operation デバッグ用の操作名
 * @returns 抽出されたデータまたはnull
 */
export function extractDataFromResponse<T>(
  response: any,
  operation?: string
): T | null {
  const opName = operation || 'Unknown';
  
  // レスポンスが存在しない場合
  if (!response) {
    DebugLogger.warn(
      { category: 'API_RESPONSE', operation: opName },
      'Response is null or undefined'
    );
    return null;
  }
  
  // response.dataが存在しない場合
  if (!response.data) {
    DebugLogger.warn(
      { category: 'API_RESPONSE', operation: opName },
      'Response.data is null or undefined'
    );
    return null;
  }
  
  // パターン1: response.data.data (標準的なAPIレスポンス形式)
  if (response.data.data !== undefined) {
    DebugLogger.info(
      { category: 'API_RESPONSE', operation: opName },
      'Using response.data.data pattern'
    );
    return response.data.data as T;
  }
  
  // パターン2: response.data直接 (一部のAPIの形式)
  DebugLogger.info(
    { category: 'API_RESPONSE', operation: opName },
    'Using response.data pattern'
  );
  return response.data as T;
}

/**
 * APIレスポンスのデータ存在チェック
 * 
 * @param data チェック対象のデータ
 * @returns データが有効な場合true
 */
export function isValidResponseData(data: any): boolean {
  return data !== null && data !== undefined;
}

/**
 * APIレスポンスの配列データを安全に取得
 * 
 * @param data レスポンスデータ
 * @param fieldName 配列フィールド名
 * @returns 配列データまたは空配列
 */
export function getArrayFromResponse<T>(
  data: any,
  fieldName: string
): T[] {
  if (!data || !data[fieldName]) {
    return [];
  }
  
  if (!Array.isArray(data[fieldName])) {
    console.warn(`Expected array for field ${fieldName}, got:`, typeof data[fieldName]);
    return [];
  }
  
  return data[fieldName] as T[];
}

/**
 * APIレスポンスの数値を安全に取得
 * 
 * @param data レスポンスデータ
 * @param fieldName フィールド名
 * @param defaultValue デフォルト値
 * @returns 数値またはデフォルト値
 */
export function getNumberFromResponse(
  data: any,
  fieldName: string,
  defaultValue: number = 0
): number {
  if (!data || data[fieldName] === undefined || data[fieldName] === null) {
    return defaultValue;
  }
  
  const value = Number(data[fieldName]);
  return isNaN(value) ? defaultValue : value;
}

/**
 * APIレスポンスの文字列を安全に取得
 * 
 * @param data レスポンスデータ
 * @param fieldName フィールド名
 * @param defaultValue デフォルト値
 * @returns 文字列またはデフォルト値
 */
export function getStringFromResponse(
  data: any,
  fieldName: string,
  defaultValue: string = ''
): string {
  if (!data || !data[fieldName]) {
    return defaultValue;
  }
  
  return String(data[fieldName]);
}

/**
 * ページネーションレスポンスのデフォルト値
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
} as const;

/**
 * ページネーションデータを安全に抽出
 * 
 * @param data レスポンスデータ
 * @returns ページネーション情報
 */
export function extractPaginationData(data: any) {
  return {
    page: getNumberFromResponse(data, 'page', DEFAULT_PAGINATION.page),
    limit: getNumberFromResponse(data, 'limit', DEFAULT_PAGINATION.limit),
    total: getNumberFromResponse(data, 'total', DEFAULT_PAGINATION.total),
    totalPages: getNumberFromResponse(data, 'total_pages', DEFAULT_PAGINATION.totalPages),
  };
}