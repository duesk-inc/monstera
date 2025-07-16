// エンジニア管理関連の型定義

// エンジニア基本情報
export interface Engineer {
  id: string;
  employeeNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  firstNameKana?: string;
  lastNameKana?: string;
  sei: string;
  mei: string;
  seiKana?: string;
  meiKana?: string;
  department?: string;
  position?: string;
  hireDate?: string; // YYYY-MM-DD形式
  education?: string;
  phoneNumber?: string;
  engineerStatus: EngineerStatus;
  departmentId?: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

// エンジニア詳細情報（APIレスポンス用）
export interface EngineerDetail {
  user: Engineer;
  statusHistory: EngineerStatusHistory[];
  skills: EngineerSkill[];
  projectHistory: EngineerProjectHistory[];
}

// エンジニアサマリー（一覧表示用）
export interface EngineerSummary {
  id: string;
  employeeNumber: string;
  email: string;
  fullName: string;
  fullNameKana: string;
  department?: string;
  position?: string;
  engineerStatus: EngineerStatus;
  hireDate?: string;
  createdAt: string;
  updatedAt: string;
}

// エンジニアステータス履歴
export interface EngineerStatusHistory {
  id: string;
  userId: string;
  previousStatus?: EngineerStatus;
  newStatus: EngineerStatus;
  reason: string;
  changedBy: string;
  changedAt: string;
  createdAt: string;
  // リレーション
  user?: Engineer;
  changedByUser?: Engineer;
}

// エンジニアスキル
export interface EngineerSkill {
  id: string;
  userId: string;
  skillCategoryId: string;
  skillName: string;
  skillLevel: SkillLevel;
  experience?: string;
  lastUsedDate?: string;
  createdAt: string;
  updatedAt: string;
  // リレーション
  skillCategory?: EngineerSkillCategory;
}

// スキルカテゴリ
export interface EngineerSkillCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // リレーション
  parent?: EngineerSkillCategory;
  children?: EngineerSkillCategory[];
}

// プロジェクト履歴
export interface EngineerProjectHistory {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  startDate: string;
  endDate?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // リレーション
  project?: Project;
}

// プロジェクト（簡易版）
export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: string;
}

// エンジニア作成リクエスト
export interface CreateEngineerRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  firstNameKana?: string;
  lastNameKana?: string;
  sei: string;
  mei: string;
  seiKana?: string;
  meiKana?: string;
  department?: string;
  position?: string;
  hireDate?: string;
  education?: string;
  phoneNumber?: string;
  departmentId?: string;
  managerId?: string;
}

// エンジニア更新リクエスト
export interface UpdateEngineerRequest {
  firstName?: string;
  lastName?: string;
  firstNameKana?: string;
  lastNameKana?: string;
  sei?: string;
  mei?: string;
  seiKana?: string;
  meiKana?: string;
  department?: string;
  position?: string;
  hireDate?: string;
  education?: string;
  phoneNumber?: string;
  email?: string;
  departmentId?: string;
  managerId?: string;
}

// エンジニアステータス更新リクエスト
export interface UpdateEngineerStatusRequest {
  status: EngineerStatus;
  reason: string;
}

// エンジニア一覧取得パラメータ
export interface GetEngineersParams {
  page?: number;
  limit?: number;
  keyword?: string;
  departmentId?: string;
  engineerStatus?: EngineerStatus;
  projectId?: string;
  skillIds?: string[];
  orderBy?: EngineerSortField;
  order?: SortOrder;
}

