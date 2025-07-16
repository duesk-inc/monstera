/**
 * 営業関連のテストデータ
 */

export interface TestProposal {
  id: string;
  engineerId: string;
  engineerName: string;
  clientId: string;
  clientName: string;
  proposalAmount: number;
  amountType: 'hourly' | 'daily' | 'monthly' | 'fixed';
  status: 'draft' | 'pending' | 'in_interview' | 'accepted' | 'rejected' | 'cancelled';
  proposalDate: string;
  responseDeadline?: string;
  skillSheetUrl?: string;
  interviewDate?: string;
  interviewLocation?: string;
  notes?: string;
}

export interface TestInterview {
  id: string;
  proposalId: string;
  engineerName: string;
  clientName: string;
  scheduledDate: string;
  durationMinutes: number;
  location?: string;
  meetingType: 'online' | 'onsite' | 'hybrid';
  meetingUrl?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
}

export interface TestContractExtension {
  id: string;
  engineerId: string;
  engineerName: string;
  currentContractEnd: string;
  extensionCheckDate: string;
  status: 'pending' | 'confirmed' | 'requested' | 'approved' | 'rejected' | 'expired';
  notes?: string;
}

// テスト用の提案データ
export const testProposals: TestProposal[] = [
  {
    id: 'proposal-001',
    engineerId: 'engineer-001',
    engineerName: '田中太郎',
    clientId: 'client-001',
    clientName: '株式会社ABC',
    proposalAmount: 700000,
    amountType: 'monthly',
    status: 'pending',
    proposalDate: '2024-01-15',
    responseDeadline: '2024-02-15',
    skillSheetUrl: 'https://example.com/skillsheet/001.pdf',
    notes: 'React/TypeScript経験豊富なエンジニア'
  },
  {
    id: 'proposal-002',
    engineerId: 'engineer-002',
    engineerName: '佐藤花子',
    clientId: 'client-002',
    clientName: '株式会社XYZ',
    proposalAmount: 650000,
    amountType: 'monthly',
    status: 'in_interview',
    proposalDate: '2024-01-10',
    responseDeadline: '2024-02-10',
    interviewDate: '2024-01-25T10:00:00Z',
    interviewLocation: 'オンライン (Zoom)',
    notes: 'バックエンド開発経験者'
  },
  {
    id: 'proposal-003',
    engineerId: 'engineer-003',
    engineerName: '鈴木一郎',
    clientId: 'client-001',
    clientName: '株式会社ABC',
    proposalAmount: 800000,
    amountType: 'monthly',
    status: 'accepted',
    proposalDate: '2024-01-05',
    responseDeadline: '2024-02-05',
    notes: 'シニアエンジニア、リーダー経験あり'
  },
  {
    id: 'proposal-004',
    engineerId: 'engineer-004',
    engineerName: '山田次郎',
    clientId: 'client-003',
    clientName: '株式会社DEF',
    proposalAmount: 600000,
    amountType: 'monthly',
    status: 'rejected',
    proposalDate: '2024-01-01',
    responseDeadline: '2024-02-01',
    notes: 'ジュニアエンジニア'
  },
  {
    id: 'proposal-005',
    engineerId: 'engineer-005',
    engineerName: '高橋美咲',
    clientId: 'client-004',
    clientName: '株式会社GHI',
    proposalAmount: 750000,
    amountType: 'monthly',
    status: 'draft',
    proposalDate: '2024-01-20',
    notes: 'フロントエンド専門、UI/UX経験あり'
  }
];

// テスト用の面談データ
export const testInterviews: TestInterview[] = [
  {
    id: 'interview-001',
    proposalId: 'proposal-002',
    engineerName: '佐藤花子',
    clientName: '株式会社XYZ',
    scheduledDate: '2024-01-25T10:00:00Z',
    durationMinutes: 60,
    meetingType: 'online',
    meetingUrl: 'https://zoom.us/j/123456789',
    status: 'scheduled',
    notes: '技術面談とスキル確認'
  },
  {
    id: 'interview-002',
    proposalId: 'proposal-003',
    engineerName: '鈴木一郎',
    clientName: '株式会社ABC',
    scheduledDate: '2024-01-20T14:00:00Z',
    durationMinutes: 90,
    location: '東京都渋谷区 ABCビル 5F',
    meetingType: 'onsite',
    status: 'completed',
    notes: '最終面談、採用決定'
  }
];

