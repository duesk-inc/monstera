import { useState } from 'react';
import { LeaveType, UserLeaveBalance, LeaveRequestResponse } from '@/types/leave';

export interface UseLeaveStateReturn {
  leaveTypesData: LeaveType[];
  setLeaveTypesData: React.Dispatch<React.SetStateAction<LeaveType[]>>;
  userLeaveBalances: UserLeaveBalance[];
  setUserLeaveBalances: React.Dispatch<React.SetStateAction<UserLeaveBalance[]>>;
  leaveRequests: LeaveRequestResponse[];
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequestResponse[]>>;
  loadingState: {
    types: boolean;
    balances: boolean;
    requests: boolean;
    submit: boolean;
  };
  setLoadingState: React.Dispatch<React.SetStateAction<{
    types: boolean;
    balances: boolean;
    requests: boolean;
    submit: boolean;
  }>>;
  apiErrors: {
    types: string | null;
    balances: string | null;
    requests: string | null;
  };
  setApiErrors: React.Dispatch<React.SetStateAction<{
    types: string | null;
    balances: string | null;
    requests: string | null;
  }>>;
  balancesFetched: boolean;
  setBalancesFetched: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * 休暇申請の基本的な状態管理を担当するフック
 * 状態の初期化、取得、更新機能を提供
 */
export const useLeaveState = (): UseLeaveStateReturn => {
  // 休暇種別のデータ状態
  const [leaveTypesData, setLeaveTypesData] = useState<LeaveType[]>([]);
  
  // ユーザーの休暇残日数データ状態
  const [userLeaveBalances, setUserLeaveBalances] = useState<UserLeaveBalance[]>([]);
  
  // 申請履歴データ状態
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestResponse[]>([]);
  
  // データ読み込み中の状態表示用の変数
  const [loadingState, setLoadingState] = useState({
    types: false,
    balances: false,
    requests: false,
    submit: false
  });
  
  // 残日数データの取得完了フラグ
  const [balancesFetched, setBalancesFetched] = useState(false);

  // エラー状態
  const [apiErrors, setApiErrors] = useState<{
    types: string | null;
    balances: string | null;
    requests: string | null;
  }>({
    types: null,
    balances: null,
    requests: null
  });

  return {
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
  };
};