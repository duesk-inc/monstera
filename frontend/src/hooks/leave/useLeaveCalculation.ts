import { useMemo } from 'react';
import { LeaveType, UserLeaveBalance } from '@/types/leave';

export type LeaveTypeOption = {
  value: string;
  label: string;
};

export interface UseLeaveCalculationReturn {
  LEAVE_TYPES: LeaveTypeOption[];
  REMAINING_LEAVES: Record<string, { 
    id: string; 
    code: string; 
    name: string; 
    total: number; 
    used: number; 
    remaining: number; 
  }>;
}

/**
 * 休暇申請の計算処理を担当するフック
 * 休暇種別オプション、残日数計算等を提供
 */
export const useLeaveCalculation = (
  leaveTypesData: LeaveType[],
  userLeaveBalances: UserLeaveBalance[],
  userGender: string
): UseLeaveCalculationReturn => {

  // 休暇種類オプション - 生理休暇は女性ユーザーのみに表示し、付与日数が0のものは除外
  const LEAVE_TYPES = useMemo(() => {
    if (leaveTypesData.length === 0) {
      const types = [
        { value: 'paid', label: '有給休暇' },
        { value: 'summer', label: '夏季休暇' },
        { value: 'condolence', label: '慶弔休暇' },
        { value: 'special', label: '特別休暇' },
        { value: 'substitute', label: '振替特別休暇' },
      ];
      
      // 女性ユーザーの場合のみ生理休暇を追加
      if (userGender === 'female') {
        types.push({ value: 'menstrual', label: '生理休暇' });
      }
      
      // 振替特別休暇の表示制御（APIデータ取得前の初期表示制御）
      return types.filter(type => {
        // 振替特別休暇はバックエンドからの残日数データに基づいて表示判定
        if (type.value === 'substitute') {
          // userLeaveBalancesからsubstituteの残日数を探す
          const substituteBalance = userLeaveBalances.find(
            balance => {
              // まだAPIからデータが取得できていない場合は念のため0件とみなす
              if (!leaveTypesData.length) return false;
              
              const leaveType = leaveTypesData.find(lt => lt.code === 'substitute');
              return leaveType && balance.leaveTypeId === leaveType.id;
            }
          );
          
          // 残日数が1日以上ある場合のみ表示
          return substituteBalance && substituteBalance.remainingDays > 0;
        }
        return true;
      });
    }
    
    // APIデータが取得済みの場合の処理
    return leaveTypesData
      .filter(type => {
        // 付与日数が0の休暇種別は除外
        const leaveType = leaveTypesData.find(t => t.id === type.value);
        if (!leaveType) return true; // データが見つからない場合は表示
        
        // 振替特別休暇は残日数がある場合のみ表示
        if (type.code === 'substitute') {
          const substituteBalance = userLeaveBalances.find(balance => balance.leaveTypeId === type.value);
          return substituteBalance && substituteBalance.remainingDays > 0;
        }
        
        // その他の休暇種別も残日数チェック
        const leaveBalance = userLeaveBalances.find(balance => balance.leaveTypeId === type.value);
        return !leaveBalance || leaveBalance.totalDays > 0;
      })
      .map(type => ({
        value: type.id,
        label: type.name
      }));
  }, [leaveTypesData, userLeaveBalances, userGender]);

  // 残日数データのマッピング
  const REMAINING_LEAVES = useMemo(() => {
    if (userLeaveBalances.length === 0) return {};
    
    const balances: Record<string, { 
      id: string, 
      code: string, 
      name: string, 
      total: number, 
      used: number, 
      remaining: number 
    }> = {};
    
    userLeaveBalances.forEach(balance => {
      const leaveType = leaveTypesData.find(lt => lt.id === balance.leaveTypeId);
      if (leaveType) {
        balances[balance.leaveTypeId] = {
          id: balance.leaveTypeId,
          code: leaveType.code,
          name: balance.leaveTypeName,
          total: balance.totalDays,
          used: balance.usedDays,
          remaining: balance.remainingDays
        };
      }
    });
    
    return balances;
  }, [userLeaveBalances, leaveTypesData]);

  return {
    LEAVE_TYPES,
    REMAINING_LEAVES,
  };
};