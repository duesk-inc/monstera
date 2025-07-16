// 経理機能の型定義

import { ReactNode } from "react";

// ========== 基本型定義 ==========

/**
 * UUID型
 */
export type UUID = string;

/**
 * 日付文字列型（ISO 8601形式）
 */
export type DateString = string;

/**
 * 金額型（数値）
 */
export type Amount = number;

/**
 * 月次型（YYYY-MM形式）
 */
export type MonthString = string;

// ========== ステータス定義 ==========

/**
 * 請求ステータス
 */
export type BillingStatus =
  | "draft" // 下書き
  | "preview" // プレビュー
  | "processing" // 処理中
  | "completed" // 完了
  | "failed" // 失敗
  | "cancelled"; // キャンセル

/**
 * 請求書ステータス
 */
export type InvoiceStatus =
  | "draft" // 下書き
  | "sent" // 送付済み
  | "paid" // 支払済み
  | "overdue" // 支払期限超過
  | "cancelled"; // キャンセル

/**
 * 請求計算タイプ
 */
export type BillingCalculationType =
  | "fixed" // 固定
  | "variable_upper_lower" // 上下割
  | "variable_middle"; // 中間値

/**
 * スケジュールステータス
 */
export type ScheduleStatus =
  | "active" // アクティブ
  | "inactive" // 非アクティブ
  | "completed" // 完了
  | "failed"; // 失敗

/**
 * バッチジョブステータス
 */
export type BatchJobStatus =
  | "pending" // 待機中
  | "running" // 実行中
  | "completed" // 完了
  | "failed" // 失敗
  | "cancelled"; // キャンセル

/**
 * freee同期ステータス
 */
export type FreeSyncStatus =
  | "pending" // 待機中
  | "in_progress" // 進行中
  | "completed" // 完了
  | "failed"; // 失敗

/**
 * freee接続ステータス
 */
export type FreeConnectionStatus =
  | "connected" // 接続済み
  | "disconnected" // 未接続
  | "expired" // 期限切れ
  | "error"; // エラー

// ========== 基本エンティティ関連 ==========

/**
 * 取引先
 */
export interface Client {
  id: UUID;
  name: string;
  email?: string;
  address?: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: DateString;
  updatedAt: DateString;
}

/**
 * プロジェクト
 */
export interface Project {
  id: UUID;
  clientId: UUID;
  name: string;
  description?: string;
  status: string;
  startDate?: DateString;
  endDate?: DateString;
  isActive: boolean;
  createdAt: DateString;
  updatedAt: DateString;
}

// ========== プロジェクトグループ関連 ==========

/**
 * プロジェクトグループ
 */
export interface ProjectGroup {
  id: UUID;
  name: string;
  description?: string;
  billingCalculationType: BillingCalculationType;
  defaultHourlyRate?: Amount;
  upperLimitHours?: number;
  lowerLimitHours?: number;
  isActive: boolean;
  clientIds: UUID[];
  projectIds: UUID[];
  projects: ProjectGroupProject[];
  totalBillingAmount?: Amount;
  createdAt: DateString;
  updatedAt: DateString;
}

/**
 * プロジェクトグループに含まれるプロジェクト
 */
export interface ProjectGroupProject {
  id: UUID;
  projectId: UUID;
  projectName: string;
  unitPrice: Amount;
  isActive: boolean;
  joinedAt: DateString;
}

/**
 * プロジェクトグループ作成リクエスト
 */
export interface CreateProjectGroupRequest {
  name: string;
  description?: string;
  billingCalculationType: BillingCalculationType;
  defaultHourlyRate?: Amount;
  upperLimitHours?: number;
  lowerLimitHours?: number;
  isActive: boolean;
  clientIds: UUID[];
  projectIds: UUID[];
}

/**
 * プロジェクトグループ更新リクエスト
 */
export interface UpdateProjectGroupRequest {
  name?: string;
  description?: string;
  billingCalculationType?: BillingCalculationType;
  defaultHourlyRate?: Amount;
  upperLimitHours?: number;
  lowerLimitHours?: number;
  isActive?: boolean;
  clientIds?: UUID[];
  projectIds?: UUID[];
}

// ========== 請求処理関連 ==========

/**
 * 請求プレビュー
 */
