import axios, { AxiosError } from 'axios';
import { 
  enhanceError, 
  extractApiError, 
  logError, 
  type ApiError, 
  type EnhancedError 
} from '../../utils/errorUtils';

/**
 * Abortエラーを表すカスタムエラークラス
 */
export class AbortError extends Error {
  constructor(message: string = 'Request was aborted') {
    super(message);
    this.name = 'AbortError';
  }
}

/**
 * エラーがAbort関連のエラーかどうかを判定
 */
export const isAbortError = (error: unknown): boolean => {
  // DOMException の AbortError
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  
  // カスタムAbortError
  if (error instanceof AbortError) {
    return true;
  }
  
  // Axios の CanceledError
  if (error && typeof error === 'object') {
    const errorObj = error as { name?: string; code?: string; message?: string };
    if (errorObj.name === 'CanceledError' || errorObj.code === 'ERR_CANCELED') {
      return true;
    }
    
    // その他のキャンセル関連エラー
    if (errorObj.message === 'canceled' || errorObj.message === 'cancelled') {
      return true;
    }
  }
  
  return false;
};

/**
 * APIエラーハンドリングの共通処理（エラーコード対応版）
 * @param error エラーオブジェクト
 * @param resourceName リソース名（エラーメッセージ用）
 * @param options オプション設定
 * @returns エラーメッセージを含むErrorオブジェクト
 */
export const handleApiError = (
  error: unknown, 
  resourceName: string,
  options: { enableCodeMapping?: boolean; logContext?: string } = {}
): Error => {
  const { enableCodeMapping = true, logContext } = options;

  // デバッグログ出力（開発環境のみ）
  if (logContext) {
    logError(error, logContext);
  }

  // Abort関連のエラーの場合は特別なAbortErrorを返す
  if (isAbortError(error)) {
    return new AbortError(`${resourceName}の取得がキャンセルされました`);
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    
    if (axiosError.response) {
      // サーバーからのレスポンスがある場合
      const status = axiosError.response.status;
      const data = axiosError.response.data;

      // APIエラーレスポンスの抽出
      const apiError = extractApiError(axiosError.response);
      
      // エラーコードマッピングが有効で、構造化されたエラーレスポンスがある場合
      if (enableCodeMapping && apiError) {
        const enhanced = enhanceError(apiError, `${resourceName}の処理に失敗しました`);
        
        // 拡張されたエラー情報を持つErrorオブジェクトを作成
        const errorWithEnhancement = new Error(enhanced.userMessage) as Error & { 
          enhanced: EnhancedError 
        };
        (errorWithEnhancement as any).enhanced = enhanced;
        
        return errorWithEnhancement;
      }

      // 従来のロジック（後方互換性のため維持）
      let backendMessage = '';
      if (data) {
        // error フィールドを優先（Go backendの標準形式）
        if (typeof data === 'object' && 'error' in data && data.error) {
          backendMessage = data.error;
        } 
        // message フィールドも確認
        else if (typeof data === 'object' && 'message' in data && data.message) {
          backendMessage = data.message;
        }
      }
      
      // 401エラー（認証エラー）の場合はインターセプターで処理するのでここでは特別処理しない
      // レスポンスインターセプターで自動的にトークン更新またはリダイレクトが行われる
      if (status === 401) {
        return new Error('認証エラー: セッションの有効期限が切れました。再度ログインしてください。');
      }
      
      // バックエンドメッセージがある場合はそれを使用、ない場合はデフォルトメッセージ
      if (backendMessage) {
        return new Error(backendMessage);
      }
      
      // ステータスコードに基づくデフォルトメッセージ
      switch (status) {
        case 400:
          return new Error(`${resourceName}のリクエストが不正です`);
        case 403:
          return new Error(`${resourceName}へのアクセスが拒否されました`);
        case 404:
          return new Error(`${resourceName}が見つかりません`);
        case 500:
          return new Error(`サーバーエラーが発生しました`);
        default:
          return new Error(`${resourceName}の処理に失敗しました`);
      }
    } else if (axiosError.request) {
      // リクエストは送信されたがレスポンスがない場合
      return new Error(`${resourceName}の取得に失敗しました: サーバーからの応答がありません`);
    }
  }
  
  // その他のエラー
  const errorMessage = error instanceof Error ? error.message : '不明なエラー';
  return new Error(`${resourceName}の取得に失敗しました: ${errorMessage}`);
};

/**
 * 従来のAPIエラーハンドリング（後方互換性のため維持）
 * @param error エラーオブジェクト
 * @param resourceName リソース名
 * @returns エラーメッセージを含むErrorオブジェクト
 */
export const handleApiErrorLegacy = (error: unknown, resourceName: string): Error => {
  return handleApiError(error, resourceName, { enableCodeMapping: false });
}; 