// エンジニア一覧レスポンス
export interface GetEngineersResponse {
  engineers: EngineerSummary[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// スキル追加リクエスト
export interface AddSkillRequest {
  skillCategoryId: string;
  skillName: string;
  skillLevel: SkillLevel;
  experience?: string;
  lastUsedDate?: string;
}

// スキル更新リクエスト
export interface UpdateSkillRequest {
  skillName?: string;
  skillLevel?: SkillLevel;
  experience?: string;
  lastUsedDate?: string;
}

// プロジェクト履歴追加リクエスト
export interface AddProjectHistoryRequest {
  projectId: string;
  role: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

// プロジェクト履歴更新リクエスト
export interface UpdateProjectHistoryRequest {
  role?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

// CSVインポート結果
export interface ImportResult {
  totalRecords: number;
  successCount: number;
  errorCount: number;
  successRecords: ImportSuccessRecord[];
  errorRecords: ImportErrorRecord[];
  validationErrors: ValidationError[];
}

// インポート成功レコード
export interface ImportSuccessRecord {
  rowNumber: number;
  employeeNumber: string;
  email: string;
  fullName: string;
}

// インポートエラーレコード
export interface ImportErrorRecord {
  rowNumber: number;
  email: string;
  errors: string[];
}

// バリデーションエラー
export interface ValidationError {
  rowNumber: number;
  field: string;
  value: string;
  message: string;
}

// CSVエクスポートオプション
export interface ExportOptions {
  departmentId?: string;
  engineerStatus?: EngineerStatus;
  projectId?: string;
  includeSkills?: boolean;
  includeProjects?: boolean;
  includeStatusHistory?: boolean;
}

// フォームデータ（React Hook Form用）
export interface EngineerFormData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  lastNameKana: string;
  sei: string;
  mei: string;
  seiKana: string;
  meiKana: string;
  department: string;
  position: string;
  hireDate: string;
  education: string;
  phoneNumber: string;
  departmentId: string;
  managerId: string;
}

// フィルター状態
export interface EngineerFilters {
  keyword: string;
  departmentId: string;
  engineerStatus: EngineerStatus | '';
  projectId: string;
  skillIds: string[];
}

// ソート状態
export interface EngineerSort {
  field: EngineerSortField;
  order: SortOrder;
}

// ページネーション状態
export interface EngineerPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// エンジニア管理の状態
export interface EngineerState {
  engineers: EngineerSummary[];
  currentEngineer: EngineerDetail | null;
  filters: EngineerFilters;
  sort: EngineerSort;
  pagination: EngineerPagination;
  loading: boolean;
  error: string | null;
}

// ENUM型の定義

// エンジニアステータス
export enum EngineerStatus {
  ACTIVE = 'active',
  STANDBY = 'standby',
  RESIGNED = 'resigned',
  LONG_LEAVE = 'long_leave'
}

// スキルレベル
export enum SkillLevel {
  BEGINNER = 1,
  BASIC = 2,
  INTERMEDIATE = 3,
  ADVANCED = 4,
  EXPERT = 5
}

// ソート項目
export enum EngineerSortField {
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  EMPLOYEE_NUMBER = 'employee_number',
  NAME = 'name'
}

// ソート順
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

// 型ガード関数

export const isEngineerStatus = (value: string): value is EngineerStatus => {
  return Object.values(EngineerStatus).includes(value as EngineerStatus);
};

export const isSkillLevel = (value: number): value is SkillLevel => {
  return value >= 1 && value <= 5 && Number.isInteger(value);
};

export const isEngineerSortField = (value: string): value is EngineerSortField => {
  return Object.values(EngineerSortField).includes(value as EngineerSortField);
};

export const isSortOrder = (value: string): value is SortOrder => {
  return Object.values(SortOrder).includes(value as SortOrder);
};

// デフォルト値

export const DEFAULT_ENGINEER_FILTERS: EngineerFilters = {
  keyword: '',
  departmentId: '',
  engineerStatus: '',
  projectId: '',
  skillIds: []
};

export const DEFAULT_ENGINEER_SORT: EngineerSort = {
  field: EngineerSortField.CREATED_AT,
  order: SortOrder.DESC
};

export const DEFAULT_ENGINEER_PAGINATION: EngineerPagination = {
  page: 1,
  limit: 20,
  total: 0,
  pages: 0
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeSkills: false,
  includeProjects: false,
  includeStatusHistory: false
};

// バリデーション関連

export interface EngineerValidationRules {
  email: {
    required: boolean;
    pattern: RegExp;
  };
  password: {
    required: boolean;
    minLength: number;
  };
  firstName: {
    required: boolean;
    maxLength: number;
  };
  lastName: {
    required: boolean;
    maxLength: number;
  };
  sei: {
    required: boolean;
    maxLength: number;
  };
  mei: {
    required: boolean;
    maxLength: number;
  };
  phoneNumber: {
    pattern: RegExp;
  };
  employeeNumber: {
    pattern: RegExp;
  };
}

// APIエラーレスポンス（共通）
export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string>;
}

// API成功レスポンス（共通）
export interface ApiResponse<T> {
  data?: T;
  message?: string;
}

// レスポンス型のエイリアス
export type EngineerListResponse = GetEngineersResponse;
export type EngineerDetailResponse = EngineerDetail;
export type EngineerCreateResponse = Engineer;
export type EngineerUpdateResponse = Engineer;
export type EngineerDeleteResponse = { message: string };
export type EngineerStatusUpdateResponse = { message: string };
export type ImportResponse = ImportResult;