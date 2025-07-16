import { useState, useEffect } from 'react';
import { 
  DefaultWorkTimeSettings, 
  WeeklyReport 
} from '@/types/weeklyReport';
import { 
  getUserDefaultWorkSettings,
  saveUserDefaultWorkSettings
} from '@/app/api/weekly-report/route';
import { applyDefaultSettingsToReport } from '@/utils/weeklyReportUtils';
import { isSubmitted, isDraft } from '@/utils/weeklyReportUtils';
import { SnackbarState } from '@/types/weeklyReport';
import { DebugLogger } from '@/lib/debug/logger';
import { DEFAULT_WORK_TIME, DEFAULT_CUSTOM_DAY_SETTINGS } from '@/constants/defaultWorkTime';

export const useDefaultSettings = (
  report: WeeklyReport,
  setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
  setSnackbar: React.Dispatch<React.SetStateAction<SnackbarState>>
) => {
  // ユーザーデフォルト設定のダイアログ状態
  const [openDefaultSettingsDialog, setOpenDefaultSettingsDialog] = useState(false);

  // ユーザーのデフォルト勤務時間設定
  const [defaultSettings, setDefaultSettings] = useState<DefaultWorkTimeSettings>({
    weekdayStart: DEFAULT_WORK_TIME.START, 
    weekdayEnd: DEFAULT_WORK_TIME.END,
    weekdayBreak: DEFAULT_WORK_TIME.BREAK,
    customDaySettings: DEFAULT_CUSTOM_DAY_SETTINGS
  });

  // デフォルト設定項目の変更ハンドラー
  const handleDefaultSettingChange = (
    category: 'weekday',
    field: 'Start' | 'End' | 'Break',
    value: string | number
  ) => {
    const fieldName = `${category}${field}` as keyof Omit<DefaultWorkTimeSettings, 'customDaySettings'>;
    setDefaultSettings({
      ...defaultSettings,
      [fieldName]: field === 'Break' ? parseFloat(value as string) || 0 : value,
    });
  };

  // カスタム曜日設定の変更ハンドラー
  const handleCustomDaySettingChange = (
    day: keyof DefaultWorkTimeSettings['customDaySettings'],
    field: keyof DefaultWorkTimeSettings['customDaySettings']['monday'],
    value: string | number | boolean
  ) => {
    setDefaultSettings({
      ...defaultSettings,
      customDaySettings: {
        ...defaultSettings.customDaySettings,
        [day]: {
          ...defaultSettings.customDaySettings[day],
          [field]: field === 'breakTime' ? 
            (typeof value === 'string' ? parseFloat(value) || 0 : value) : 
            value
        }
      }
    });
  };

  // デフォルト設定を保存する
  const saveDefaultSettings = async () => {
    try {
      // DB保存用の設定データを作成
      const settingsToSave = {
        weekday_start_time: defaultSettings.weekdayStart,
        weekday_end_time: defaultSettings.weekdayEnd,
        weekday_break_time: Number(defaultSettings.weekdayBreak), // 明示的に数値型に変換
        custom_day_settings: {
          monday: {
            ...defaultSettings.customDaySettings.monday,
            breakTime: Number(defaultSettings.customDaySettings.monday.breakTime),
          },
          tuesday: {
            ...defaultSettings.customDaySettings.tuesday,
            breakTime: Number(defaultSettings.customDaySettings.tuesday.breakTime),
          },
          wednesday: {
            ...defaultSettings.customDaySettings.wednesday,
            breakTime: Number(defaultSettings.customDaySettings.wednesday.breakTime),
          },
          thursday: {
            ...defaultSettings.customDaySettings.thursday,
            breakTime: Number(defaultSettings.customDaySettings.thursday.breakTime),
          },
          friday: {
            ...defaultSettings.customDaySettings.friday,
            breakTime: Number(defaultSettings.customDaySettings.friday.breakTime),
          },
          saturday: {
            ...defaultSettings.customDaySettings.saturday,
            breakTime: Number(defaultSettings.customDaySettings.saturday.breakTime),
          },
          sunday: {
            ...defaultSettings.customDaySettings.sunday,
            breakTime: Number(defaultSettings.customDaySettings.sunday.breakTime),
          }
        }
      };
      
      // APIを使ってDB保存
      await saveUserDefaultWorkSettings(settingsToSave);
      
      // 成功メッセージを表示
      setSnackbar({
        open: true,
        message: 'デフォルト勤務時間設定を保存しました',
        severity: 'success',
      });
      
      // 現在表示中の週報が未提出の場合のみ、デフォルト設定を適用
      if (!isSubmitted(report.status) && !isDraft(report.status)) {
        applyDefaultSettingsToCurrentReport();
      }
      
      // ダイアログを閉じる
      setOpenDefaultSettingsDialog(false);
      
      return true;
    } catch (error) {
      DebugLogger.apiError({
        category: '設定',
        operation: 'デフォルト設定保存'
      }, {
        error
      });
      setSnackbar({
        open: true,
        message: `デフォルト設定の保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        severity: 'error',
      });
      return false;
    }
  };

  // 現在表示中の週報にデフォルト設定を適用する関数
  const applyDefaultSettingsToCurrentReport = () => {
    // 提出済みの週報には適用しない
    if (isSubmitted(report.status)) {
      return;
    }
    
    // 週報にデフォルト設定を適用
    const updatedReport = applyDefaultSettingsToReport(report, defaultSettings);
    
    // 更新したレポートで週報を更新
    setReport(updatedReport);
    
    // デフォルト設定適用の通知
    setSnackbar({
      open: true,
      message: '現在の週報にデフォルト設定を適用しました',
      severity: 'info',
    });
  };

  // ユーザーのデフォルト勤務時間設定を読み込む
  useEffect(() => {
    const loadDefaultWorkTimeSettings = async () => {
      try {
        // まずAPIからデフォルト設定を取得
        const settings = await getUserDefaultWorkSettings();
        
        // 取得した設定をステート形式に変換
        setDefaultSettings({
          weekdayStart: settings.weekday_start_time, 
          weekdayEnd: settings.weekday_end_time,
          weekdayBreak: settings.weekday_break_time,
          customDaySettings: {
            monday: settings.custom_day_settings.monday,
            tuesday: settings.custom_day_settings.tuesday,
            wednesday: settings.custom_day_settings.wednesday,
            thursday: settings.custom_day_settings.thursday,
            friday: settings.custom_day_settings.friday,
            saturday: settings.custom_day_settings.saturday,
            sunday: settings.custom_day_settings.sunday,
          }
        });

        if(!isSubmitted(report.status) && !isDraft(report.status)) {
          // 新規週報の場合もデフォルト設定を適用
          setTimeout(() => applyDefaultSettingsToCurrentReport(), 0);
        }
      } catch (error) {
        DebugLogger.apiError({
          category: '設定',
          operation: 'デフォルト勤務時間読み込み'
        }, {
          error
        });
      }
    };
    
    loadDefaultWorkTimeSettings();
  }, [report, setReport]);

  return {
    defaultSettings,
    setDefaultSettings,
    openDefaultSettingsDialog,
    setOpenDefaultSettingsDialog,
    handleDefaultSettingChange,
    handleCustomDaySettingChange,
    saveDefaultSettings,
    applyDefaultSettingsToCurrentReport
  };
}; 