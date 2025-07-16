/**
 * 提案情報確認機能フックのエクスポートインデックス
 * 他の場所からインポートしやすくするためのバレルエクスポート
 */

// 全てのフックをエクスポート
export {
  useProposals,
  useProposalDetail,
  useUpdateProposalStatus,
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  usePendingQuestions,
  useRespondToQuestion,
  useAssignQuestion,
  useProposalStats,
  useProposalDashboard,
  useInfiniteProposals,
  useBatchUpdateProposalStatus,
  useBatchDeleteQuestions,
  useInvalidateProposalQueries,
  useProposalCache,
  PROPOSAL_QUERY_KEYS,
} from './useProposalQueries';

// 型もエクスポート
export type {
  UseProposalsParams,
  UseProposalsReturn,
  UseProposalDetailOptions,
  UseUpdateProposalStatusOptions,
  UseQuestionsParams,
  UseCreateQuestionOptions,
  UseUpdateQuestionOptions,
  UseDeleteQuestionOptions,
} from './useProposalQueries';