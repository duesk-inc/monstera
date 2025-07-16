import { 
  ProposalItemDTO, 
  ProposalDetailDTO, 
  ProposalQuestionDTO, 
  ProjectDetailDTO,
  UserSummaryDTO,
  ProposalStatus 
} from '@/types/proposal';

// モックユーザーデータ
export const mockEngineerUser: UserSummaryDTO = {
  id: 'eng-001',
  firstName: '太郎',
  lastName: '田中',
  email: 'tanaka@duesk.co.jp',
};

export const mockSalesUser: UserSummaryDTO = {
  id: 'sales-001',
  firstName: '花子',
  lastName: '佐藤',
  email: 'sato@duesk.co.jp',
};

// モックプロジェクトデータ
export const mockProject: ProjectDetailDTO = {
  id: 'proj-001',
  projectName: 'React開発プロジェクト',
  description: 'ECサイトのフロントエンド開発',
  minPrice: 600000,
  maxPrice: 800000,
  workLocation: '東京都渋谷区',
  remoteWorkType: 'フルリモート可',
  workingTime: '9:00-18:00',
  contractPeriod: '6ヶ月',
  startDate: '2024-04-01',
  startDateText: '2024年4月開始予定',
  requiredSkills: [
    {
      skillName: 'React',
      experienceYearsMin: 3,
      experienceYearsMax: 5,
      isRequired: true,
    },
    {
      skillName: 'TypeScript',
      experienceYearsMin: 2,
      experienceYearsMax: 4,
      isRequired: true,
    },
  ],
  preferredSkills: [
    {
      skillName: 'Next.js',
      experienceYearsMin: 1,
      experienceYearsMax: 3,
      isRequired: false,
    },
  ],
};

// モック質問データ
export const mockQuestions: ProposalQuestionDTO[] = [
  {
    id: 'q-001',
    proposalId: 'prop-001',
    questionText: 'リモートワークの頻度について詳しく教えてください。',
    responseText: '基本的にフルリモートですが、月に1-2回の出社をお願いする場合があります。',
    salesUserId: 'sales-001',
    isResponded: true,
    respondedAt: '2024-03-15T14:30:00Z',
    createdAt: '2024-03-14T10:00:00Z',
    updatedAt: '2024-03-15T14:30:00Z',
    salesUser: mockSalesUser,
  },
  {
    id: 'q-002',
    proposalId: 'prop-001',
    questionText: '開発環境や使用ツールについて教えてください。',
    isResponded: false,
    createdAt: '2024-03-16T09:00:00Z',
    updatedAt: '2024-03-16T09:00:00Z',
  },
];

// モック提案一覧データ
export const mockProposalList: ProposalItemDTO[] = [
  {
    id: 'prop-001',
    projectId: 'proj-001',
    projectName: 'React開発プロジェクト',
    minPrice: 600000,
    maxPrice: 800000,
    workLocation: '東京都渋谷区',
    requiredSkills: 'React, TypeScript',
    status: 'proposed',
    createdAt: '2024-03-10T09:00:00Z',
    pendingQuestionsCount: 1,
    userId: 'eng-001',
  },
  {
    id: 'prop-002',
    projectId: 'proj-002',
    projectName: 'Vue.js開発プロジェクト',
    minPrice: 550000,
    maxPrice: 700000,
    workLocation: '大阪府大阪市',
    requiredSkills: 'Vue.js, JavaScript',
    status: 'proceed',
    createdAt: '2024-03-08T10:00:00Z',
    respondedAt: '2024-03-12T15:00:00Z',
    pendingQuestionsCount: 0,
    userId: 'eng-001',
  },
  {
    id: 'prop-003',
    projectId: 'proj-003',
    projectName: 'Angular開発プロジェクト',
    minPrice: 650000,
    maxPrice: 850000,
    workLocation: '福岡県福岡市',
    requiredSkills: 'Angular, TypeScript',
    status: 'declined',
    createdAt: '2024-03-05T11:00:00Z',
    respondedAt: '2024-03-09T16:00:00Z',
    pendingQuestionsCount: 0,
    userId: 'eng-001',
  },
];

// モック提案詳細データ
export const mockProposalDetail: ProposalDetailDTO = {
  id: 'prop-001',
  projectId: 'proj-001',
  status: 'proposed',
  userId: 'eng-001',
  createdAt: '2024-03-10T09:00:00Z',
  updatedAt: '2024-03-16T10:00:00Z',
  project: mockProject,
  questions: mockQuestions,
};

// 提案ステータス更新用モックデータ
export const mockStatusUpdateRequest = {
  status: 'proceed' as ProposalStatus,
};

// 質問投稿用モックデータ
export const mockCreateQuestionRequest = {
  questionText: 'チーム体制について教えてください。',
};

// 質問回答用モックデータ
export const mockRespondQuestionRequest = {
  responseText: 'フロントエンド3名、バックエンド2名の体制です。',
};

// ページネーション付きレスポンスのモック
export const mockProposalListResponse = {
  items: mockProposalList,
  total: 3,
};

export const mockQuestionsListResponse = {
  items: mockQuestions,
  total: 2,
};

// エラーレスポンスのモック
export const mockErrorResponse = {
  error: 'サーバーエラーが発生しました',
};

export const mockValidationErrorResponse = {
  error: '入力内容に誤りがあります',
  details: {
    questionText: '質問は必須です',
  },
};

// 権限エラーのモック
export const mockUnauthorizedResponse = {
  error: 'この操作を実行する権限がありません',
};

// テスト用ヘルパー関数
export const createMockProposal = (overrides?: Partial<ProposalItemDTO>): ProposalItemDTO => ({
  id: `prop-${Date.now()}`,
  projectId: `proj-${Date.now()}`,
  projectName: 'テストプロジェクト',
  minPrice: 500000,
  maxPrice: 700000,
  workLocation: '東京都',
  requiredSkills: 'JavaScript',
  status: 'proposed',
  createdAt: new Date().toISOString(),
  pendingQuestionsCount: 0,
  userId: 'eng-001',
  ...overrides,
});

export const createMockQuestion = (overrides?: Partial<ProposalQuestionDTO>): ProposalQuestionDTO => ({
  id: `q-${Date.now()}`,
  proposalId: 'prop-001',
  questionText: 'テスト質問',
  isResponded: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});