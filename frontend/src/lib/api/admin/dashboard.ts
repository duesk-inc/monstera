import { adminGet } from './index';
import { AdminDashboardData } from '@/types/admin/dashboard';

export const adminDashboardApi = {
  /**
   * ダッシュボードデータを取得
   */
  getDashboardData: async (): Promise<AdminDashboardData> => {
    return adminGet<AdminDashboardData>('/dashboard');
  },
  
  // 互換性のためのエイリアス
  getDashboard: async () => {
    return { data: await adminGet<AdminDashboardData>('/dashboard') };
  },
};