export interface BillingPreview {
  clientId: UUID;
  clientName: string;
  month: MonthString;
  projectGroups: BillingPreviewProjectGroup[];
  individualProjects: BillingPreviewProject[];
  totalAmount: Amount;
  totalWorkHours: number;
  calculatedAt: DateString;
}

/**
 * 請求プレビュー - プロジェクトグループ
 */
export interface BillingPreviewProjectGroup {
  groupId: UUID;
  groupName: string;
  calculationType: BillingCalculationType;
  workHours: number;
  calculatedAmount: Amount;
  projects: BillingPreviewProject[];
}

/**
 * 請求プレビュー - プロジェクト
 */
export interface BillingPreviewProject {
  projectId: UUID;
  projectName: string;
  workHours: number;
  unitPrice: Amount;
  calculatedAmount: Amount;
  workRecords: BillingWorkRecord[];
}

/**
 * 請求作業記録
 */
export interface BillingWorkRecord {
  date: DateString;
  workHours: number;
  employeeName: string;
  description?: string;
}

/**
 * 請求処理リクエスト
 */
export interface ProcessBillingRequest {
  clientId: UUID;
  month: MonthString;
  preview: BillingPreview;
  sendToFreee?: boolean;
  scheduledAt?: DateString;
}

/**
 * 請求処理結果
 */
export interface BillingProcessResult {
  id: UUID;
  clientId: UUID;
  month: MonthString;
  status: BillingStatus;
  totalAmount: Amount;
  invoiceNumber?: string;
  freeeInvoiceId?: string;
  processedAt: DateString;
  errors?: string[];
}

/**
 * スケジュール請求リクエスト
 */
export interface ScheduleBillingRequest {
  clientIds: UUID[];
  month: MonthString;
  scheduledAt: DateString;
  sendToFreee: boolean;
  cronExpression?: string;
}

// ========== freee連携関連 ==========

/**
 * freee設定
 */
export interface FreeConfig {
  id: UUID;
  userId: UUID;
  isConnected: boolean;
  connectionStatus: FreeConnectionStatus;
  companyId?: string;
  companyName?: string;
  accessTokenExpiresAt?: DateString;
  lastSyncAt?: DateString;
  createdAt: DateString;
  updatedAt: DateString;
}

/**
 * freee認証URL取得レスポンス
 */
export interface FreeAuthUrlResponse {
  authUrl: string;
  state: string;
}

/**
 * freee取引先
 */
export interface FreePartner {
  id: string;
  name: string;
  code?: string;
  email?: string;
  syncedAt: DateString;
}

/**
 * freee請求書
 */
export interface FreeInvoice {
  id: string;
  invoiceNumber: string;
  partnerId: string;
  partnerName: string;
  totalAmount: Amount;
  issueDate: DateString;
  dueDate?: DateString;
  status: string;
  syncedAt: DateString;
}

/**
 * freee同期ログ
 */
export interface FreeSyncLog {
  id: UUID;
  userId: UUID;
  syncType: "partners" | "invoices" | "manual";
  status: FreeSyncStatus;
  totalRecords: number;
  successRecords: number;
  failedRecords: number;
  errorMessage?: string;
  startedAt: DateString;
  completedAt?: DateString;
}

/**
 * freee同期リクエスト
 */
export interface FreeSyncRequest {
  syncType: "partners" | "invoices";
  forceSync?: boolean;
}

// ========== ダッシュボード関連 ==========

/**
 * 経理ダッシュボードデータ
 */
export interface AccountingDashboard {
  summary: AccountingSummary;
  monthlyTrend: MonthlyTrendData[];
  clientBillingRanking: ClientBillingRanking[];
  recentActivities: RecentActivity[];
  upcomingSchedules: UpcomingSchedule[];
}

/**
 * 経理サマリー
 */
export interface AccountingSummary {
  currentMonth: MonthString;
  totalBillingAmount: Amount;
  totalClients: number;
  completedBillings: number;
  pendingBillings: number;
  freeeConnectionStatus: FreeConnectionStatus;
  lastUpdatedAt: DateString;
  previousMonthBilling?: Amount;
  previousMonthClients?: number;
  previousMonthCompleted?: number;
  previousMonthPending?: number;
}

/**
 * 月次トレンドデータ
 */
export interface MonthlyTrendData {
  month: MonthString;
  billingAmount: Amount;
  clientCount: number;
  averageAmount: Amount;
}

