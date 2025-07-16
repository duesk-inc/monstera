import { useState, useCallback } from 'react';

// 型定義をインポート
import { DefaultWorkTimeSettings as ApiDefaultWorkTimeSettings } from '@/types/weeklyReport';

// APIクライアントをインポート
import { 
  getUserDefaultWorkSettings,
  saveUserDefaultWorkSettings
} from '@/lib/api/weeklyReport';

// 定数をインポート
import { DEFAULT_WORK_TIME, DEFAULT_CUSTOM_DAY_SETTINGS } from '@/constants/defaultWorkTime';

// カスタムフックの戻り値の型定義
interface UseDefaultSettingsReturn {
  defaultSettings: ApiDefaultWorkTimeSettings;
  loading: boolean;
  error: string | null;
  loadDefaultSettings: () => Promise<void>;
  saveDefaultSettings: (settings: ApiDefaultWorkTimeSettings) => Promise<boolean>;
  handleDefaultSettingChange: (
    category: 'weekday',
    field: 'Start' | 'End' | 'Break',
    value: string | number
  ) => void;
  isDataLoaded: boolean;
}

/**
 * デフォルト勤怠設定を管理するカスタムフック
 */
export const useDefaultSettings = (): UseDefaultSettingsReturn => {
  // デフォルト設定の初期値（APIからデータが取得できない場合のみ使用）
  const [defaultSettings, setDefaultSettings] = useState<ApiDefaultWorkTimeSettings>({
    weekdayStart: DEFAULT_WORK_TIME.START, 
    weekdayEnd: DEFAULT_WORK_TIME.END,
    weekdayBreak: DEFAULT_WORK_TIME.BREAK,
    customDaySettings: DEFAULT_CUSTOM_DAY_SETTINGS,
  });
  
  // APIからデータが取得済みかどうかを管理
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // ローディング状態
  const [loading, setLoading] = useState(false);
  
  // エラー状態
  const [error, setError] = useState<string | null>(null);

  // デフォルト設定を読み込む
  const loadDefaultSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // APIからデフォルト設定を取得
      const settings = await getUserDefaultWorkSettings();
      
      // 取得した設定をステート形式に変換
      setDefaultSettings({
        weekdayStart: settings.weekdayStart, 
        weekdayEnd: settings.weekdayEnd,
        weekdayBreak: settings.weekdayBreak,
        customDaySettings: settings.customDaySettings || {
          monday: { enabled: false, startTime: settings.weekdayStart, endTime: settings.weekdayEnd, breakTime: settings.weekdayBreak },
          tuesday: { enabled: false, startTime: settings.weekdayStart, endTime: settings.weekdayEnd, breakTime: settings.weekdayBreak },
          wednesday: { enabled: false, startTime: settings.weekdayStart, endTime: settings.weekdayEnd, breakTime: settings.weekdayBreak },
          thursday: { enabled: false, startTime: settings.weekdayStart, endTime: settings.weekdayEnd, breakTime: settings.weekdayBreak },
          friday: { enabled: false, startTime: settings.weekdayStart, endTime: settings.weekdayEnd, breakTime: settings.weekdayBreak },
          saturday: { enabled: false, startTime: '', endTime: '', breakTime: 0 },
          sunday: { enabled: false, startTime: '', endTime: '', breakTime: 0 },
        },
      });
      setIsDataLoaded(true);
    } catch (error) {
      console.error('デフォルト勤務時間設定の読み込みに失敗しました', error);
      setError('デフォルト勤務時間設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // デフォルト設定を保存する
  const saveDefaultSettings = useCallback(async (settingsToSave: ApiDefaultWorkTimeSettings): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      // 入力値の検証
      if (!settingsToSave.weekdayStart || !settingsToSave.weekdayEnd) {
        setError('出勤時間と退勤時間を入力してください');
        return false;
      }

      // 休憩時間が無効な値の場合
      if (isNaN(Number(settingsToSave.weekdayBreak)) || Number(settingsToSave.weekdayBreak) < 0) {
        setError('休憩時間は0以上の数値を入力してください');
        return false;
      }

      // APIを使ってDB保存
      const savedSettings = await saveUserDefaultWorkSettings(settingsToSave);
      
      // 保存したデフォルト設定を適用
      setDefaultSettings(savedSettings);
      
      return true;
    } catch (error) {
      console.error('デフォルト設定の保存に失敗しました', error);
      
      // エラーメッセージの詳細を表示
      let errorMessage = 'デフォルト設定の保存に失敗しました';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // デフォルト設定項目の変更ハンドラー
  const handleDefaultSettingChange = useCallback((
    category: 'weekday',
    field: 'Start' | 'End' | 'Break',
    value: string | number
  ) => {
    const fieldName = `${category}${field}` as keyof ApiDefaultWorkTimeSettings;
    setDefaultSettings(prev => ({
      ...prev,
      [fieldName]: field === 'Break' ? parseFloat(value as string) || 0 : value,
    }));
  }, []);

  return {
    defaultSettings,
    loading,
    error,
    loadDefaultSettings,
    saveDefaultSettings,
    handleDefaultSettingChange,
    isDataLoaded
  };
}; 