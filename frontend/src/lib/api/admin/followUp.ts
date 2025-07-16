import { adminApi } from './index';
import { FollowUpUser } from '@/types/admin/followUp';

interface GetFollowUpUsersParams {
  page?: number;
  limit?: number;
  type?: string;
}

interface GetFollowUpUsersResponse {
  users: FollowUpUser[];
  total: number;
}

interface MarkAsFollowedUpResponse {
  success: boolean;
  message: string;
}

export const adminFollowUpApi = {
  // フォローアップ対象ユーザー一覧取得
  getFollowUpUsers: async (params?: GetFollowUpUsersParams): Promise<GetFollowUpUsersResponse> => {
    return adminApi.get<GetFollowUpUsersResponse>('/follow-up/users', params);
  },

  // フォローアップ完了マーク
  markAsFollowedUp: async (userId: string, followUpDate: string): Promise<MarkAsFollowedUpResponse> => {
    return adminApi.post<MarkAsFollowedUpResponse>(`/follow-up/users/${userId}/mark`, {
      follow_up_date: followUpDate,
    });
  },
};