/**
 * クライアント請求ランキング
 */
export interface ClientBillingRanking {
  clientId: UUID;
  clientName: string;
  totalAmount: Amount;
  rank: number;
  percentageOfTotal: number;
}

/**
 * 最近のアクティビティ
 */
export interface RecentActivity {
  id: UUID;
  type:
    | "billing_created"
    | "billing_completed"
    | "freee_sync"
    | "project_group_created";
  title: string;
  description: string;
  createdAt: DateString;
  userId?: UUID;
  userName?: string;
}

/**
 * 今後のスケジュール
 */
export interface UpcomingSchedule {
  id: UUID;
  type: "billing" | "freee_sync";
  title: string;
  scheduledAt: DateString;
  status: ScheduleStatus;
}

// ========== スケジュール関連 ==========

/**
 * スケジュールジョブ
 */
export interface ScheduledJob {
  id: UUID;
  name: string;
  type: "billing" | "freee_sync";
  cronExpression: string;
  isActive: boolean;
  lastRunAt?: DateString;
  nextRunAt?: DateString;
  status: ScheduleStatus;
  parameters: Record<string, any>;
  createdAt: DateString;
  updatedAt: DateString;
}

/**
 * スケジュール作成リクエスト
 */
export interface CreateScheduleRequest {
  name: string;
  type: "billing" | "freee_sync";
  cronExpression: string;
  parameters: Record<string, any>;
}

/**
 * スケジュール更新リクエスト
 */
export interface UpdateScheduleRequest {
  name?: string;
  cronExpression?: string;
  isActive?: boolean;
  parameters?: Record<string, any>;
}

// ========== バッチ処理関連 ==========

/**
 * バッチジョブ
 */
export interface BatchJob {
  id: UUID;
  name: string;
  type: "billing_batch" | "freee_sync_batch";
  status: BatchJobStatus;
  progress: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  startedAt: DateString;
  completedAt?: DateString;
  errorMessage?: string;
  results?: Record<string, any>;
}

/**
 * バッチジョブ作成リクエスト
 */
export interface CreateBatchJobRequest {
  name: string;
  type: "billing_batch" | "freee_sync_batch";
  parameters: Record<string, any>;
}

// ========== ダッシュボード分析関連 ==========

/**
 * 月次トレンドデータ
 */
export interface MonthlyTrendData {
  yearMonth: string; // YYYY-MM形式
  processedAmount: number;
  processedCount: number;
  pendingAmount: number;
  pendingCount: number;
}

/**
 * 取引先ランキングデータ
 */
export interface ClientRankingData {
  clientId: UUID;
  clientName: string;
  totalAmount: number;
  invoiceCount: number;
  averageAmount: number;
}

// ========== API共通レスポンス ==========

/**
 * ページネーション情報
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * リストレスポンス
 */
export interface ListResponse<T> {
  items: T[];
  pagination: Pagination;
}

/**
 * API成功レスポンス
 */
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
}

/**
 * APIエラーレスポンス
 */
export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, any>;
  timestamp?: DateString;
}

// ========== フィルター・ソート関連 ==========

/**
 * 請求フィルター
 */
export interface BillingFilter {
  clientIds?: UUID[];
  months?: MonthString[];
  statuses?: BillingStatus[];
  amountRange?: {
    min?: Amount;
    max?: Amount;
  };
  dateRange?: {
    from?: DateString;
    to?: DateString;
  };
}

/**
 * プロジェクトグループフィルター
 */
export interface ProjectGroupFilter {
  clientIds?: UUID[];
  calculationTypes?: BillingCalculationType[];
  search?: string;
}

/**
 * ソート順序
 */
export type SortOrder = "asc" | "desc";

/**
 * ソート設定
 */
export interface SortConfig {
  field: string;
  order: SortOrder;
}

// ========== フォーム関連 ==========

/**
 * 請求プレビューフォーム
 */
export interface BillingPreviewForm {
  clientId: UUID;
  month: MonthString;
}

/**
 * プロジェクトグループフォーム
 */
export interface ProjectGroupForm {
  clientId: UUID;
  name: string;
  description: string;
  billingCalculationType: BillingCalculationType;
  fixedAmount: string;
  upperThreshold: string;
  lowerThreshold: string;
  selectedProjectIds: UUID[];
}

