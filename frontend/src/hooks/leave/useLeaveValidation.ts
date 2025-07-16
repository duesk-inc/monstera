import { useCallback } from 'react';
import { LeaveType } from '@/types/leave';

// 理由入力が必要な休暇タイプ
const REQUIRES_REASON = ['condolence', 'special'];

// 特別休暇と慶弔休暇のID（UUIDとコードのマッピング）
const SPECIAL_LEAVE_TYPES_UUID = {
  CONDOLENCE: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', // 慶弔休暇
  SPECIAL: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', // 特別休暇
};

export interface UseLeaveValidationReturn {
  isReasonRequired: (selectedLeaveType: string) => boolean;
  getLeaveTypeCode: (leaveTypeId: string) => string | null;
  getStatusChip: (status: string) => { color: string; label: string; };
  getLeaveTypeLabel: (leaveTypeValue: string, leaveTypesData: LeaveType[]) => string;
}

/**
 * 休暇申請のバリデーション処理を担当するフック
 * 理由必須チェック、ステータス処理、ラベル取得等を提供
 */
export const useLeaveValidation = (): UseLeaveValidationReturn => {

  // 理由入力必須判定
  const isReasonRequired = useCallback((selectedLeaveType: string): boolean => {
    // selectedLeaveTypeがUUIDの場合
    if (selectedLeaveType === SPECIAL_LEAVE_TYPES_UUID.CONDOLENCE || 
        selectedLeaveType === SPECIAL_LEAVE_TYPES_UUID.SPECIAL) {
      return true;
    }
    
    // selectedLeaveTypeがコード文字列の場合
    return REQUIRES_REASON.includes(selectedLeaveType);
  }, []);

  // 休暇種別IDからコードを取得
  const getLeaveTypeCode = useCallback((leaveTypeId: string): string | null => {
    // UUID形式の場合の判定
    if (leaveTypeId === SPECIAL_LEAVE_TYPES_UUID.CONDOLENCE) {
      return 'condolence';
    } else if (leaveTypeId === SPECIAL_LEAVE_TYPES_UUID.SPECIAL) {
      return 'special';
    }
    
    // leaveTypeIdがコード文字列自体の場合
    if (REQUIRES_REASON.includes(leaveTypeId)) {
      return leaveTypeId;
    }
    
    return null;
  }, []);

  // ステータスチップの取得
  const getStatusChip = useCallback((status: string): { color: string; label: string; } => {
    switch (status) {
      case 'pending':
        return { color: 'warning', label: '承認待ち' };
      case 'approved':
        return { color: 'success', label: '承認済み' };
      case 'rejected':
        return { color: 'error', label: '却下' };
      default:
        return { color: 'default', label: '不明' };
    }
  }, []);

  // 休暇種別のラベル取得
  const getLeaveTypeLabel = useCallback((leaveTypeValue: string, leaveTypesData: LeaveType[]): string => {
    const leaveType = leaveTypesData.find(type => type.id === leaveTypeValue);
    if (leaveType) {
      return leaveType.name;
    }
    
    // フォールバック: よく使われる休暇種別のラベル
    const fallbackLabels: Record<string, string> = {
      'paid': '有給休暇',
      'summer': '夏季休暇',
      'condolence': '慶弔休暇',
      'special': '特別休暇',
      'substitute': '振替特別休暇',
      'menstrual': '生理休暇'
    };
    
    return fallbackLabels[leaveTypeValue] || '不明な休暇種別';
  }, []);

  return {
    isReasonRequired,
    getLeaveTypeCode,
    getStatusChip,
    getLeaveTypeLabel,
  };
};