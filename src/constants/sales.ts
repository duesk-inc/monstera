// 営業関連の定数定義

import type { 
  ProposalStatus, 
  AmountType, 
  ContractExtensionStatus, 
  InterviewStatus, 
  MeetingType,
  CampaignStatus,
  SalesRole 
} from '@/types/sales';

// 提案ステータス
export const PROPOSAL_STATUS: Record<ProposalStatus, string> = {
  draft: '下書き',
  pending: '提案中',
  in_interview: '面談中',
  accepted: '採用',
  rejected: '不採用',
  cancelled: 'キャンセル'
} as const;

export const PROPOSAL_STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: '#9E9E9E',
  pending: '#FF9800',
  in_interview: '#2196F3',
  accepted: '#4CAF50',
  rejected: '#F44336',
  cancelled: '#757575'
} as const;

// 金額種別
export const AMOUNT_TYPE: Record<AmountType, string> = {
  hourly: '時給',
  daily: '日給',
  monthly: '月給',
  fixed: '固定額'
} as const;

// 契約延長ステータス
export const CONTRACT_EXTENSION_STATUS: Record<ContractExtensionStatus, string> = {
  pending: '未確認',
  confirmed: '確認済み',
  requested: '申請済み',
  approved: '承認済み',
  rejected: '拒否',
  expired: '期限切れ'
} as const;

export const CONTRACT_EXTENSION_STATUS_COLORS: Record<ContractExtensionStatus, string> = {
  pending: '#FF9800',
  confirmed: '#2196F3',
  requested: '#9C27B0',
  approved: '#4CAF50',
  rejected: '#F44336',
  expired: '#757575'
} as const;

// 面談ステータス
export const INTERVIEW_STATUS: Record<InterviewStatus, string> = {
  scheduled: '予定',
  completed: '完了',
  cancelled: 'キャンセル',
  rescheduled: '再調整'
} as const;

export const INTERVIEW_STATUS_COLORS: Record<InterviewStatus, string> = {
  scheduled: '#2196F3',
  completed: '#4CAF50',
  cancelled: '#F44336',
  rescheduled: '#FF9800'
} as const;

// 面談形式
export const MEETING_TYPE: Record<MeetingType, string> = {
  online: 'オンライン',
  onsite: '対面',
  hybrid: 'ハイブリッド'
} as const;

// キャンペーンステータス
export const CAMPAIGN_STATUS: Record<CampaignStatus, string> = {
  draft: '下書き',
  scheduled: '送信予定',
  sending: '送信中',
  sent: '送信完了',
  failed: '送信失敗',
  cancelled: 'キャンセル'
} as const;

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: '#9E9E9E',
  scheduled: '#FF9800',
  sending: '#2196F3',
  sent: '#4CAF50',
  failed: '#F44336',
  cancelled: '#757575'
} as const;

// 営業ロール
export const SALES_ROLE: Record<SalesRole, string> = {
  sales_member: '営業メンバー',
  sales_manager: '営業マネージャー',
  sales_director: '営業責任者'
} as const;

// エンドポイント
export const SALES_ENDPOINTS = {
  // 提案管理
  proposals: '/api/v1/sales/proposals',
  proposalDetail: (id: string) => `/api/v1/sales/proposals/${id}`,
  proposalStatus: (id: string) => `/api/v1/sales/proposals/${id}/status`,
  activeProposalsByEngineer: (engineerId: string) => `/api/v1/sales/proposals/engineers/${engineerId}/active`,
  parallelProposals: '/api/v1/sales/proposals/parallel',
  proposalStatistics: '/api/v1/sales/proposals/statistics',
  upcomingDeadlines: '/api/v1/sales/proposals/deadlines/upcoming',
  
  // 契約延長管理
  extensions: '/api/v1/sales/extensions',
  extensionDetail: (id: string) => `/api/v1/sales/extensions/${id}`,
  extensionStatus: (id: string) => `/api/v1/sales/extensions/${id}/status`,
  extensionTargets: '/api/v1/sales/extensions/targets',
  latestExtensionByEngineer: (engineerId: string) => `/api/v1/sales/extensions/engineers/${engineerId}/latest`,
  pendingExtensions: '/api/v1/sales/extensions/pending',
  autoCreateExtensions: '/api/v1/sales/extensions/auto-create',
  extensionSettings: '/api/v1/sales/extensions/settings',
  
  // 面談スケジュール管理
  interviews: '/api/v1/sales/interviews',
  interviewDetail: (id: string) => `/api/v1/sales/interviews/${id}`,
  interviewStatus: (id: string) => `/api/v1/sales/interviews/${id}/status`,
  calendarView: '/api/v1/sales/interviews/calendar',
  upcomingInterviews: '/api/v1/sales/interviews/upcoming',
  interviewsByProposal: (proposalId: string) => `/api/v1/sales/interviews/proposals/${proposalId}`,
  checkConflicts: '/api/v1/sales/interviews/conflicts/check',
  interviewReminderSettings: '/api/v1/sales/interviews/reminder-settings',
  
  // メール管理
  emailTemplates: '/api/v1/sales/emails/templates',
  emailTemplateDetail: (id: string) => `/api/v1/sales/emails/templates/${id}`,
  emailCampaigns: '/api/v1/sales/emails/campaigns',
  emailCampaignDetail: (id: string) => `/api/v1/sales/emails/campaigns/${id}`,
  sendCampaign: (id: string) => `/api/v1/sales/emails/campaigns/${id}/send`,
  campaignStats: (id: string) => `/api/v1/sales/emails/campaigns/${id}/stats`,
  campaignHistory: (id: string) => `/api/v1/sales/emails/campaigns/${id}/history`,
  sendProposalEmail: '/api/v1/sales/emails/proposal',
  sendInterviewConfirmation: (interviewId: string) => `/api/v1/sales/emails/interviews/${interviewId}/confirmation`,
  sendExtensionRequest: (extensionId: string) => `/api/v1/sales/emails/extensions/${extensionId}/request`,
  
  // POC同期管理
  pocSync: '/api/v1/sales/poc-sync',
  syncAll: '/api/v1/sales/poc-sync/sync/all',
  syncProject: (pocProjectId: string) => `/api/v1/sales/poc-sync/sync/projects/${pocProjectId}`,
  forceSync: '/api/v1/sales/poc-sync/sync/force',
  scheduledSync: '/api/v1/sales/poc-sync/sync/scheduled',
  syncStatus: '/api/v1/sales/poc-sync/status',
  unsyncedProjects: '/api/v1/sales/poc-sync/unsynced',
  syncHistory: '/api/v1/sales/poc-sync/history',
  pocProjects: '/api/v1/sales/poc-sync/projects',
  pocProjectDetail: (id: string) => `/api/v1/sales/poc-sync/projects/${id}`,
  pocSyncSettings: '/api/v1/sales/poc-sync/settings',
  
  // 営業チーム管理
  team: '/api/v1/sales/team',
  teamMembers: '/api/v1/sales/team/members',
  teamMemberRole: (userId: string) => `/api/v1/sales/team/members/${userId}/role`,
  teamMemberDetail: (userId: string) => `/api/v1/sales/team/members/${userId}`,
  userPermissions: (userId?: string) => userId ? `/api/v1/sales/team/permissions/users/${userId}` : '/api/v1/sales/team/permissions',
  grantPermission: '/api/v1/sales/team/permissions',
  revokePermission: (permissionId: string) => `/api/v1/sales/team/permissions/${permissionId}`,
  checkPermission: '/api/v1/sales/team/check-permission',
  checkAccess: '/api/v1/sales/team/check-access',
  accessibleProposals: '/api/v1/sales/team/accessible/proposals',
  accessibleInterviews: '/api/v1/sales/team/accessible/interviews',
  accessibleExtensions: '/api/v1/sales/team/accessible/extensions',
  teamSettings: '/api/v1/sales/team/settings'
} as const;

