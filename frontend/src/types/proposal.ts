/**
 * 提案情報確認機能の型定義
 * バックエンドDTOに対応するフロントエンド型定義
 */

// ==========================================
// 基本型定義
// ==========================================

/** 提案ステータス */
export type ProposalStatus = 'proposed' | 'proceed' | 'declined';

/** ユーザー概要情報（質問・回答関連で使用） */
export interface UserSummaryDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ==========================================
// 提案関連の型定義
// ==========================================

/** 提案一覧アイテム */
export interface ProposalItemDTO {
  id: string;
  projectId: string;
  projectName: string;
  minPrice?: number;
  maxPrice?: number;
  workLocation: string;
  requiredSkills: string;
  status: ProposalStatus;
  createdAt: string;
  respondedAt?: string;
  pendingQuestionsCount: number;
}

/** 提案一覧取得リクエスト */
export interface GetProposalsRequest {
  status?: ProposalStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 提案一覧レスポンス */
export interface ProposalListResponse {
  items: ProposalItemDTO[];
  total: number;
  page: number;
  limit: number;
}

/** 提案ステータス更新リクエスト */
export interface UpdateProposalStatusRequest {
  status: 'proceed' | 'declined';
}

/** 提案詳細レスポンス */
export interface ProposalDetailResponse {
  id: string;
  projectId: string;
  status: ProposalStatus;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
  project: ProjectDetailDTO;
  questions: ProposalQuestionDTO[];
}

// ==========================================
// プロジェクト関連の型定義
// ==========================================

/** プロジェクト詳細情報 */
export interface ProjectDetailDTO {
  id: string;
  projectName: string;
  description: string;
  minPrice?: number;
  maxPrice?: number;
  workLocation: string;
  remoteWorkType: string;
  workingTime: string;
  contractPeriod: string;
  startDate?: string;
  startDateText: string;
  requiredSkills: ProjectSkillDTO[];
  preferredSkills: ProjectSkillDTO[];
}

/** プロジェクトスキル情報 */
export interface ProjectSkillDTO {
  skillName: string;
  experienceYearsMin?: number;
  experienceYearsMax?: number;
  isRequired: boolean;
}

// ==========================================
// 質問関連の型定義
// ==========================================

/** 質問投稿リクエスト */
export interface CreateQuestionRequest {
  questionText: string;
}

/** 質問更新リクエスト */
export interface UpdateQuestionRequest {
  questionText: string;
}

/** 質問一覧取得リクエスト */
export interface GetQuestionsRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 質問一覧レスポンス */
export interface QuestionsListResponse {
  items: ProposalQuestionDTO[];
  total: number;
}

/** 質問詳細情報 */
export interface ProposalQuestionDTO {
  id: string;
  proposalId: string;
  questionText: string;
  responseText?: string;
  salesUserId?: string;
  isResponded: boolean;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
  salesUser?: UserSummaryDTO;
}

/** 質問回答リクエスト（営業担当者用） */
export interface RespondQuestionRequest {
  responseText: string;
}

// ==========================================
// 営業担当者向け機能の型定義
// ==========================================

/** 未回答質問一覧取得リクエスト */
export interface GetPendingQuestionsRequest {
  assignedToMe?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 未回答質問一覧レスポンス */
export interface PendingQuestionsListResponse {
  items: PendingQuestionDTO[];
  total: number;
}

/** 未回答質問アイテム */
export interface PendingQuestionDTO {
  id: string;
  proposalId: string;
  projectId: string;
  projectName: string;
  questionText: string;
  engineer?: UserSummaryDTO;
  createdAt: string;
}

/** 質問割り当てリクエスト */
export interface AssignQuestionRequest {
  salesUserID: string;
}

// ==========================================
// 統計・分析関連の型定義
// ==========================================

/** 提案統計レスポンス */
export interface ProposalSummaryResponse {
  totalProposals: number;
  pendingProposals: number;
  respondedProposals: number;
  proceedProposals: number;
  declinedProposals: number;
  pendingQuestionsCount: number;
}

// ==========================================
// 共通レスポンス型
// ==========================================

/** 成功レスポンス */
export interface SuccessResponse {
  message: string;
}

/** エラーレスポンス */
export interface ErrorResponse {
  error: string;
  code?: string;
}

// ==========================================
// フィルター・検索用の型定義
// ==========================================

/** 提案ステータス表示用の設定 */
export const PROPOSAL_STATUS_CONFIG = {
  proposed: { label: '提案中', color: 'warning' as const },
  proceed: { label: '選考へ進む', color: 'success' as const },
  declined: { label: '見送り', color: 'error' as const },
} as const;

/** 提案ステータス表示名の取得 */
export const getProposalStatusLabel = (status: ProposalStatus): string => {
  return PROPOSAL_STATUS_CONFIG[status]?.label || status;
};

/** 提案ステータス表示色の取得 */
export const getProposalStatusColor = (status: ProposalStatus) => {
  return PROPOSAL_STATUS_CONFIG[status]?.color || 'default';
};

// ==========================================
// バリデーション用の型定義
// ==========================================

/** 質問テキストの制限 */
export const QUESTION_TEXT_LIMITS = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 2000,
} as const;

/** 提案一覧のページネーション制限 */
export const PROPOSAL_PAGINATION_LIMITS = {
  MIN_PAGE: 1,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 20,
} as const;

// ==========================================
// ユーティリティ型定義
// ==========================================

/** 提案フィルターオプション */
export interface ProposalFilterOptions {
  status?: ProposalStatus;
  searchTerm?: string;
  sortBy?: 'createdAt' | 'respondedAt' | 'projectName';
  sortOrder?: 'asc' | 'desc';
}

/** 価格範囲表示用のユーティリティ関数 */
export const formatPriceRange = (minPrice?: number, maxPrice?: number): string => {
  if (!minPrice && !maxPrice) return '応相談';
  
  const formatPrice = (price: number) => `¥${price.toLocaleString()}`;
  
  if (minPrice && maxPrice) {
    if (minPrice === maxPrice) {
      return formatPrice(minPrice);
    }
    return `${formatPrice(minPrice)}〜${formatPrice(maxPrice)}`;
  }
  
  if (minPrice) return `${formatPrice(minPrice)}〜`;
  if (maxPrice) return `〜${formatPrice(maxPrice)}`;
  
  return '応相談';
};

/** 経験年数範囲表示用のユーティリティ関数 */
export const formatExperienceYears = (min?: number, max?: number): string => {
  if (!min && !max) return '';
  
  if (min && max) {
    if (min === max) {
      return `${min}年`;
    }
    return `${min}〜${max}年`;
  }
  
  if (min) return `${min}年以上`;
  if (max) return `${max}年以下`;
  
  return '';
};

/** 日付フォーマット用のユーティリティ関数 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  } catch (error) {
    return dateString;
  }
};

/** 日時フォーマット用のユーティリティ関数 */
export const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return dateString;
  }
};

