import { useState } from 'react';
import { 
  BulkSettings,
  WeeklyReport,
  SnackbarState
} from '@/types/weeklyReport';
import { getDayOfWeek } from '@/utils/dateUtils';
import { DEFAULT_WORK_TIME } from '@/constants/defaultWorkTime';

export const useBulkSettings = (
  report: WeeklyReport,
  setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
  setSnackbar: React.Dispatch<React.SetStateAction<SnackbarState>>,
  defaultWeekdayStart: string = DEFAULT_WORK_TIME.START,
  defaultWeekdayEnd: string = DEFAULT_WORK_TIME.END,
  defaultWeekdayBreak: number = DEFAULT_WORK_TIME.BREAK
) => {
  // ダイアログの状態
  const [openBulkSettingDialog, setOpenBulkSettingDialog] = useState(false);
  
  // 一括設定の状態
  const [bulkSettings, setBulkSettings] = useState<BulkSettings>({
    startTime: defaultWeekdayStart,
    endTime: defaultWeekdayEnd,
    breakTime: defaultWeekdayBreak,
    remarks: '',
  });

  // 一括設定入力ハンドラー
  const handleBulkSettingChange = (field: keyof BulkSettings, value: string | number) => {
    setBulkSettings({
      ...bulkSettings,
      [field]: field === 'breakTime' ? parseFloat(value as string) || 0 : value,
    });
  };

  // // 一括設定入力ハンドラー
  // const handleBulkSettingChange = (field: string, value: any) => {
  //   setBulkSettings({
  //     ...bulkSettings,
  //     [field]: field === 'breakTime' ? parseFloat(value) || 0 : value,
  //   });
  // };

  // 一括設定ダイアログを初期値でリセットして開く
  const openBulkSettingDialogWithDefaults = (
    startTime: string,
    endTime: string,
    breakTime: number
  ) => {
    setBulkSettings({
      startTime,
      endTime,
      breakTime,
      remarks: bulkSettings.remarks // 備考は既存の値を維持
    });
    setOpenBulkSettingDialog(true);
  };

  // 一括設定適用ハンドラー
  const handleApplyBulkSettings = () => {
    // 平日のみに設定を適用
    const newDailyRecords = [...report.dailyRecords].map(record => {
      const date = new Date(record.date);
      const dayOfWeek = getDayOfWeek(date);
      const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
      
      // 平日のみ更新、土日は変更しない
      if (!isWeekend) {
        return {
          ...record,
          startTime: bulkSettings.startTime,
          endTime: bulkSettings.endTime,
          breakTime: bulkSettings.breakTime,
          remarks: bulkSettings.remarks || record.remarks, // 備考が空の場合は既存の値を維持
        };
      }
      return record;
    });

    setReport({
      ...report,
      dailyRecords: newDailyRecords,
    });

    // ダイアログを閉じる
    setOpenBulkSettingDialog(false);
    
    // 成功メッセージを表示
    setSnackbar({
      open: true,
      message: '平日の勤務時間を一括設定しました',
      severity: 'success',
    });
    
    return true;
  };

  return {
    bulkSettings,
    setBulkSettings,
    openBulkSettingDialog,
    setOpenBulkSettingDialog,
    handleBulkSettingChange,
    handleApplyBulkSettings,
    openBulkSettingDialogWithDefaults
  };
}; 