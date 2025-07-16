// 職務経歴関連のカスタムフックのエクスポート

// メインの職務経歴データ操作フック
export {
  useWorkHistoryList,
  useWorkHistoryDetail,
  useTemporarySave,
  useWorkHistorySummary,
  useITExperience,
  useCreateWorkHistory,
  useUpdateWorkHistory,
  useDeleteWorkHistory,
  useSaveTemporary,
  useDeleteTemporary,
  useWorkHistory,
  WORK_HISTORY_QUERY_KEYS,
} from './useWorkHistory';

// マスターデータ関連フック
export {
  useIndustries,
  useProcesses,
  useTechnologySuggestions,
  usePopularTechnologies,
  useWorkHistoryMasterData,
  WORK_HISTORY_MASTER_QUERY_KEYS,
} from './useWorkHistoryMasterData';

// バリデーション関連フック
export {
  useWorkHistoryValidation,
  type ValidationError,
  type WorkHistoryValidationResult,
} from './useWorkHistoryValidation';

// フォーム管理フック
export {
  useWorkHistoryForm,
} from './useWorkHistoryForm';

// PDF出力関連フック
export {
  useWorkHistoryPDF,
  usePDFExportState,
  getDefaultPDFParams,
  validatePDFParams,
  generatePDFFileName,
} from './useWorkHistoryPDF';

// 技術経験関連フック
export {
  useTechnologyExperience,
  getExperienceLevel,
  formatExperienceDuration,
  generateSkillMatrix,
} from './useTechnologyExperience';

// 一時保存関連フック
export {
  useWorkHistoryTempSave,
} from './useWorkHistoryTempSave';

// 型定義の再エクスポート
export type {
  WorkHistoryData,
  WorkHistoryFormData,
  WorkHistoryCreateRequest,
  WorkHistoryUpdateRequest,
  WorkHistoryListParams,
  WorkHistoryListResponse,
  TechnologySuggestion,
  TechnologySuggestionRequest,
  IndustryMasterData,
  ProcessMasterData,
} from '../../types/workHistory';