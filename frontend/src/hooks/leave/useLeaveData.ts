import { useCallback } from 'react';
import { format } from 'date-fns';
import { 
  getLeaveTypes as apiGetLeaveTypes,
  getUserLeaveBalances as apiGetUserLeaveBalances,
  getLeaveRequests as apiGetLeaveRequests,
  createLeaveRequest as apiCreateLeaveRequest
} from '@/lib/api/leave';
import { 
  LeaveType, 
  UserLeaveBalance, 
  LeaveRequestRequest, 
  LeaveRequestResponse,
  LeaveRequestDetail
} from '@/types/leave';
import { errorDev } from '@/lib/utils/logger';
import { AbortError, handleApiError } from '../../lib/api/error';
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';

export interface AttendanceFormData {
  leaveTypeId: string;
  selectedDates: Date[];
  isHourlyBased: boolean;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface UseLeaveDataReturn {
  loadInitialData: (
    setLeaveTypesData: React.Dispatch<React.SetStateAction<LeaveType[]>>,
    setUserLeaveBalances: React.Dispatch<React.SetStateAction<UserLeaveBalance[]>>,
    setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequestResponse[]>>,
    setLoadingState: React.Dispatch<React.SetStateAction<{
      types: boolean;
      balances: boolean;
      requests: boolean;
      submit: boolean;
    }>>,
    setApiErrors: React.Dispatch<React.SetStateAction<{
      types: string | null;
      balances: string | null;
      requests: string | null;
    }>>,
    setBalancesFetched: React.Dispatch<React.SetStateAction<boolean>>,
    signal?: AbortSignal
  ) => Promise<void>;
  submitLeaveRequest: (
    formData: AttendanceFormData,
    totalLeaveDays: number,
    setLoadingState: React.Dispatch<React.SetStateAction<{
      types: boolean;
      balances: boolean;
      requests: boolean;
      submit: boolean;
    }>>
  ) => Promise<{ success: boolean; error?: Error }>;
  fetchLeaveRequests: (
    setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequestResponse[]>>,
    setLoadingState: React.Dispatch<React.SetStateAction<{
      types: boolean;
      balances: boolean;
      requests: boolean;
      submit: boolean;
    }>>,
    setApiErrors: React.Dispatch<React.SetStateAction<{
      types: string | null;
      balances: string | null;
      requests: string | null;
    }>>
  ) => Promise<LeaveRequestResponse[]>;
}

/**
 * 休暇申請のデータ取得とAPI通信を担当するフック
 * 初期データ取得、申請送信、履歴取得等を提供
 */
export const useLeaveData = (): UseLeaveDataReturn => {

  // Abort関連エラーの判定
  const isAbortRelatedError = (error: any): boolean => {
    if (error instanceof AbortError) return true;
    if (error instanceof DOMException && error.name === 'AbortError') return true;
    if (error && typeof error === 'object') {
      const errorObj = error as { name?: string; code?: string; message?: string };
      if (errorObj.name === 'CanceledError' || errorObj.code === 'ERR_CANCELED' || errorObj.message === 'canceled') {
        return true;
      }
    }
    return false;
  };

  // 初期データの読み込み
  const loadInitialData = useCallback(async (
    setLeaveTypesData: React.Dispatch<React.SetStateAction<LeaveType[]>>,
    setUserLeaveBalances: React.Dispatch<React.SetStateAction<UserLeaveBalance[]>>,
    setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequestResponse[]>>,
    setLoadingState: React.Dispatch<React.SetStateAction<{
      types: boolean;
      balances: boolean;
      requests: boolean;
      submit: boolean;
    }>>,
    setApiErrors: React.Dispatch<React.SetStateAction<{
      types: string | null;
      balances: string | null;
      requests: string | null;
    }>>,
    setBalancesFetched: React.Dispatch<React.SetStateAction<boolean>>,
    signal?: AbortSignal
  ) => {
    try {
      // 全てのローディング状態を開始
      setLoadingState({ types: true, balances: true, requests: true, submit: false });
      
      DebugLogger.apiStart(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.READ, 
          description: '休暇初期データ取得' 
        },
        { 
          url: 'multiple endpoints', 
          method: 'GET',
          metadata: { endpoints: ['leave-types', 'leave-balances', 'leave-requests'] }
        }
      );

      // 3つのAPIを並列で実行
      const [types, balances, requests] = await Promise.allSettled([
        apiGetLeaveTypes(signal),
        apiGetUserLeaveBalances(signal),
        apiGetLeaveRequests(signal)
      ]);

      // 休暇種別の処理
      if (types.status === 'fulfilled') {
        setLeaveTypesData(types.value);
        setApiErrors(prev => ({ ...prev, types: null }));
      } else {
        if (!isAbortRelatedError(types.reason)) {
          DebugLogger.apiError(
            { 
              category: DEBUG_CATEGORIES.API, 
              operation: DEBUG_OPERATIONS.READ,
              description: '休暇種別取得エラー' 
            },
            { 
              error: types.reason as Error,
              metadata: { context: '休暇種別データ取得' }
            }
          );
          const errorMessage = types.reason instanceof Error ? types.reason.message : '休暇種別の取得に失敗しました';
          setApiErrors(prev => ({ ...prev, types: errorMessage }));
        }
      }

      // 残日数の処理
      if (balances.status === 'fulfilled') {
        setUserLeaveBalances(balances.value);
        setApiErrors(prev => ({ ...prev, balances: null }));
        setBalancesFetched(true);
      } else {
        if (!isAbortRelatedError(balances.reason)) {
          DebugLogger.apiError(
            { 
              category: DEBUG_CATEGORIES.API, 
              operation: DEBUG_OPERATIONS.READ,
              description: '休暇残日数取得エラー' 
            },
            { 
              error: balances.reason as Error,
              metadata: { context: '休暇残日数データ取得' }
            }
          );
          const errorMessage = balances.reason instanceof Error ? balances.reason.message : '休暇残日数の取得に失敗しました';
          setApiErrors(prev => ({ ...prev, balances: errorMessage }));
          setBalancesFetched(false);
        }
      }

      // 休暇申請履歴の処理
      if (requests.status === 'fulfilled') {
        setLeaveRequests(requests.value);
        setApiErrors(prev => ({ ...prev, requests: null }));
      } else {
        if (!isAbortRelatedError(requests.reason)) {
          DebugLogger.apiError(
            { 
              category: DEBUG_CATEGORIES.API, 
              operation: DEBUG_OPERATIONS.READ,
              description: '休暇申請履歴取得エラー' 
            },
            { 
              error: requests.reason as Error,
              metadata: { context: '休暇申請履歴データ取得' }
            }
          );
          const errorMessage = requests.reason instanceof Error ? requests.reason.message : '休暇申請履歴の取得に失敗しました';
          setApiErrors(prev => ({ ...prev, requests: errorMessage }));
        }
      }

      DebugLogger.apiSuccess(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.READ 
        },
        { 
          status: 200,
          metadata: { 
            typesCount: types.status === 'fulfilled' ? types.value.length : 0,
            balancesCount: balances.status === 'fulfilled' ? balances.value.length : 0,
            requestsCount: requests.status === 'fulfilled' ? requests.value.length : 0
          }
        }
      );

    } catch (error) {
      // Abort関連のエラーは無視
      if (isAbortRelatedError(error)) {
        return;
      }
      
      DebugLogger.apiError(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.READ,
          description: '休暇初期データ取得エラー' 
        },
        { 
          error: error as Error,
          metadata: { context: '初期データ取得処理全体' }
        }
      );
      const errorMessage = error instanceof Error ? error.message : '初期データの取得に失敗しました';
      setApiErrors({
        types: errorMessage,
        balances: errorMessage,
        requests: errorMessage
      });
    } finally {
      // 全てのローディング状態を終了
      setLoadingState(prev => ({ 
        ...prev, 
        types: false, 
        balances: false, 
        requests: false 
      }));
    }
     
  }, []);

  // 休暇申請の送信
  const submitLeaveRequest = useCallback(async (
    formData: AttendanceFormData, 
    totalLeaveDays: number,
    setLoadingState: React.Dispatch<React.SetStateAction<{
      types: boolean;
      balances: boolean;
      requests: boolean;
      submit: boolean;
    }>>
  ): Promise<{ success: boolean; error?: Error }> => {
    try {
      setLoadingState(prev => ({ ...prev, submit: true }));
      
      // 日付の重複チェック
      const selectedDates = formData.selectedDates.map(date => ({
        date,
        dateString: format(date, 'yyyy-MM-dd')
      }));
      
      // 日付文字列でのソートとユニーク化
      selectedDates.sort((a, b) => a.dateString.localeCompare(b.dateString));
      
      // 重複チェック
      const uniqueDates: typeof selectedDates = [];
      const duplicateDates: string[] = [];
      
      for (let i = 0; i < selectedDates.length; i++) {
        const current = selectedDates[i];
        
        if (i > 0 && current.dateString === selectedDates[i-1].dateString) {
          duplicateDates.push(current.dateString);
        } else {
          uniqueDates.push(current);
        }
      }
      
      if (duplicateDates.length > 0) {
        DebugLogger.validation(
          { 
            category: DEBUG_CATEGORIES.VALIDATION, 
            operation: DEBUG_OPERATIONS.VALIDATE,
            description: '休暇日付重複チェック' 
          },
          false,
          { duplicateDates },
          formData
        );
        return { success: false, error: new Error(`重複した日付が含まれています: ${duplicateDates.join(', ')}`) };
      }

      // LeaveRequestDetailの配列を作成
      const leaveRequestDetails: LeaveRequestDetail[] = uniqueDates.map(({ date }) => ({
        leaveDate: format(date, 'yyyy-MM-dd'),
        startTime: formData.isHourlyBased ? formData.startTime : null,
        endTime: formData.isHourlyBased ? formData.endTime : null,
        dayValue: formData.isHourlyBased ? 0.5 : 1.0,  // 時間単位の場合は0.5日、それ以外は1日
      }));

      // APIリクエストを作成
      const leaveRequest: LeaveRequestRequest = {
        leaveTypeId: formData.leaveTypeId,
        reason: formData.reason,
        totalDays: totalLeaveDays,
        requestDetails: leaveRequestDetails
      };
      
      DebugLogger.apiStart(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.CREATE, 
          description: '休暇申請送信' 
        },
        { 
          url: '/api/leave-requests', 
          method: 'POST',
          requestData: formData,
          convertedRequestData: leaveRequest
        }
      );

      // APIを呼び出し
      await apiCreateLeaveRequest(leaveRequest);
      
      DebugLogger.apiSuccess(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.CREATE 
        },
        { 
          status: 201,
          metadata: { 
            leaveTypeId: formData.leaveTypeId,
            totalDays: totalLeaveDays,
            datesCount: leaveRequestDetails.length
          }
        }
      );
      
      return { success: true };
      
    } catch (error) {
      DebugLogger.apiError(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.CREATE,
          description: '休暇申請送信エラー' 
        },
        { 
          error: error as Error,
          metadata: { 
            leaveTypeId: formData.leaveTypeId,
            totalDays: totalLeaveDays
          }
        }
      );
      
      // APIエラーハンドリングを使用してより詳細なエラー情報を提供
      const processedError = handleApiError(error, '休暇申請');
      return { success: false, error: processedError };
    } finally {
      setLoadingState(prev => ({ ...prev, submit: false }));
    }
     
  }, []);

  // 休暇申請履歴の取得
  const fetchLeaveRequests = useCallback(async (
    setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequestResponse[]>>,
    setLoadingState: React.Dispatch<React.SetStateAction<{
      types: boolean;
      balances: boolean;
      requests: boolean;
      submit: boolean;
    }>>,
    setApiErrors: React.Dispatch<React.SetStateAction<{
      types: string | null;
      balances: string | null;
      requests: string | null;
    }>>
  ): Promise<LeaveRequestResponse[]> => {
    try {
      setLoadingState(prev => ({ ...prev, requests: true }));
      setApiErrors(prev => ({ ...prev, requests: null }));
      
      DebugLogger.apiStart(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.READ, 
          description: '休暇申請履歴取得' 
        },
        { 
          url: '/api/leave-requests', 
          method: 'GET'
        }
      );
      
      const requests = await apiGetLeaveRequests();
      setLeaveRequests(requests);
      
      DebugLogger.apiSuccess(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.READ 
        },
        { 
          status: 200,
          responseData: requests,
          metadata: { requestsCount: requests.length }
        }
      );
      
      return requests;
    } catch (error) {
      // Abort関連のエラーは無視
      if (isAbortRelatedError(error)) {
        return [];
      }
      
      DebugLogger.apiError(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.READ,
          description: '休暇申請履歴取得エラー' 
        },
        { 
          error: error as Error,
          metadata: { context: '休暇申請履歴取得' }
        }
      );
      const errorMessage = error instanceof Error ? error.message : '休暇申請履歴の取得に失敗しました';
      setApiErrors(prev => ({ ...prev, requests: errorMessage }));
      return [];
    } finally {
      setLoadingState(prev => ({ ...prev, requests: false }));
    }
     
  }, []);

  return {
    loadInitialData,
    submitLeaveRequest,
    fetchLeaveRequests,
  };
};