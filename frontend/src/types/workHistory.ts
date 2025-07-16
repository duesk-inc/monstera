/**
 * 職務経歴関連の型定義
 * バックエンドAPIとの型統合を含む
 */

// 基本的な期間表現の型定義
export interface DurationInfo {
  years: number;
  months: number;
  totalMonths: number;
  text?: string; // "1年6ヶ月" 形式
}

// 技術情報の型定義
export interface TechnologyInfo {
  id?: string;
  categoryId: string;
  categoryName: string;
  categoryDisplayName: string;
  technologyName: string;
  technologyDisplayName?: string;
  sortOrder?: number;
}

/**
 * 職務経歴項目の型定義（バックエンドAPI統合版）
 */
export interface WorkHistoryItem {
  id?: string;
  userId?: string;
  profileId?: string;
  projectName: string;
  startDate: string;
  endDate?: string | null;
  
  // 期間計算情報
  duration?: DurationInfo;
  durationMonths?: number;
  durationText?: string;
  isActive?: boolean;
  
  // 業界・会社情報
  industry: number;
  industryName?: string;
  companyName?: string;
  
  // プロジェクト詳細
  projectOverview: string;
  responsibilities: string;
  achievements?: string;
  notes?: string; // remarks
  
  // チーム・役割情報
  teamSize: number;
  role: string;
  
  // 工程情報
  processes: number[];
  processNames?: string[];
  
  // 技術情報（新形式）
  technologies?: TechnologyInfo[];
  
  // 技術情報（従来形式 - 後方互換性）
  programmingLanguages?: string[];
  serversDatabases?: string[];
  tools?: string[];
  
  // タイムスタンプ
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 技術スキル経験の型定義
 */
export interface TechnologySkillExperience {
  technologyName: string;
  categoryName: string;
  experienceMonths: number;
  experienceText: string;
  level: string; // 初級/ミドル/シニア/エキスパート
  projectCount: number;
  firstUsedDate?: string;
  lastUsedDate?: string;
  isRecent?: boolean;
}

/**
 * 技術スキルカテゴリの型定義
 */
export interface TechnicalSkillCategory {
  categoryName: string;
  categoryDisplayName: string;
  technologies: TechnologySkillExperience[];
  totalExperienceMonths: number;
  totalExperienceText: string;
  topTechnologies: string[];
}

/**
 * 技術マスターデータの型定義
 */
export interface TechnologyMasterData {
  id: number;
  name: string;
  displayName: string;
  category?: string; // programmingLanguages, serversDatabases, tools
  isActive?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * IT経験年数の型定義
 */
export interface ITExperience {
  totalMonths: number;
  years: number;
  months: number;
  text: string;
  level?: string; // 初級/ミドル/シニア/エキスパート
  calculatedAt?: string;
}

/**
 * 職務経歴サマリーの型定義
 */
export interface WorkHistorySummary {
  userId: string;
  userName?: string;
  userEmail?: string;
  
  // IT経験総計
  totalItExperienceMonths: number;
  itExperienceYears: number;
  itExperienceMonths: number;
  itExperienceText: string;
  itExperienceLevel?: string;
  
  // プロジェクト統計
  totalProjectCount: number;
  activeProjectCount: number;
  firstProjectDate?: string;
  lastProjectDate?: string;
  latestProjectName?: string;
  latestRole?: string;
  
  // 技術統計
  totalTechnologyCount: number;
  recentTechnologyCount: number;
  topTechnologies: string[];
  
  calculatedAt?: string;
}

/**
 * 職務経歴情報の型定義（レスポンス統合版）
 */
export interface WorkHistoryData {
  // 基本情報
  id?: string;
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  firstNameKana?: string;
  lastNameKana?: string;
  projectName?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  
  // 業界・会社情報
  industry?: number | null;
  industryName?: string;
  companyName?: string;
  
  // プロジェクト詳細
  projectOverview?: string;
  responsibilities?: string;
  achievements?: string;
  notes?: string;
  
  // チーム・役割情報
  teamSize?: number | null;
  role?: string;
  
  // 工程情報
  processes?: number[];
  processNames?: string[];
  
  // 技術情報
  programmingLanguages?: string[];
  serversDatabases?: string[];
  tools?: string[];
  
  // サマリー情報
  summary?: WorkHistorySummary;
  itExperience?: ITExperience;
  
  // 職務経歴一覧
  workHistories?: WorkHistoryItem[];
  
  // 技術スキル情報
  technicalSkills?: TechnicalSkillCategory[];
  technologySkills?: TechnologySkillExperience[];
  
  // ページネーション
  total?: number;
  page?: number;
  limit?: number;
  hasNext?: boolean;
  
  // メタデータ
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 職務経歴フォームデータの型定義
 */
export interface WorkHistoryFormData {
  // 基本情報
  projectName: string;
  startDate: Date | null;
  endDate: Date | null;
  
