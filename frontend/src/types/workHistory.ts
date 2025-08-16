/**
 * 職務経歴関連の型定義
 */

/**
 * 職務経歴基本型
 */
export interface WorkHistory {
  id: string
  user_id: string
  profile_id: string
  project_name: string
  start_date: string
  end_date?: string | null
  industry: number
  industry_name?: string
  project_overview?: string
  responsibilities?: string
  achievements?: string
  notes?: string
  team_size?: number
  role: string
  duration_months?: number
  created_at: string
  updated_at: string
  
  // 関連データ
  technology_items?: WorkHistoryTechnology[]
  processes?: number[]
}

/**
 * 職務経歴技術項目
 */
export interface WorkHistoryTechnology {
  id: string
  work_history_id: string
  category_id: string
  category_name?: string
  category_display_name?: string
  technology_name: string
  technology_display_name?: string
  sort_order?: number
}

/**
 * 職務経歴作成リクエスト
 */
export interface WorkHistoryCreateRequest {
  user_id: string
  profile_id: string
  project_name: string
  start_date: string
  end_date?: string | null
  industry: number
  company_name?: string | null
  project_overview?: string | null
  responsibilities?: string | null
  achievements?: string | null
  remarks?: string | null
  team_size?: number | null
  role: string
  processes?: string[]
  technologies?: WorkHistoryTechnologyRequest[]
}

/**
 * 職務経歴更新リクエスト
 */
export interface WorkHistoryUpdateRequest {
  project_name?: string | null
  start_date?: string | null
  end_date?: string | null
  industry?: number | null
  company_name?: string | null
  project_overview?: string | null
  responsibilities?: string | null
  achievements?: string | null
  remarks?: string | null
  team_size?: number | null
  role?: string | null
  processes?: string[]
  technologies?: WorkHistoryTechnologyRequest[]
}

/**
 * 職務経歴技術項目リクエスト
 */
export interface WorkHistoryTechnologyRequest {
  category_id: string
  technology_name: string
}

/**
 * 職務経歴一覧レスポンス
 */
export interface WorkHistoryListResponse {
  work_histories: WorkHistory[]
  total: number
  page: number
  limit: number
  user_id?: string
  has_next?: boolean
}

/**
 * 職務経歴サマリー
 */
export interface WorkHistorySummary {
  user_id: string
  user_name?: string
  user_email?: string
  
  // IT経験総計
  total_it_experience_months: number
  it_experience_years: number
  it_experience_months: number
  it_experience_text: string
  it_experience_level: string
  
  // プロジェクト統計
  total_project_count: number
  active_project_count: number
  first_project_date?: string | null
  last_project_date?: string | null
  latest_project_name?: string | null
  latest_role?: string | null
  
  // 技術統計
  total_technology_count: number
  recent_technology_count: number
  top_technologies: string[]
  
  calculated_at: string
}

/**
 * 技術スキル経験
 */
export interface TechnologySkillExperience {
  technology_name: string
  technology_display_name?: string | null
  category_name: string
  category_display_name: string
  total_experience_months: number
  experience_years: number
  experience_months: number
  experience_text: string
  project_count: number
  first_used_date: string
  last_used_date: string
  is_recently_used: boolean
  skill_level: string
}

/**
 * 業種マスタ
 */
export const INDUSTRIES = {
  1: '金融',
  2: '製造',
  3: 'IT・通信',
  4: '小売',
  5: 'サービス',
  6: '公共',
  7: 'その他'
} as const

export type IndustryCode = keyof typeof INDUSTRIES

/**
 * プロセス（工程）マスタ
 */
export const PROCESSES = {
  1: '要件定義',
  2: '基本設計',
  3: '詳細設計',
  4: '実装',
  5: 'テスト',
  6: '運用・保守',
  7: 'プロジェクト管理',
  8: 'その他'
} as const

export type ProcessCode = keyof typeof PROCESSES

/**
 * 職務経歴のステータス
 */
export type WorkHistoryStatus = 'draft' | 'active' | 'completed' | 'archived'

/**
 * 職務経歴フォームデータ
 * （フロントエンドのフォーム用）
 */
export interface WorkHistoryFormData {
  projectName: string
  startDate: Date | string
  endDate?: Date | string | null
  industry: number
  companyName?: string
  projectOverview?: string
  responsibilities?: string
  achievements?: string
  remarks?: string
  teamSize?: number
  role: string
  processes: number[]
  technologies: {
    categoryId: string
    name: string
  }[]
}

/**
 * 職務経歴の検索条件
 */
export interface WorkHistorySearchParams {
  keyword?: string
  technologies?: string[]
  role?: string
  industry?: number
  startDateFrom?: string
  startDateTo?: string
  endDateFrom?: string
  endDateTo?: string
  minDurationMonths?: number
  maxDurationMonths?: number
  minTeamSize?: number
  maxTeamSize?: number
  isActive?: boolean
  page?: number
  limit?: number
  sortBy?: 'start_date' | 'end_date' | 'project_name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

/**
 * エクスポート形式
 */
export type ExportFormat = 'pdf' | 'excel' | 'word'

/**
 * エクスポートレスポンス
 */
export interface ExportResponse {
  download_url: string
  file_name: string
  file_size?: number
  expires_at: string
  generated_at?: string
}