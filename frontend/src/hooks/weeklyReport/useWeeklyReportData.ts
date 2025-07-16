import { useCallback } from 'react';
import { format } from 'date-fns';
import { WeeklyReport, DailyRecord } from '@/types/weeklyReport';
import { WeeklyReportErrors } from './useWeeklyReportState';
import { 
  getCurrentWeeklyReport,
  getWeeklyReportByDateRange,
  saveWeeklyReportAsDraft,
  saveAndSubmitWeeklyReport,
} from '@/lib/api/weeklyReport';
import { 
  convertAPIResponseToUIModel, 
  convertUIModelToAPIRequest 
} from '@/app/(authenticated)/(engineer)/weekly-report/mappers/weeklyReportMappers';
import { AbortError, handleApiError } from '@/lib/api/error';
import { useToast } from '@/components/common';
import { SUCCESS_MESSAGES } from '../../constants/errorMessages';
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';
import { WEEKLY_REPORT_MOOD } from '@/constants/weeklyMood';
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';
import { getCurrentWeek } from '@/utils/dateUtils';

export interface UseWeeklyReportDataReturn {
  loadWeeklyReport: (
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void,
    setErrors: React.Dispatch<React.SetStateAction<WeeklyReportErrors>>,
    generateDailyRecords: (startDate: Date, endDate: Date) => DailyRecord[],
    signal?: AbortSignal,
    applyDefaultSettings?: (report: WeeklyReport) => WeeklyReport
  ) => Promise<void>;
  loadWeeklyReportByDateRange: (
    startDate: Date,
    endDate: Date,
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void,
    generateDailyRecords: (startDate: Date, endDate: Date) => DailyRecord[],
    applyDefaultSettings?: (report: WeeklyReport) => WeeklyReport
  ) => Promise<WeeklyReport | null>;
  saveWeeklyReportDraft: (
    report: WeeklyReport,
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void
  ) => Promise<boolean>;
  submitWeeklyReport: (
    report: WeeklyReport,
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void
  ) => Promise<boolean>;
}

/**
 * 週報のデータ取得とAPI通信を担当するフック
 * API呼び出し、データ変換、エラーハンドリング等を提供
 */