/**
 * スケジュール設定フォーム
 */
export interface ScheduleForm {
  name: string;
  type: "billing" | "freee_sync";
  cronExpression: string;
  clientIds: UUID[];
  month: MonthString;
  sendToFreee: boolean;
}

// ========== 設定関連 ==========

/**
 * 経理設定
 */
export interface AccountingSettings {
  autoFreeeSync: boolean;
  defaultBillingCalculationType: BillingCalculationType;
  billingEmailTemplate?: string;
  freeeWebhookUrl?: string;
  notifications: {
    billingCompleted: boolean;
    freeeSync: boolean;
    errors: boolean;
  };
}

// ========== ユーティリティ型 ==========

/**
 * 部分的な更新用型
 */
export type PartialUpdate<T> = Partial<T> & {
  id: UUID;
};

/**
 * 作成用型（IDと日付フィールドを除外）
 */
export type CreateType<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

/**
 * 選択肢型
 */
export interface Option<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * テーブル列定義
 */
export interface TableColumn<T = any> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  width?: number;
  render?: (value: any, record: T) => ReactNode;
}

/**
 * チャートデータポイント
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * 時系列チャートデータ
 */
export interface TimeSeriesData {
  date: DateString;
  value: number;
  label?: string;
}

// ========== バリデーション関連 ==========

/**
 * バリデーションエラー
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ========== 権限関連 ==========

/**
 * 経理権限
 */
export type AccountingPermission =
  | "accounting:read" // 閲覧
  | "accounting:write" // 編集
  | "accounting:admin" // 管理
  | "billing:read" // 請求閲覧
  | "billing:write" // 請求編集
  | "billing:process" // 請求処理
  | "freee:read" // freee閲覧
  | "freee:write" // freee編集
  | "freee:sync"; // freee同期

/**
 * 権限チェック結果
 */
export interface PermissionCheck {
  hasPermission: boolean;
  requiredPermission: AccountingPermission;
  userPermissions: AccountingPermission[];
}

// ========== イベント関連 ==========

/**
 * 経理イベント
 */
export interface AccountingEvent {
  type: string;
  data: Record<string, any>;
  timestamp: DateString;
}

/**
 * イベントハンドラー
 */
export type EventHandler<T = any> = (
  event: AccountingEvent & { data: T },
) => void;

// ========== 国際化関連 ==========

/**
 * 多言語テキスト
 */
export interface LocalizedText {
  ja: string;
  en?: string;
}

/**
 * 通貨設定
 */
export interface CurrencyConfig {
  code: string;
  symbol: string;
  decimalPlaces: number;
}

// ========== エクスポート用 ==========

/**
 * エクスポート形式
 */
export type ExportFormat = "csv" | "xlsx" | "pdf";

/**
 * エクスポートリクエスト
 */
export interface ExportRequest {
  type: "billing" | "project_groups" | "freee_data";
  format: ExportFormat;
  filters?: Record<string, any>;
  columns?: string[];
  dateRange?: {
    from: DateString;
    to: DateString;
  };
}

/**
 * エクスポート結果
 */
export interface ExportResult {
  downloadUrl: string;
  filename: string;
  size: number;
  expiresAt: DateString;
}

// ========== 請求書関連型定義 ==========

/**
 * 請求書
 */
export interface Invoice {
  id: UUID;
  clientId: UUID;
  clientName: string;
  projectName?: string;
  invoiceNumber: string;
  invoiceDate: DateString;
  dueDate: DateString;
  status: InvoiceStatus;
  subtotalAmount: Amount;
  taxAmount: Amount;
  totalAmount: Amount;
  notes?: string;
  paymentDate?: DateString;
  freeeInvoiceId?: string;
  createdAt: DateString;
  updatedAt: DateString;
}

/**
 * 請求書サマリー
 */
export interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: Amount;
  paidInvoices: number;
  paidAmount: Amount;
  unpaidInvoices: number;
  unpaidAmount: Amount;
  overdueInvoices: number;
  overdueAmount: Amount;
  draftInvoices: number;
  sentInvoices: number;
}

/**
 * バルク操作結果
 */
export interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

/**
 * freee同期結果
 */
export interface FreeSyncResult {
  success: boolean;
  freeeInvoiceId?: string;
  message?: string;
  error?: string;
}
