import { getAuthClient } from '@/lib/api';
import { 
  UserNotificationListResponse,
  UserNotificationList,
  NotificationType,
  UserNotificationResponse,
  NotificationSettingResponse,
  NotificationSetting,
  NotificationSettingsListResponse,
  NotificationSettingsList,
  MarkAsReadRequest,
  UpdateNotificationSettingRequest,
  NotificationCondition,
  SlackSettings
} from '@/types/notification';
import { handleApiError, AbortError } from './error';
import { logDev, errorDev } from '@/lib/utils/logger';
import { NOTIFICATION_API } from '@/constants/api';
import { convertSnakeToCamel } from '@/utils/apiUtils';

// 型定義を再エクスポート
export type {
  UserNotificationListResponse,
  UserNotificationList,
  NotificationType,
  UserNotificationResponse,
  NotificationSettingResponse,
  NotificationSetting,
  NotificationSettingsListResponse,
  NotificationSettingsList,
  MarkAsReadRequest,
  UpdateNotificationSettingRequest,
  NotificationCondition,
  SlackSettings
};

/**
 * ユーザーの通知一覧を取得
 * @param limit 取得件数
 * @param offset オフセット
 * @param signal AbortSignal
 * @returns 通知一覧レスポンス
 */
export const getUserNotifications = async (
  limit: number = 10,
  offset: number = 0,
  signal?: AbortSignal
): Promise<UserNotificationList> => {
  const client = getAuthClient();
  try {
    logDev('通知一覧取得 - リクエスト送信', { limit, offset });
    const options = {
      params: { limit, offset },
      signal,
      timeout: 20000
    };
    const response = await client.get(NOTIFICATION_API.LIST, options);
    logDev('通知一覧取得 - レスポンス受信:', response.data);
    return convertSnakeToCamel<UserNotificationList>(response.data);
  } catch (error: unknown) {
    const handledError = handleApiError(error, '通知一覧');
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    errorDev('通知一覧取得エラー:', error);
    throw handledError;
  }
};

/**
 * 通知を既読にする
 * @param notificationIds 既読にする通知IDの配列
 * @param signal AbortSignal
 */
export const markNotificationsAsRead = async (notificationIds: string[], signal?: AbortSignal): Promise<void> => {
  const client = getAuthClient();
  try {
    logDev('通知既読化 - リクエスト送信', { notificationIds });
    const options = {
      signal,
      timeout: 20000
    };
    const requestData: MarkAsReadRequest = {
      notification_ids: notificationIds
    };
    await client.put(NOTIFICATION_API.MARK_AS_READ, requestData, options);
    logDev('通知既読化 - 完了');
  } catch (error: unknown) {
    const handledError = handleApiError(error, '通知既読化');
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    errorDev('通知既読化エラー:', error);
    throw handledError;
  }
};

/**
 * 通知設定を取得する
 * @param signal AbortSignal
 * @returns 通知設定レスポンス
 */
export const getNotificationSettings = async (signal?: AbortSignal): Promise<NotificationSettingsList> => {
  const client = getAuthClient();
  try {
    logDev('通知設定取得 - リクエスト送信');
    const options = {
      signal,
      timeout: 20000
    };
    const response = await client.get(NOTIFICATION_API.SETTINGS, options);
    logDev('通知設定取得 - レスポンス受信:', response.data);
    return convertSnakeToCamel<NotificationSettingsList>(response.data);
  } catch (error: unknown) {
    const handledError = handleApiError(error, '通知設定取得');
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    errorDev('通知設定取得エラー:', error);
    throw handledError;
  }
};

/**
 * 通知設定を更新する（拡張版）
 * @param request 通知設定更新リクエスト
 * @param signal AbortSignal
 * @returns 更新された通知設定
 */
export const updateNotificationSetting = async (
  request: UpdateNotificationSettingRequest,
  signal?: AbortSignal
): Promise<NotificationSetting> => {
  const client = getAuthClient();
  try {
    logDev('通知設定更新 - リクエスト送信', request);
    const options = {
      signal,
      timeout: 20000
    };
    const response = await client.put(NOTIFICATION_API.UPDATE_SETTINGS, request, options);
    logDev('通知設定更新 - レスポンス受信:', response.data);
    return convertSnakeToCamel<NotificationSetting>(response.data);
  } catch (error: unknown) {
    const handledError = handleApiError(error, '通知設定更新');
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    errorDev('通知設定更新エラー:', error);
    throw handledError;
  }
};

/**
 * 通知設定を更新する（シンプル版 - 後方互換性のため）
 * @param notificationType 通知タイプ
 * @param isEnabled 有効フラグ
 * @param emailEnabled メール通知フラグ
 * @param signal AbortSignal
 * @returns 更新された通知設定
 */
export const updateBasicNotificationSetting = async (
  notificationType: string,
  isEnabled: boolean,
  emailEnabled: boolean,
  signal?: AbortSignal
): Promise<NotificationSetting> => {
  return updateNotificationSetting({
    notification_type: notificationType as NotificationType,
    is_enabled: isEnabled,
    email_enabled: emailEnabled
  }, signal);
};

/**
 * Slack設定を取得する
 * @param signal AbortSignal
 * @returns Slack設定
 */
export const getSlackSettings = async (signal?: AbortSignal): Promise<SlackSettings> => {
  const client = getAuthClient();
  try {
    logDev('Slack設定取得 - リクエスト送信');
    const options = {
      signal,
      timeout: 20000
    };
    const response = await client.get(NOTIFICATION_API.SLACK_SETTINGS, options);
    logDev('Slack設定取得 - レスポンス受信:', response.data);
    return convertSnakeToCamel<SlackSettings>(response.data);
  } catch (error: unknown) {
    const handledError = handleApiError(error, 'Slack設定取得');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    errorDev('Slack設定取得エラー:', error);
    throw handledError;
  }
};

/**
 * Slack設定を更新する
 * @param settings Slack設定
 * @param signal AbortSignal
 * @returns 更新されたSlack設定
 */
export const updateSlackSettings = async (
  settings: SlackSettings,
  signal?: AbortSignal
): Promise<SlackSettings> => {
  const client = getAuthClient();
  try {
    logDev('Slack設定更新 - リクエスト送信', settings);
    const options = {
      signal,
      timeout: 20000
    };
    const response = await client.put(NOTIFICATION_API.SLACK_SETTINGS, settings, options);
    logDev('Slack設定更新 - レスポンス受信:', response.data);
    return convertSnakeToCamel<SlackSettings>(response.data);
  } catch (error: unknown) {
    const handledError = handleApiError(error, 'Slack設定更新');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    errorDev('Slack設定更新エラー:', error);
    throw handledError;
  }
};

/**
 * Slack接続をテストする
 * @param webhookUrl WebhookURL
 * @param signal AbortSignal
 * @returns テスト結果
 */
export const testSlackConnection = async (
  webhookUrl: string,
  signal?: AbortSignal
): Promise<{ success: boolean; message: string }> => {
  const client = getAuthClient();
  try {
    logDev('Slack接続テスト - リクエスト送信', { webhookUrl });
    const options = {
      signal,
      timeout: 30000 // Slack接続テストは少し長めのタイムアウト
    };
    const response = await client.post(NOTIFICATION_API.SLACK_TEST, {
      webhook_url: webhookUrl
    }, options);
    logDev('Slack接続テスト - レスポンス受信:', response.data);
    return response.data;
  } catch (error: unknown) {
    const handledError = handleApiError(error, 'Slack接続テスト');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    errorDev('Slack接続テストエラー:', error);
    throw handledError;
  }
}; 