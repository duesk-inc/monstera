// 営業関連の型定義

// 基本的な共通型
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// 提案管理関連
export type ProposalStatus = 
  | 'draft'           // 下書き
  | 'pending'         // 提案中
  | 'in_interview'    // 面談中
  | 'accepted'        // 採用
  | 'rejected'        // 不採用
  | 'cancelled';      // キャンセル

export type AmountType = 'hourly' | 'daily' | 'monthly' | 'fixed';

export interface Proposal extends BaseEntity {
  engineerId: string;
  engineerName: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  proposalAmount: number;
  amountType: AmountType;
  workingHours?: number;
  skillSheetUrl?: string;
  interviewDate?: string;
  interviewLocation?: string;
  interviewNotes?: string;
  responseDeadline?: string;
  status: ProposalStatus;
  rejectionReason?: string;
  acceptanceConditions?: string;
  notes?: string;
  proposalDate: string;
  createdBy: string;
  updatedBy?: string;
}

export interface CreateProposalRequest {
  engineerId: string;
  clientId: string;
  projectId?: string;
  proposalAmount: number;
  amountType: AmountType;
  workingHours?: number;
  skillSheetUrl?: string;
  interviewDate?: string;
  interviewLocation?: string;
  responseDeadline?: string;
  notes?: string;
}