// デフォルト設定
export const SALES_DEFAULTS = {
  // ページネーション
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100
  },
  
  // リマインダー
  reminder: {
    proposalDefaultDays: 3,
    interviewDefaultDays: 1,
    extensionCheckDays: 30
  },
  
  // 面談
  interview: {
    defaultDurationMinutes: 60,
    minDurationMinutes: 15,
    maxDurationMinutes: 480
  },
  
  // メール
  email: {
    maxRecipients: 100,
    templateCategories: ['proposal', 'interview', 'extension', 'general']
  },
  
  // 同期
  sync: {
    defaultBatchSize: 50,
    maxBatchSize: 1000,
    defaultMaxRetries: 3,
    maxMaxRetries: 10
  }
} as const;

// バリデーション設定
export const SALES_VALIDATION = {
  proposal: {
    amount: {
      min: 0,
      max: 10000000
    },
    workingHours: {
      min: 1,
      max: 24
    }
  },
  
  interview: {
    duration: {
      min: 15,
      max: 480
    },
    attendees: {
      max: 20
    }
  },
  
  extension: {
    checkBeforeDays: {
      min: 1,
      max: 90
    },
    periodMonths: {
      min: 1,
      max: 60
    }
  },
  
  email: {
    template: {
      nameMaxLength: 100,
      subjectMaxLength: 200
    },
    campaign: {
      nameMaxLength: 100,
      maxRecipients: 1000
    }
  },
  
  team: {
    accessLogRetentionDays: {
      min: 1,
      max: 365
    }
  }
} as const;

// UI設定
export const SALES_UI = {
  colors: {
    primary: '#1976d2',
    secondary: '#dc004e',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3'
  },
  
  icons: {
    proposal: 'Assignment',
    interview: 'Event',
    extension: 'Schedule',
    email: 'Email',
    sync: 'Sync',
    team: 'Group'
  },
  
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  }
} as const;

// エラーメッセージ
export const SALES_ERROR_MESSAGES = {
  // 共通
  required: 'この項目は必須です',
  invalid: '無効な値です',
  network: 'ネットワークエラーが発生しました',
  unauthorized: '権限がありません',
  notFound: 'データが見つかりません',
  
  // 提案関連
  proposalAmountRequired: '提案金額を入力してください',
  proposalAmountInvalid: '提案金額は正の数値で入力してください',
  engineerRequired: 'エンジニアを選択してください',
  clientRequired: 'クライアントを選択してください',
  
  // 面談関連
  scheduledDateRequired: '面談日時を入力してください',
  durationRequired: '面談時間を入力してください',
  durationInvalid: '面談時間は15分以上480分以下で入力してください',
  conflictExists: '指定された時間に他の面談が予定されています',
  
  // 延長関連
  contractEndRequired: '契約終了日を入力してください',
  checkDateRequired: '延長確認日を入力してください',
  checkDateInvalid: '延長確認日は契約終了日より前に設定してください',
  
  // メール関連
  templateNameRequired: 'テンプレート名を入力してください',
  subjectRequired: '件名を入力してください',
  bodyRequired: '本文を入力してください',
  recipientsRequired: '宛先を入力してください',
  
  // 同期関連
  syncInProgress: '同期処理が実行中です',
  syncFailed: '同期処理に失敗しました',
  
  // チーム関連
  userRequired: 'ユーザーを選択してください',
  roleRequired: 'ロールを選択してください',
  permissionDenied: 'この操作を実行する権限がありません'
} as const;