import apiClient from '@/lib/axios';

export interface UnreadCountResponse {
  count: number;
}

export const notificationApi = {
  // 未読通知数を取得
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<UnreadCountResponse>('/api/v1/notifications/unread-count');
    return response.data.count || 0;
  },
};