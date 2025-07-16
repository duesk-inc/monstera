import React from 'react';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import { format, isSameDay, isWeekend } from 'date-fns';
import { StatusBadge } from '@/components/common';

// 日付を正規化する関数（日付部分のみを保持し、時間部分をリセット）
export const normalizeDate = (date: Date): Date => {
  // 無効なDateオブジェクトのチェック
  if (!date || isNaN(date.getTime())) {
    console.warn('Invalid date provided to normalizeDate:', date);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()); // 現在日を代替として使用
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

// 日付選択の状態をチェックする関数
export const isDateSelected = (selectedDates: Date[], day: Date): boolean => {
  // 元の日付オブジェクトを変更せずに新しいオブジェクトで比較
  const normalizedDay = normalizeDate(day);
  
  return selectedDates.some(selectedDate => {
    const normalizedSelected = normalizeDate(selectedDate);
    return isSameDay(normalizedSelected, normalizedDay);
  });
};

// 日付が指定された月範囲内に含まれるかチェックする関数
export const isDateInMonths = (day: Date, months: Date[]): boolean => {
  return months.some(month => 
    month.getMonth() === day.getMonth() && 
    month.getFullYear() === day.getFullYear()
  );
};

// 日付に一貫性のあるキーを生成する関数
export const getConsistentDateKey = (date: Date): string => {
  // 無効なDateオブジェクトのチェック
  if (!date || isNaN(date.getTime())) {
    console.warn('Invalid date provided to getConsistentDateKey:', date);
    return 'invalid-date';
  }
  // YYYY-MM-DD形式の文字列を返す
  return format(date, 'yyyy-MM-dd');
};

// カスタムピッカー日コンポーネント定義
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CustomPickersDay = (props: any) => {
  const {
    day,
    selectedDates = [],
    takenLeaveDates = [],
    outsideCurrentMonth = false,
    ...other
  } = props;
  
  // 日付が土日かどうかを判定
  const dayIsWeekend = isWeekend(day);
  
  // 選択中の日付かどうかを判定
  const isSelected = selectedDates.some(
    (selectedDate: Date) => isSameDay(day, selectedDate)
  );
  
  // 既に休暇申請済みの日かどうかを判定
  const formattedDate = format(day, 'yyyy-MM-dd');
  const isTakenLeaveDate = takenLeaveDates.includes(formattedDate);
  
  // ステータスを決定
  let status: 'selected' | 'taken' | 'available' = 'available';
  if (isSelected) {
    status = 'selected';
  } else if (isTakenLeaveDate) {
    status = 'taken';
  }
  
  // デバッグ用日付スタイル
  let dayStyle = {};
  
  if (isTakenLeaveDate) {
    // 申請済み日の場合
    dayStyle = {
      bgcolor: 'rgba(211, 47, 47, 0.1)', // 赤みがかった背景色
      color: '#d32f2f', // 赤色のテキスト
      borderRadius: '50%',
      fontWeight: 'bold',
    };
  } else if (dayIsWeekend) {
    // 土日の場合
    dayStyle = {
      bgcolor: 'rgba(0, 0, 0, 0.1)', // 灰色の背景
      color: 'text.disabled', // 薄いテキスト色
    };
  }
  
  const dayElement = (
    <PickersDay
      {...other}
      day={day}
      outsideCurrentMonth={outsideCurrentMonth}
      selected={isSelected}
      sx={{
        ...dayStyle,
        // 選択時のスタイル
        '&.Mui-selected': {
          backgroundColor: isTakenLeaveDate
            ? 'rgba(211, 47, 47, 0.3)' // 申請済みで選択時
            : 'primary.main',
          color: isTakenLeaveDate
            ? '#d32f2f'
            : 'white',
          fontWeight: 'bold',
        },
      }}
    />
  );
  
  // ステータスバッジを表示する場合
  if (status !== 'available') {
    return (
      <StatusBadge
        status={status}
        variant="dot"
        size="small"
        key={day.toString()}
      >
        {dayElement}
      </StatusBadge>
    );
  }
  
  return dayElement;
}; 