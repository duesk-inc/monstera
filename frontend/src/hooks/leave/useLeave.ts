import { useAbortableEffect } from '@/hooks/common/useAbortableEffect';

// 分離したフックをインポート
import { useLeaveState } from './useLeaveState';
import { useLeaveData, AttendanceFormData } from './useLeaveData';
import { useLeaveValidation } from './useLeaveValidation';
import { useLeaveCalculation, LeaveTypeOption } from './useLeaveCalculation';

export interface UseLeaveProps {
  userGender?: string;
}

export interface UseLeaveReturn {
  leaveTypesData: ReturnType<typeof useLeaveState>['leaveTypesData'];
  userLeaveBalances: ReturnType<typeof useLeaveState>['userLeaveBalances'];
  leaveRequests: ReturnType<typeof useLeaveState>['leaveRequests'];
  loadingState: ReturnType<typeof useLeaveState>['loadingState'];
  apiErrors: ReturnType<typeof useLeaveState>['apiErrors'];
  LEAVE_TYPES: LeaveTypeOption[];
  REMAINING_LEAVES: ReturnType<typeof useLeaveCalculation>['REMAINING_LEAVES'];
  submitLeaveRequest: (formData: AttendanceFormData, totalLeaveDays: number) => Promise<{ success: boolean; error?: Error }>;
  isReasonRequired: (selectedLeaveType: string) => boolean;
  getLeaveTypeLabel: (leaveTypeValue: string) => string;
  getStatusChip: (status: string) => { color: string; label: string; };
  setApiErrors: ReturnType<typeof useLeaveState>['setApiErrors'];
  setLoadingState: ReturnType<typeof useLeaveState>['setLoadingState'];
  balancesFetched: ReturnType<typeof useLeaveState>['balancesFetched'];
  setLeaveRequests: ReturnType<typeof useLeaveState>['setLeaveRequests'];
  getLeaveRequests: () => Promise<ReturnType<typeof useLeaveState>['leaveRequests']>;
  getLeaveTypeCode: (leaveTypeId: string) => string | null;
  loadInitialData: () => Promise<void>;
}

// AttendanceFormDataを再エクスポート
export type { AttendanceFormData };

/**
 * 休暇申請データの取得と更新を管理する統合カスタムフック
 * 複数の専門フックを組み合わせて、既存のインターフェースと互換性を保つ
 */
export const useLeave = ({ userGender = 'not_specified' }: UseLeaveProps = {}): UseLeaveReturn => {
  
  // 専門フックを使用
  const {
    leaveTypesData,
    setLeaveTypesData,
    userLeaveBalances,
    setUserLeaveBalances,
    leaveRequests,
    setLeaveRequests,
    loadingState,
    setLoadingState,
    apiErrors,
    setApiErrors,
    balancesFetched,
    setBalancesFetched,
  } = useLeaveState();

  const {
    loadInitialData,
    submitLeaveRequest: submitRequest,
    fetchLeaveRequests,
  } = useLeaveData();

  const {
    isReasonRequired,
    getLeaveTypeCode,
    getStatusChip,
    getLeaveTypeLabel: getLabel,
  } = useLeaveValidation();

  const {
    LEAVE_TYPES,
    REMAINING_LEAVES,
  } = useLeaveCalculation(leaveTypesData, userLeaveBalances, userGender);

  // 初期データ取得
  useAbortableEffect(async (signal) => {
    await loadInitialData(
      setLeaveTypesData,
      setUserLeaveBalances,
      setLeaveRequests,
      setLoadingState,
      setApiErrors,
      setBalancesFetched,
      signal
    );
  }, [loadInitialData, setLeaveTypesData, setUserLeaveBalances, setLeaveRequests, setLoadingState, setApiErrors, setBalancesFetched]);

  // ラップした関数たち
  const submitLeaveRequest = async (formData: AttendanceFormData, totalLeaveDays: number): Promise<{ success: boolean; error?: Error }> => {
    return await submitRequest(formData, totalLeaveDays, setLoadingState);
  };

  const getLeaveRequests = async () => {
    return await fetchLeaveRequests(setLeaveRequests, setLoadingState, setApiErrors);
  };

  const getLeaveTypeLabel = (leaveTypeValue: string): string => {
    return getLabel(leaveTypeValue, leaveTypesData);
  };

  const reloadInitialData = async () => {
    await loadInitialData(
      setLeaveTypesData,
      setUserLeaveBalances,
      setLeaveRequests,
      setLoadingState,
      setApiErrors,
      setBalancesFetched
    );
  };

  return {
    leaveTypesData,
    userLeaveBalances,
    leaveRequests,
    loadingState,
    apiErrors,
    LEAVE_TYPES,
    REMAINING_LEAVES,
    submitLeaveRequest,
    isReasonRequired,
    getLeaveTypeLabel,
    getStatusChip,
    setApiErrors,
    setLoadingState,
    balancesFetched,
    setLeaveRequests,
    getLeaveRequests,
    getLeaveTypeCode,
    loadInitialData: reloadInitialData,
  };
};