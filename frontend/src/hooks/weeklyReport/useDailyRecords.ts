import { useCallback } from 'react';
import { format } from 'date-fns';

// 型定義をインポート
import { DailyRecord } from '@/types/weeklyReport';
import { DefaultWorkTimeSettings as ApiDefaultWorkTimeSettings } from '@/types/weeklyReport';

// ユーティリティをインポート
import { getDayOfWeek } from '@/utils/dateUtils';

// カスタムフックの戻り値の型定義
interface UseDailyRecordsReturn {
  handleDailyRecordChange: (
    dailyRecords: DailyRecord[],
    index: number,
    field: keyof DailyRecord,
    value: string
  ) => DailyRecord[];
  handleTimeChange: (
    dailyRecords: DailyRecord[],
    index: number,
    field: 'startTime' | 'endTime',
    time: Date | null
  ) => DailyRecord[];
  handleBreakTimeChange: (
    dailyRecords: DailyRecord[],
    index: number,
    value: string
  ) => DailyRecord[];
  handleHolidayWorkToggle: (
    dailyRecords: DailyRecord[],
    index: number,
    defaultSettings: ApiDefaultWorkTimeSettings
  ) => DailyRecord[];
  handleClientDailyRecordChange: (
    dailyRecords: DailyRecord[],
    index: number,
    field: 'clientStartTime' | 'clientEndTime' | 'hasClientWork',
    value: string | boolean,
    defaultSettings: ApiDefaultWorkTimeSettings
  ) => DailyRecord[];
  handleClientBreakTimeChange: (
    dailyRecords: DailyRecord[],
    index: number,
    value: string
  ) => DailyRecord[];
  applyBulkSettings: (
    dailyRecords: DailyRecord[],
    settings: {
      startTime: string;
      endTime: string;
      breakTime: number;
      remarks: string;
    }
  ) => DailyRecord[];
}

/**
 * 日次記録の管理に関するカスタムフック
 */
