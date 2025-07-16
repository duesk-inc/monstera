import { useState, useCallback } from 'react';
import { format, addMonths, startOfMonth, isBefore, startOfDay } from 'date-fns';

interface UseLeaveCalendarProps {
  initialStartDate?: Date;
  takenLeaveDates: string[];
}

interface DateWarningResult {
  warning: string | null;
}

export const useLeaveCalendar = ({
  initialStartDate,
  takenLeaveDates
}: UseLeaveCalendarProps) => {
  const today = new Date();
  const defaultFirstDay = initialStartDate 
    ? new Date(initialStartDate) 
    : startOfMonth(today);
  const defaultNextMonth = addMonths(new Date(defaultFirstDay), 1);
  
  const [calendarMonths, setCalendarMonths] = useState<Date[]>([defaultFirstDay, defaultNextMonth]);
  
  // カレンダー月の更新処理
  const updateCalendarMonths = useCallback((action: 'prev' | 'next' | 'today') => {
    if (action === 'today') {
      const firstDayOfCurrentMonth = startOfMonth(today);
      const nextMonth = addMonths(new Date(firstDayOfCurrentMonth), 1);
      setCalendarMonths([firstDayOfCurrentMonth, nextMonth]);
      return;
    }
    
    const monthDiff = action === 'prev' ? -2 : 2;
    setCalendarMonths(prev => [
      addMonths(prev[0], monthDiff),
      addMonths(prev[1], monthDiff)
    ]);
  }, [today]);

  // 土日判定
  const isWeekendDay = useCallback((date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0=日曜日, 6=土曜日
  }, []);
  
  // 表示中の月以外の日付かどうかチェック
  const isOutsideDisplayMonths = useCallback((date: Date): boolean => {
    return !calendarMonths.some(month => 
      month.getMonth() === date.getMonth() && 
      month.getFullYear() === date.getFullYear()
    );
  }, [calendarMonths]);
  
  // 申請済み日付かどうかチェック
  const isDateAlreadyTaken = useCallback((date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return takenLeaveDates.includes(dateStr);
  }, [takenLeaveDates]);
  
  // 日付が既に選択済みかチェック
  const isDateAlreadySelected = useCallback((date: Date, selectedDates: Date[]): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return selectedDates.some(existingDate => {
      const existingDateStr = format(new Date(existingDate), 'yyyy-MM-dd');
      return existingDateStr === dateStr;
    });
  }, []);
  
  // 警告表示用の関数
  const showDateWarning = useCallback((date: Date): string | null => {
    // 土日チェック
    if (isWeekendDay(date)) {
      return '週末（土日）は選択できません';
    }
    
    // 過去の日付チェック
    if (isBefore(date, startOfDay(new Date()))) {
      return '過去の日付は選択できません';
    }
    
    // 申請済みチェック
    if (isDateAlreadyTaken(date)) {
      return 'この日付は既に休暇申請されています';
    }
    
    return null;
  }, [isWeekendDay, isDateAlreadyTaken]);

  // 日付選択のハンドラー生成関数
  const createDateSelectHandler = useCallback((
    selectedDates: Date[],
    setSelectedDates: (dates: Date[]) => void
  ) => {
    return (date: Date): DateWarningResult => {
      // 受け取った日付のコピーを作成して元のオブジェクトを変更しない
      const selectedDate = new Date(date);
      
      // 時刻部分を00:00:00に統一して比較の一貫性を確保
      selectedDate.setHours(0, 0, 0, 0);
      
      // 土日は選択できないようにする
      if (isWeekendDay(selectedDate)) {
        return { warning: '週末（土日）は選択できません' };
      }
      
      // 過去の日付は選択できないようにする
      if (isBefore(selectedDate, startOfDay(new Date()))) {
        return { warning: '過去の日付は選択できません' };
      }
      
      // 表示中の月以外の日付は選択できないようにする
      if (isOutsideDisplayMonths(selectedDate)) {
        return { warning: null };
      }
      
      // 日付文字列を生成（YYYY-MM-DD形式）
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // 既に休暇申請済みの日付かどうか確認
      if (takenLeaveDates.includes(dateStr)) {
        return { warning: 'この日付は既に休暇申請されています' };
      }
      
      // 既に選択済みの場合は選択解除、そうでなければ追加
      if (isDateAlreadySelected(selectedDate, selectedDates)) {
        const newSelectedDates = selectedDates.filter(existingDate => {
          const existingDateStr = format(new Date(existingDate), 'yyyy-MM-dd');
          return existingDateStr !== dateStr;
        });
        setSelectedDates(newSelectedDates);
      } else {
        // 重複チェック
        const isDuplicate = selectedDates.some(existingDate => {
          return format(existingDate, 'yyyy-MM-dd') === dateStr;
        });
        
        if (!isDuplicate) {
          setSelectedDates([...selectedDates, selectedDate]);
        }
      }
      
      return { warning: null };
    };
  }, [isWeekendDay, isOutsideDisplayMonths, takenLeaveDates, isDateAlreadySelected]);
  
  // 重複チェック用の関数
  const findDuplicateDates = useCallback((dates: Date[]): string[] => {
    const uniqueDates = new Set<string>();
    const duplicates: string[] = [];
    
    dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      if (uniqueDates.has(dateStr)) {
        duplicates.push(dateStr);
      } else {
        uniqueDates.add(dateStr);
      }
    });
    
    return duplicates;
  }, []);

  return {
    calendarMonths,
    updateCalendarMonths,
    isWeekendDay,
    isOutsideDisplayMonths,
    isDateAlreadyTaken,
    isDateAlreadySelected,
    showDateWarning,
    createDateSelectHandler,
    findDuplicateDates
  };
}; 