export interface ProposalListFilter {
  engineerId?: string;
  clientId?: string;
  projectId?: string;
  status?: ProposalStatus[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ProposalStatistics {
  totalProposals: number;
  activeProposals: number;
  acceptanceRate: number;
  averageAmount: number;
  statusCounts: Record<ProposalStatus, number>;
  monthlyTrends: Array<{
    month: string;
    count: number;
    acceptanceRate: number;
  }>;
}

// 契約延長管理関連
export type ContractExtensionStatus = 
  | 'pending'         // 未確認
  | 'confirmed'       // 確認済み
  | 'requested'       // 申請済み
  | 'approved'        // 承認済み
  | 'rejected'        // 拒否
  | 'expired';        // 期限切れ

export interface ContractExtension extends BaseEntity {
  engineerId: string;
  engineerName: string;
  currentContractEnd: string;
  extensionCheckDate: string;
  extensionRequestDate?: string;
  clientResponseDate?: string;
  extensionPeriodMonths?: number;
  newContractEndDate?: string;
  status: ContractExtensionStatus;
  notes?: string;
  settings?: ContractExtensionSettings;
  createdBy: string;
  updatedBy?: string;
}

export interface ContractExtensionSettings {
  checkBeforeDays: number;
  reminderEnabled: boolean;
  reminderDays: string;
  autoNotification: boolean;
  notificationChannels: string;
}

export interface ExtensionTarget {
  engineerId: string;
  engineerName: string;
  currentContractEnd: string;
  daysUntilExpiry: number;
  lastExtensionCheck?: string;
  needsCheck: boolean;
}

// 面談スケジュール管理関連
export type InterviewStatus = 
  | 'scheduled'       // 予定
  | 'completed'       // 完了
  | 'cancelled'       // キャンセル
  | 'rescheduled';    // 再調整

export type MeetingType = 'online' | 'onsite' | 'hybrid';

export interface InterviewAttendee {
  name: string;
  email?: string;
  role?: string;
  company?: string;
}

export interface InterviewReminder {
  enabled: boolean;
  daysBefore: number;
  channels: string[];
}

export interface InterviewSchedule extends BaseEntity {
  proposalId: string;
  engineerName: string;
  clientName: string;
  scheduledDate: string;
  durationMinutes: number;
  location?: string;
  meetingType: MeetingType;
  meetingUrl?: string;
  clientAttendees: InterviewAttendee[];
  engineerAttendees: InterviewAttendee[];
  reminderSettings?: InterviewReminder;
  reminderSentAt?: string;
  status: InterviewStatus;
  interviewResult?: string;
  nextSteps?: string;
  notes?: string;
  createdBy: string;
  updatedBy?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'interview' | 'meeting' | 'deadline';
  status: string;
  attendees?: InterviewAttendee[];
  location?: string;
  meetingUrl?: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: InterviewSchedule[];
}

// メール管理関連
export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface EmailTemplate extends BaseEntity {
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  category?: string;
  variables: TemplateVariable[];
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
}

export type CampaignStatus = 
  | 'draft'           // 下書き
  | 'scheduled'       // 送信予定
  | 'sending'         // 送信中
  | 'sent'            // 送信完了
  | 'failed'          // 送信失敗
  | 'cancelled';      // キャンセル

export interface EmailRecipient {
  email: string;
  name?: string;
  customData?: Record<string, any>;
  sentAt?: string;
  status?: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
}

export interface EmailCampaign extends BaseEntity {
  name: string;
  templateId: string;
  templateName: string;
  scheduledAt: string;
  recipients: EmailRecipient[];
  targetRole?: string;
  targetStatus?: string;
  customConditions?: Record<string, any>;
  status: CampaignStatus;
  sentCount: number;
  failedCount: number;
  createdBy: string;
  updatedBy?: string;
}

export interface CampaignStats {
  totalSent: number;
  successRate: number;
  bounceRate: number;
  openRate?: number;
  clickRate?: number;
  unsubscribeRate?: number;
  responses: number;
}

// POC同期管理関連
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface PocProject extends BaseEntity {
  pocProjectId: string;
  projectName: string;
  clientCompanyName: string;
  projectType?: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  membersCount?: number;
  skillsRequired?: string[];
  location?: string;
  remoteAllowed: boolean;
  lastSyncAt?: string;
  syncStatus: SyncStatus;
  syncErrorMessage?: string;
  isActive: boolean;
}

export interface SyncSettings {
  enabled: boolean;
  scheduleInterval: string;
  autoCreateClient: boolean;
  notifyOnError: boolean;
  slackNotifications: boolean;
  batchSize: number;
  maxRetries: number;
}

export interface SyncHistory extends BaseEntity {
  syncType: 'scheduled' | 'manual' | 'force';
  status: 'success' | 'partial' | 'failed';
  projectsProcessed: number;
  projectsCreated: number;
  projectsUpdated: number;
  projectsFailed: number;
  errorMessages?: string[];
  executedBy?: string;
  duration: number;
}

// 営業チーム管理関連
export type SalesRole = 
  | 'sales_member'    // 営業メンバー
  | 'sales_manager'   // 営業マネージャー
  | 'sales_director'; // 営業責任者

export interface SalesTeamMember extends BaseEntity {
  userId: string;
  userName: string;
  email: string;
  role: SalesRole;
  permissions: SalesPermission[];
  isActive: boolean;
  joinedAt: string;
}

export interface SalesPermission {
  id: string;
  userId: string;
  resource: string;
  action: string;
  scope?: string;
  expiresAt?: string;
  grantedBy: string;
  grantedAt: string;
}

export interface SalesTeamSettings {
  autoAssignNewMembers: boolean;
  defaultRole: SalesRole;
  requireApprovalForHigh: boolean;
  notificationChannels: string;
  accessLogRetentionDays: number;
}

// API レスポンス型
export interface ApiResponse<T> {
  data?: T;
  items?: T[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// フィルター・検索関連
export interface DateRangeFilter {
  from?: string;
  to?: string;
}

export interface BaseListFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

// フォーム関連
export interface FormErrors {
  [key: string]: string | string[] | FormErrors;
}

export interface SubmissionState {
  isSubmitting: boolean;
  errors: FormErrors;
  lastSubmissionTime?: number;
}

// 通知・アラート関連
export interface SalesNotification {
  id: string;
  type: 'deadline' | 'status_change' | 'reminder' | 'error';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

// ダッシュボード関連
export interface SalesDashboardData {
  totalProposals: number;
  activeProposals: number;
  upcomingInterviews: number;
  pendingExtensions: number;
  todayDeadlines: number;
  weeklyTrends: {
    proposals: number;
    interviews: number;
    acceptances: number;
  };
  statusDistribution: Record<string, number>;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

// 営業関連の設定
export interface SalesConfig {
  proposalStatuses: ProposalStatus[];
  amountTypes: AmountType[];
  meetingTypes: MeetingType[];
  extensionStatuses: ContractExtensionStatus[];
  interviewStatuses: InterviewStatus[];
  campaignStatuses: CampaignStatus[];
  salesRoles: SalesRole[];
  defaultSettings: {
    proposalReminderDays: number;
    interviewReminderDays: number;
    extensionCheckDays: number;
    defaultMeetingDuration: number;
  };
}