// テスト用の契約延長データ
export const testExtensions: TestContractExtension[] = [
  {
    id: 'extension-001',
    engineerId: 'engineer-001',
    engineerName: '田中太郎',
    currentContractEnd: '2024-03-31',
    extensionCheckDate: '2024-01-01',
    status: 'pending',
    notes: '継続希望の確認中'
  },
  {
    id: 'extension-002',
    engineerId: 'engineer-003',
    engineerName: '鈴木一郎',
    currentContractEnd: '2024-02-29',
    extensionCheckDate: '2024-01-15',
    status: 'approved',
    notes: '契約延長承認済み'
  }
];

// テスト用のユーザー認証情報
export const testUsers = {
  salesManager: {
    email: 'sales.manager@duesk.co.jp',
    password: 'salesmanager123',
    role: 'sales_manager'
  },
  salesMember: {
    email: 'sales.member@duesk.co.jp',
    password: 'salesmember123',
    role: 'sales_member'
  },
  admin: {
    email: 'admin@duesk.co.jp',
    password: 'admin123',
    role: 'admin'
  }
};

// テスト用のAPIレスポンス
export const mockApiResponses = {
  proposalList: {
    items: testProposals,
    total: testProposals.length,
    page: 1,
    limit: 20,
    totalPages: 1
  },
  proposalStatistics: {
    totalProposals: 45,
    activeProposals: 12,
    acceptanceRate: 0.25,
    averageAmount: 725000,
    statusCounts: {
      draft: 5,
      pending: 8,
      in_interview: 4,
      accepted: 15,
      rejected: 10,
      cancelled: 3
    },
    monthlyTrends: [
      { month: '2024-01', count: 12, acceptanceRate: 0.33 },
      { month: '2023-12', count: 8, acceptanceRate: 0.25 },
      { month: '2023-11', count: 10, acceptanceRate: 0.20 }
    ]
  }
};

// テスト用のフィルター設定
export const testFilters = {
  statusFilters: ['draft', 'pending', 'in_interview', 'accepted', 'rejected', 'cancelled'],
  amountTypes: ['hourly', 'daily', 'monthly', 'fixed'],
  meetingTypes: ['online', 'onsite', 'hybrid']
};

// テスト用のメールテンプレート
export const testEmailTemplates = [
  {
    id: 'template-001',
    name: '提案書送付テンプレート',
    subject: '【{{clientName}}様】エンジニア提案書のご送付',
    body: 'いつもお世話になっております。\n\n{{engineerName}}のスキルシートと提案書を送付いたします。'
  },
  {
    id: 'template-002',
    name: '面談確認テンプレート',
    subject: '【{{clientName}}様】面談日程のご確認',
    body: '面談の日程についてご確認をお願いいたします。\n\n日時: {{interviewDate}}\n場所: {{location}}'
  }
];

// テスト用のCSVデータ
export const testCsvData = `エンジニア名,クライアント名,提案金額,単価種別,ステータス,提案日
田中太郎,株式会社ABC,700000,monthly,pending,2024-01-15
佐藤花子,株式会社XYZ,650000,monthly,in_interview,2024-01-10
鈴木一郎,株式会社ABC,800000,monthly,accepted,2024-01-05`;

// テスト用の期待値設定
export const testExpectations = {
  pageLoadTimeout: 15000,
  apiResponseTimeout: 10000,
  animationTimeout: 1000,
  searchDelay: 500,
  toastDisplayTime: 3000
};

// エラーメッセージ
export const testErrorMessages = {
  networkError: 'ネットワークエラーが発生しました',
  validationError: '入力内容に誤りがあります',
  permissionError: 'この操作を実行する権限がありません',
  notFoundError: 'データが見つかりません'
};

// 成功メッセージ
export const testSuccessMessages = {
  proposalCreated: '提案を作成しました',
  proposalUpdated: '提案を更新しました',
  proposalDeleted: '提案を削除しました',
  statusUpdated: 'ステータスを更新しました',
  emailSent: 'メールを送信しました',
  interviewScheduled: '面談を予定しました',
  dataExported: 'データをエクスポートしました',
  dataImported: 'データをインポートしました'
};