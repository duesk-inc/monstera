// 管理者営業関連の型定義

export interface SalesActivity {
  id: string;
  client_id: string;
  client_name: string;
  project_id?: string;
  project_name?: string;
  user_id: string;
  user_name: string;
  activity_type: 'visit' | 'call' | 'email' | 'meeting' | 'proposal' | 'contract' | 'other';
  activity_date: string;
  title: string;
  description: string;
  next_action_date?: string;
  next_action_title: string;
  status: 'planned' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface SalesPipeline {
  id: string;
  client_id: string;
  client_name: string;
  project_name: string;
  stage: string;
  probability: number;
  expected_value: number;
  expected_date?: string;
  last_activity?: string;
  next_action: string;
  owner: string;
}

export interface PipelineStage {
  count: number;
  total_value: number;
  expected_value: number;
}

export interface SalesSummary {
  total_activities: number;
  completed_activities: number;
  planned_activities: number;
  overdue_activities: number;
  activity_by_type: Record<string, number>;
  activity_by_user: Record<string, number>;
  pipeline_stages: Record<string, PipelineStage>;
}

export interface ExtensionTarget {
  project_id: string;
  project_name: string;
  client_id: string;
  client_name: string;
  end_date?: string;
  days_remaining: number;
  assigned_users: string[];
  last_contact?: string;
  status: string;
}

export interface SalesTarget {
  id: string;
  user_id: string;
  user_name: string;
  target_month: string;
  target_amount: number;
  achieved_amount: number;
  achievement_rate: number;
  new_clients: number;
  target_new_clients: number;
}

// API レスポンス型
export interface SalesActivityListResponse {
  activities: SalesActivity[];
  total: number;
  page: number;
  limit: number;
}

export interface SalesActivityDetailResponse {
  activity: SalesActivity;
}

export interface SalesSummaryResponse {
  summary: SalesSummary;
}

export interface SalesPipelineResponse {
  pipeline: SalesPipeline[];
}

export interface ExtensionTargetsResponse {
  targets: ExtensionTarget[];
}

export interface SalesTargetsResponse {
  targets: SalesTarget[];
}

// API リクエスト型
export interface SalesActivityCreateRequest {
  client_id: string;
  project_id?: string;
  activity_type: 'visit' | 'call' | 'email' | 'meeting' | 'proposal' | 'contract' | 'other';
  activity_date: string;
  title: string;
  description: string;
  next_action_date?: string;
  next_action_title: string;
  status: 'planned' | 'completed' | 'cancelled';
}

export interface SalesActivityUpdateRequest {
  activity_type?: 'visit' | 'call' | 'email' | 'meeting' | 'proposal' | 'contract' | 'other';
  activity_date?: string;
  title?: string;
  description?: string;
  next_action_date?: string;
  next_action_title?: string;
  status?: 'planned' | 'completed' | 'cancelled';
}