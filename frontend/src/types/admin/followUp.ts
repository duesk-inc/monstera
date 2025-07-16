// フォローアップ対象ユーザー
export interface FollowUpUser {
  id: string;
  user_id: string;
  user_name: string;
  email: string;
  user_email?: string; // emailのエイリアス
  phone?: string;
  department?: string;
  issue_type: string;
  issue_description: string;
  follow_up_reason?: string; // フォローアップ理由
  days_since_last_report?: number; // 最終レポートからの日数
  last_report_date?: string; // 最終レポート日
  last_follow_up_date?: string; // 最終フォローアップ日
  last_contact_date?: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at: string;
}