export const useDailyRecords = (): UseDailyRecordsReturn => {
  // 日々の記録更新ハンドラー
  const handleDailyRecordChange = useCallback(
    (dailyRecords: DailyRecord[], index: number, field: keyof DailyRecord, value: string): DailyRecord[] => {
      const newDailyRecords = [...dailyRecords];
      newDailyRecords[index] = {
        ...newDailyRecords[index],
        [field]: value,
      };
      
      return newDailyRecords;
    },
    []
  );

  // 時間入力ハンドラー
  const handleTimeChange = useCallback(
    (
      dailyRecords: DailyRecord[],
      index: number,
      field: 'startTime' | 'endTime',
      time: Date | null
    ): DailyRecord[] => {
      if (!time) return dailyRecords;
      
      // HH:MM形式で保存（UIでの表示用）
      const timeString = format(time, 'HH:mm');
      return handleDailyRecordChange(dailyRecords, index, field, timeString);
    },
    [handleDailyRecordChange]
  );

  // 休憩時間の入力ハンドラー（数値用）
  const handleBreakTimeChange = useCallback(
    (dailyRecords: DailyRecord[], index: number, value: string): DailyRecord[] => {
      const numValue = parseFloat(value) || 0;
      const newDailyRecords = [...dailyRecords];
      newDailyRecords[index] = {
        ...newDailyRecords[index],
        breakTime: numValue,
      };
      
      return newDailyRecords;
    },
    []
  );

  // 休日出勤フラグ切替ハンドラー
  const handleHolidayWorkToggle = useCallback(
    (
      dailyRecords: DailyRecord[],
      index: number,
      defaultSettings: ApiDefaultWorkTimeSettings
    ): DailyRecord[] => {
      const newDailyRecords = [...dailyRecords];
      const record = newDailyRecords[index];
      const isEnabling = !record.isHolidayWork; // 切り替え後の状態（trueなら有効化）
      
      // 日付から曜日を取得
      const date = new Date(record.date);
      const dayOfWeek = getDayOfWeek(date);
      
      // 曜日に対応するカスタム設定を取得
      let daySettings;
      switch(dayOfWeek) {
        case '月': daySettings = defaultSettings.customDaySettings.monday; break;
        case '火': daySettings = defaultSettings.customDaySettings.tuesday; break;
        case '水': daySettings = defaultSettings.customDaySettings.wednesday; break;
        case '木': daySettings = defaultSettings.customDaySettings.thursday; break;
        case '金': daySettings = defaultSettings.customDaySettings.friday; break;
        case '土': daySettings = defaultSettings.customDaySettings.saturday; break;
        case '日': daySettings = defaultSettings.customDaySettings.sunday; break;
        default: daySettings = { enabled: false, startTime: '', endTime: '', breakTime: 0 };
      }
      
      // 有効な時間設定を決定
      const useCustomSettings = daySettings.enabled;
      const startTime = useCustomSettings ? daySettings.startTime : defaultSettings.weekdayStart;
      const endTime = useCustomSettings ? daySettings.endTime : defaultSettings.weekdayEnd;
      const breakTime = useCustomSettings ? daySettings.breakTime : defaultSettings.weekdayBreak;
      
      // 新しいレコードオブジェクトを作成
      const updatedRecord = {
        ...record,
        isHolidayWork: isEnabling,
      };

      // 休日出勤設定ONに変更する場合、デフォルト設定を適用
      if (isEnabling) {
        if (!record.startTime) updatedRecord.startTime = startTime;
        if (!record.endTime) updatedRecord.endTime = endTime;
        if (record.breakTime === 0) updatedRecord.breakTime = breakTime;
      }
      
      newDailyRecords[index] = updatedRecord;
      
      return newDailyRecords;
    },
    []
  );

  // 日次勤怠の客先勤怠関連フィールド更新ハンドラー
  const handleClientDailyRecordChange = useCallback(
    (
      dailyRecords: DailyRecord[],
      index: number,
      field: 'clientStartTime' | 'clientEndTime' | 'hasClientWork',
      value: string | boolean,
      defaultSettings: ApiDefaultWorkTimeSettings
    ): DailyRecord[] => {
      const newDailyRecords = [...dailyRecords];
      const record = newDailyRecords[index];
      
      if (field === 'hasClientWork') {
        const isEnabling = value as boolean;
        
        // 日付から曜日を取得してデフォルト設定を決定
        const date = new Date(record.date);
        const dayOfWeek = getDayOfWeek(date);
        
        // 曜日に対応するカスタム設定を取得
        let daySettings;
        switch(dayOfWeek) {
          case '月': daySettings = defaultSettings.customDaySettings.monday; break;
          case '火': daySettings = defaultSettings.customDaySettings.tuesday; break;
          case '水': daySettings = defaultSettings.customDaySettings.wednesday; break;
          case '木': daySettings = defaultSettings.customDaySettings.thursday; break;
          case '金': daySettings = defaultSettings.customDaySettings.friday; break;
          case '土': daySettings = defaultSettings.customDaySettings.saturday; break;
          case '日': daySettings = defaultSettings.customDaySettings.sunday; break;
          default: daySettings = { enabled: false, startTime: '', endTime: '', breakTime: 0 };
        }
        
        // 有効な時間設定を決定
        const useCustomSettings = daySettings.enabled;
        const startTime = useCustomSettings ? daySettings.startTime : defaultSettings.weekdayStart;
        const endTime = useCustomSettings ? daySettings.endTime : defaultSettings.weekdayEnd;
        const breakTime = useCustomSettings ? daySettings.breakTime : defaultSettings.weekdayBreak;
        
        // 客先勤怠を有効化/無効化
        if (isEnabling) {
          // 有効化する場合、自社勤怠の値をコピーするか、自社勤怠がなければデフォルト値
          newDailyRecords[index] = {
            ...record,
            hasClientWork: true,
            clientStartTime: record.startTime || startTime,
            clientEndTime: record.endTime || endTime,
            clientBreakTime: record.breakTime || breakTime,
          };
        } else {
          // 無効化する場合、客先勤怠の値をクリア
          newDailyRecords[index] = {
            ...record,
            hasClientWork: false,
            clientStartTime: '',
            clientEndTime: '',
            clientBreakTime: 0,
            clientWorkHours: 0
          };
        }
      } else {
        // 客先勤怠の時間を直接更新
        newDailyRecords[index] = {
          ...record,
          [field]: value,
          hasClientWork: true
        };
      }
      
      return newDailyRecords;
    },
    []
  );
  
  // 客先休憩時間の入力ハンドラー
  const handleClientBreakTimeChange = useCallback(
    (dailyRecords: DailyRecord[], index: number, value: string): DailyRecord[] => {
      const numValue = parseFloat(value) || 0;
      const newDailyRecords = [...dailyRecords];
      newDailyRecords[index] = {
        ...newDailyRecords[index],
        clientBreakTime: numValue,
        // 客先勤怠が入力された場合、hasClientWorkをtrueに
        hasClientWork: true
      };
      
      return newDailyRecords;
    },
    []
  );

  // 一括設定適用ハンドラー
  const applyBulkSettings = useCallback(
    (
      dailyRecords: DailyRecord[],
      settings: {
        startTime: string;
        endTime: string;
        breakTime: number;
        remarks: string;
      }
    ): DailyRecord[] => {
      // 平日のみに設定を適用
      const newDailyRecords = [...dailyRecords].map(record => {
        const date = new Date(record.date);
        const dayOfWeek = getDayOfWeek(date);
        const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
        
        // 平日のみ更新、土日は変更しない
        if (!isWeekend) {
          return {
            ...record,
            startTime: settings.startTime,
            endTime: settings.endTime,
            breakTime: settings.breakTime,
            remarks: settings.remarks || record.remarks, // 備考が空の場合は既存の値を維持
          };
        }
        return record;
      });

      return newDailyRecords;
    },
    []
  );

  return {
    handleDailyRecordChange,
    handleTimeChange,
    handleBreakTimeChange,
    handleHolidayWorkToggle,
    handleClientDailyRecordChange,
    handleClientBreakTimeChange,
    applyBulkSettings
  };
}; 