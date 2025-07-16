import { adminGet, adminPost, adminPut, adminDelete } from './index';
import {
  AlertSettings,
  CreateAlertSettingsRequest,
  UpdateAlertSettingsRequest,
  AlertHistory,
  AlertFilters,
  AlertSummary,
  UpdateAlertStatusRequest,
  AlertSettingsListResponse,
  AlertHistoryListResponse,
} from '@/types/admin/alert';

// アラート設定API
export const alertApi = {
  // アラート設定一覧取得
  getAlertSettings: async (page = 1, limit = 20): Promise<AlertSettingsListResponse> => {
    return adminGet<AlertSettingsListResponse>('/alert-settings', { page, limit });
  },

  // アラート設定詳細取得
  getAlertSettingById: async (id: string): Promise<AlertSettings> => {
    return adminGet<AlertSettings>(`/alert-settings/${id}`);
  },

  // 現在のアラート設定取得（システム全体で1つ）
  getCurrentAlertSettings: async (): Promise<AlertSettings> => {
    return adminGet<AlertSettings>('/alert-settings/current');
  },

  // アラート設定作成
  createAlertSettings: async (data: CreateAlertSettingsRequest): Promise<AlertSettings> => {
    return adminPost<AlertSettings>('/alert-settings', data);
  },

  // アラート設定更新
  updateAlertSettings: async (
    id: string,
    data: UpdateAlertSettingsRequest
  ): Promise<AlertSettings> => {
    return adminPut<AlertSettings>(`/alert-settings/${id}`, data);
  },

  // アラート設定削除
  deleteAlertSettings: async (id: string): Promise<void> => {
    return adminDelete<void>(`/alert-settings/${id}`);
  },

  // アラート履歴一覧取得
  getAlertHistories: async (
    filters: AlertFilters = {},
    page = 1,
    limit = 20
  ): Promise<AlertHistoryListResponse> => {
    return adminGet<AlertHistoryListResponse>('/alert-histories', {
      ...filters,
      page,
      limit,
    });
  },

  // アラート履歴詳細取得
  getAlertHistoryById: async (id: string): Promise<AlertHistory> => {
    return adminGet<AlertHistory>(`/alert-histories/${id}`);
  },

  // アラートステータス更新
  updateAlertStatus: async (
    id: string,
    data: UpdateAlertStatusRequest
  ): Promise<void> => {
    return adminPut<void>(`/alert-histories/${id}/status`, data);
  },

  // アラートサマリー取得
  getAlertSummary: async (): Promise<AlertSummary> => {
    return adminGet<AlertSummary>('/alerts/summary');
  },
};