export const useWeeklyReportData = (): UseWeeklyReportDataReturn => {
  const { showSuccess, showError, showInfo } = useToast();

  // 週次レポートを取得
  const loadWeeklyReport = useCallback(async (
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void,
    setErrors: React.Dispatch<React.SetStateAction<WeeklyReportErrors>>,
    generateDailyRecords: (startDate: Date, endDate: Date) => DailyRecord[],
    signal?: AbortSignal,
    applyDefaultSettings?: (report: WeeklyReport) => WeeklyReport
  ) => {
    try {
      setLoading(true);
      
      DebugLogger.apiStart(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.READ, 
          description: '週報データ取得' 
        },
        { 
          url: '/api/v1/weekly-reports/current', 
          method: 'GET'
        }
      );
      
      const data = await getCurrentWeeklyReport(signal);
      
      if (data) {
        let uiReport = convertAPIResponseToUIModel(data);
        
        // 未提出の場合はデフォルト設定を適用
        if (applyDefaultSettings && uiReport.status === WEEKLY_REPORT_STATUS.NOT_SUBMITTED) {
          uiReport = applyDefaultSettings(uiReport);
        }
        
        setReport(uiReport);
        
        DebugLogger.apiSuccess(
          { 
            category: DEBUG_CATEGORIES.API, 
            operation: DEBUG_OPERATIONS.READ 
          },
          { 
            status: 200, 
            responseData: data,
            convertedResponseData: uiReport
          }
        );
      } else {
        // データがない場合は今週の新規週報として初期化
        const currentWeek = getCurrentWeek();
        const newDailyRecords = generateDailyRecords(currentWeek.startDate, currentWeek.endDate);
        
        let newReport: WeeklyReport = {
          startDate: currentWeek.startDate,
          endDate: currentWeek.endDate,
          id: undefined,
          submittedAt: undefined,
          status: WEEKLY_REPORT_STATUS.NOT_SUBMITTED,
          dailyRecords: newDailyRecords,
          mood: WEEKLY_REPORT_MOOD.NEUTRAL,
          weeklyRemarks: '',
          totalWorkHours: 0,
          clientTotalWorkHours: 0,
          workplaceChangeRequested: false,
        };
        
        // 新規週報にデフォルト設定を適用
        if (applyDefaultSettings) {
          newReport = applyDefaultSettings(newReport);
        }
        
        setReport(newReport);
        
        DebugLogger.debug(
          { 
            category: DEBUG_CATEGORIES.API, 
            operation: DEBUG_OPERATIONS.READ, 
            description: '週報データなし - 新規作成' 
          },
          '新規週報データを作成',
          { newDailyRecords }
        );
      }
    } catch (error) {
      // Abort関連のエラーは無視
      if (error instanceof AbortError) {
        return;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      
      DebugLogger.apiError(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.READ 
        },
        { 
          error: error as Error,
          metadata: { context: '週報データ取得' }
        }
      );
      
      // 新しいエラーハンドリングシステムを使用
      const processedError = handleApiError(error, '週報データ', { logContext: 'loadWeeklyReport' });
      setErrors(prev => ({ ...prev, fetch: processedError.message }));
    } finally {
      setLoading(false);
    }
  }, [showInfo]);

  // 指定された日付範囲で週報データを取得
  const loadWeeklyReportByDateRange = useCallback(async (
    startDate: Date,
    endDate: Date,
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void,
    generateDailyRecords: (startDate: Date, endDate: Date) => DailyRecord[],
    applyDefaultSettings?: (report: WeeklyReport) => WeeklyReport
  ): Promise<WeeklyReport | null> => {
    try {
      setLoading(true);
      
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      
      DebugLogger.apiStart(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.READ, 
          description: '日付範囲週報取得' 
        },
        { 
          url: `/api/v1/weekly-reports/range`, 
          method: 'GET',
          requestData: { startDate: startStr, endDate: endStr }
        }
      );
      
      const response = await getWeeklyReportByDateRange(startStr, endStr);
      
      if (response) {
        let uiReport = convertAPIResponseToUIModel(response);
        
        // 日次レコードが空の場合は生成する
        if (uiReport.dailyRecords.length === 0) {
          uiReport.dailyRecords = generateDailyRecords(uiReport.startDate, uiReport.endDate);
        }
        
        // 未提出の場合はデフォルト設定を適用
        if (applyDefaultSettings && uiReport.status === WEEKLY_REPORT_STATUS.NOT_SUBMITTED) {
          uiReport = applyDefaultSettings(uiReport);
        }
        
        setReport(uiReport);
        showInfo(SUCCESS_MESSAGES.WEEKLY_REPORT_LOADED);
        
        DebugLogger.apiSuccess(
          { 
            category: DEBUG_CATEGORIES.API, 
            operation: DEBUG_OPERATIONS.READ 
          },
          { 
            status: 200, 
            responseData: response,
            convertedResponseData: uiReport
          }
        );
        
        return uiReport;
      } else {
        // 既存のデータがない場合は新規週報として扱う
        const newDailyRecords = generateDailyRecords(startDate, endDate);
        
        let newReport: WeeklyReport = {
          startDate,
          endDate,
          id: undefined,
          submittedAt: undefined,
          status: WEEKLY_REPORT_STATUS.NOT_SUBMITTED,
          dailyRecords: newDailyRecords,
          mood: WEEKLY_REPORT_MOOD.NEUTRAL,
          weeklyRemarks: '',
          totalWorkHours: 0,
          clientTotalWorkHours: 0,
          workplaceChangeRequested: false,
        };
        
        // 新規週報にデフォルト設定を適用
        if (applyDefaultSettings) {
          newReport = applyDefaultSettings(newReport);
        }
        
        setReport(prev => ({ ...prev, ...newReport }));
        showInfo(SUCCESS_MESSAGES.WEEKLY_REPORT_CREATED);
        
        DebugLogger.debug(
          { 
            category: DEBUG_CATEGORIES.API, 
            operation: DEBUG_OPERATIONS.READ, 
            description: '週報データなし - 新規作成' 
          },
          '新規週報データを作成',
          { newReport }
        );
        
        return newReport;
      }
    } catch (error) {
      DebugLogger.apiError(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.READ 
        },
        { 
          error: error as Error,
          metadata: { context: '日付範囲週報取得', startDate, endDate }
        }
      );
      
      // 新しいエラーハンドリングシステムを使用
      const processedError = handleApiError(error, '週報データ', { logContext: 'loadWeeklyReportByDateRange' });
      showError(processedError.message);
      
      // エラー時も日付は更新
      const newDailyRecords = generateDailyRecords(startDate, endDate);
      setReport(prev => ({
        ...prev,
        startDate,
        endDate,
        dailyRecords: newDailyRecords,
      }));
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [showInfo, showError]);

  // 下書き保存
  const saveWeeklyReportDraft = useCallback(async (
    report: WeeklyReport,
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void
  ): Promise<boolean> => {
    try {
      setLoading(true);
      
      // APIリクエスト用のデータを準備
      const apiReport = convertUIModelToAPIRequest(report);
      
      DebugLogger.apiStart(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.CREATE, 
          description: '週報下書き保存' 
        },
        { 
          url: '/api/v1/weekly-reports/draft', 
          method: 'POST',
          requestData: report,
          convertedRequestData: apiReport
        }
      );
      
      // 下書き保存用のAPIを呼び出し
      const savedReport = await saveWeeklyReportAsDraft(apiReport);
      
      if (savedReport) {
        // ステータスと週報IDのみ更新
        setReport(prev => ({
          ...prev,
          id: savedReport.id || prev.id,
          status: savedReport.status || WEEKLY_REPORT_STATUS.DRAFT
        }));
        
        showSuccess(SUCCESS_MESSAGES.WEEKLY_REPORT_SAVED);
        
        DebugLogger.apiSuccess(
          { 
            category: DEBUG_CATEGORIES.API, 
            operation: DEBUG_OPERATIONS.CREATE 
          },
          { 
            status: 201, 
            responseData: savedReport
          }
        );
        
        return true;
      } else {
        throw new Error('保存後のレスポンスデータが空です');
      }
    } catch (error) {
      DebugLogger.apiError(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.CREATE 
        },
        { 
          error: error as Error,
          metadata: { context: '週報下書き保存' }
        }
      );
      
      // 新しいエラーハンドリングシステムを使用
      const processedError = handleApiError(error, '週報', { logContext: 'saveWeeklyReportDraft' });
      showError(processedError.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  // 週報提出
  const submitWeeklyReport = useCallback(async (
    report: WeeklyReport,
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void
  ): Promise<boolean> => {
    try {
      setLoading(true);
      
      // APIリクエスト用のデータを準備
      const apiReport = convertUIModelToAPIRequest(report);
      
      DebugLogger.apiStart(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.SUBMIT, 
          description: '週報提出' 
        },
        { 
          url: '/api/v1/weekly-reports/submit', 
          method: 'POST',
          requestData: report,
          convertedRequestData: apiReport
        }
      );
      
      // 提出用のAPIを呼び出し
      const submittedReport = await saveAndSubmitWeeklyReport(apiReport);
      
      if (submittedReport) {
        // ステータスと提出日時を更新
        setReport(prev => ({
          ...prev,
          id: submittedReport.id || prev.id,
          status: WEEKLY_REPORT_STATUS.SUBMITTED,
          submittedAt: submittedReport.submittedAt 
        }));
        
        showSuccess(SUCCESS_MESSAGES.WEEKLY_REPORT_SUBMITTED);
        
        DebugLogger.apiSuccess(
          { 
            category: DEBUG_CATEGORIES.API, 
            operation: DEBUG_OPERATIONS.SUBMIT 
          },
          { 
            status: 201, 
            responseData: submittedReport
          }
        );
        
        return true;
      } else {
        throw new Error('提出後のレスポンスデータが空です');
      }
    } catch (error) {
      DebugLogger.apiError(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.SUBMIT 
        },
        { 
          error: error as Error,
          metadata: { context: '週報提出' }
        }
      );
      
      // 新しいエラーハンドリングシステムを使用
      const processedError = handleApiError(error, '週報', { logContext: 'submitWeeklyReport' });
      showError(processedError.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  return {
    loadWeeklyReport,
    loadWeeklyReportByDateRange,
    saveWeeklyReportDraft,
    submitWeeklyReport,
  };
};