  // 業界・会社情報
  industry: number | null;
  companyName?: string;
  
  // プロジェクト詳細
  projectOverview: string;
  responsibilities: string;
  achievements?: string;
  notes?: string;
  
  // チーム・役割情報
  teamSize: number | null;
  role: string;
  
  // 工程情報
  processes: number[];
  
  // 技術情報
  programmingLanguages: string[];
  serversDatabases: string[];
  tools: string[];
}

/**
 * 技術候補の型定義
 */
export interface TechnologySuggestion {
  technologyName: string;
  technologyDisplayName?: string;
  categoryName: string;
  categoryDisplayName: string;
  usageCount?: number;
  isPopular?: boolean;
  matchScore?: number;
}

/**
 * 技術候補レスポンスの型定義
 */
export interface TechnologySuggestionsResponse {
  suggestions: TechnologySuggestion[];
  programmingLanguages?: string[];
  serversDatabases?: string[];
  tools?: string[];
}

/**
 * 技術候補検索リクエストの型定義
 */
export interface TechnologySuggestionRequest {
  query: string;
  categoryName?: string;
  limit?: number;
  includePopular?: boolean;
}

/**
 * 職務経歴作成リクエストの型定義
 */
export interface WorkHistoryCreateRequest {
  projectName: string;
  startDate: string;
  endDate?: string;
  industry: string | number;
  companyName?: string;
  projectOverview?: string;
  responsibilities?: string;
  achievements?: string;
  remarks?: string; // notesの代わり
  teamSize?: number;
  role: string;
  processes: string[];
  technologies: TechnologyRequestItem[];
}

/**
 * 職務経歴更新リクエストの型定義
 */
export interface WorkHistoryUpdateRequest extends WorkHistoryCreateRequest {}

/**
 * 職務経歴一時保存リクエストの型定義
 */
export interface WorkHistoryTempSaveRequest {
  tempId?: string;
  data: Partial<WorkHistoryFormData>;
  metadata?: {
    step?: number;
    totalSteps?: number;
    lastModified?: string;
    deviceInfo?: string;
  };
}

/**
 * 技術リクエスト項目の型定義
 */
export interface TechnologyRequestItem {
  categoryName: string;
  technologyName: string;
  technologyDisplayName?: string;
}

/**
 * 職務経歴検索パラメータの型定義
 */
export interface WorkHistorySearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  industry?: number[];
  technologies?: string[];
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  isActive?: boolean;
}

/**
 * 職務経歴一覧パラメータの型定義
 */
export interface WorkHistoryListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 職務経歴一覧レスポンスの型定義
 */
export interface WorkHistoryListResponse {
  items: WorkHistoryItem[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

/**
 * PDF出力パラメータの型定義
 */
export interface PDFExportParams {
  includePersonalInfo?: boolean;
  includeProjects?: boolean;
  includeSkills?: boolean;
  includeSummary?: boolean;
  dateFormat?: string;
  startDate?: string;
  endDate?: string;
  userId?: string; // 管理者用
}

/**
 * PDF生成リクエストの型定義
 */
export interface WorkHistoryPDFGenerateRequest {
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  language?: 'ja' | 'en';
}

/**
 * PDF生成レスポンスの型定義
 */
export interface WorkHistoryPDFResponse {
  url?: string;
  expiresAt?: string;
  fileName?: string;
}

/**
 * 業種マスターデータの型定義
 */
export interface IndustryMasterData {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  sortOrder?: number;
  isActive: boolean;
}

/**
 * 工程マスターデータの型定義
 */
export interface ProcessMasterData {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  sortOrder?: number;
  isActive: boolean;
}

/**
 * APIレスポンスの型定義（共通）
 */
export interface WorkHistoryApiResponse<T = unknown> {
  data: T;
  message?: string;
  errors?: string[];
}

/**
 * エラーレスポンスの型定義
 */
export interface WorkHistoryErrorResponse {
  error: string;
  errors?: string[];
  code?: string;
}

/**
 * 共通APIレスポンスの型定義
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 検索パラメータの型定義
 */
export interface WorkHistorySearchParams {
  search?: string;
  industry?: number[];
  technologies?: string[];
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * マスターデータの基本型
 */
export interface TechnologyCategory {
  id: string;
  name: string;
  displayName: string;
}

export interface Industry {
  id: number;
  name: string;
  displayName: string;
}

export interface Process {
  id: number;
  name: string;
  displayName: string;
}

export interface TechnologyMaster {
  id: number;
  name: string;
  displayName: string;
  categoryId?: string;
}

/**
 * 技術経験情報の型定義（TechnologySkillSummary用）
 */
export interface TechnologyExperience {
  name: string;
  years: number;
  months: number;
  category: 'programmingLanguages' | 'serversDatabases' | 'tools';
}