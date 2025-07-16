/**
 * 一時保存機能のためのユーティリティ
 */

import type { WorkHistoryFormData } from '../types/workHistory';

// ローカルストレージのキー
const TEMP_SAVE_KEYS = {
  WORK_HISTORY: 'workHistory_tempSave',
  METADATA: 'workHistory_tempSave_metadata',
} as const;

/**
 * 一時保存のメタデータ
 */
export interface TempSaveMetadata {
  step: number;
  totalSteps: number;
  lastModified: string;
  deviceInfo: string;
  autoSaved: boolean;
}

/**
 * 一時保存データの構造
 */
export interface TempSaveData {
  data: Partial<WorkHistoryFormData>;
  metadata: TempSaveMetadata;
}

/**
 * ローカルストレージに一時保存
 */
export const saveTempDataLocally = (
  data: Partial<WorkHistoryFormData>,
  metadata: Partial<TempSaveMetadata> = {}
): boolean => {
  try {
    const fullMetadata: TempSaveMetadata = {
      step: metadata.step ?? 1,
      totalSteps: metadata.totalSteps ?? 4,
      lastModified: new Date().toISOString(),
      deviceInfo: navigator.userAgent,
      autoSaved: metadata.autoSaved ?? false,
      ...metadata,
    };

    const tempData: TempSaveData = {
      data,
      metadata: fullMetadata,
    };

    localStorage.setItem(TEMP_SAVE_KEYS.WORK_HISTORY, JSON.stringify(tempData));
    return true;
  } catch (error) {
    console.error('ローカル一時保存に失敗:', error);
    return false;
  }
};

/**
 * ローカルストレージから一時保存データを取得
 */
export const getTempDataLocally = (): TempSaveData | null => {
  try {
    const stored = localStorage.getItem(TEMP_SAVE_KEYS.WORK_HISTORY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as TempSaveData;
    
    // データの妥当性チェック
    if (!parsed.data || !parsed.metadata) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('ローカル一時保存データの読み込みに失敗:', error);
    return null;
  }
};

/**
 * ローカルストレージの一時保存データを削除
 */
export const clearTempDataLocally = (): boolean => {
  try {
    localStorage.removeItem(TEMP_SAVE_KEYS.WORK_HISTORY);
    return true;
  } catch (error) {
    console.error('ローカル一時保存データの削除に失敗:', error);
    return false;
  }
};

/**
 * 一時保存データが存在するかチェック
 */
export const hasTempDataLocally = (): boolean => {
  try {
    const data = getTempDataLocally();
    return data !== null;
  } catch {
    return false;
  }
};

/**
 * 一時保存データの最終更新日時を取得
 */
export const getTempDataLastModified = (): Date | null => {
  try {
    const data = getTempDataLocally();
    return data ? new Date(data.metadata.lastModified) : null;
  } catch {
    return null;
  }
};

/**
 * 一時保存データが古いかどうかをチェック
 * @param maxAgeInHours 最大有効時間（時間）
 */
export const isTempDataStale = (maxAgeInHours = 24): boolean => {
  const lastModified = getTempDataLastModified();
  if (!lastModified) return true;

  const now = new Date();
  const diffInHours = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60);
  return diffInHours > maxAgeInHours;
};

/**
 * デバイス情報が一致するかチェック
 */
export const isFromSameDevice = (): boolean => {
  try {
    const data = getTempDataLocally();
    if (!data) return true;

    return data.metadata.deviceInfo === navigator.userAgent;
  } catch {
    return true;
  }
};

/**
 * 自動保存フラグをセット
 */
export const markAsAutoSaved = (): boolean => {
  try {
    const data = getTempDataLocally();
    if (!data) return false;

    data.metadata.autoSaved = true;
    data.metadata.lastModified = new Date().toISOString();

    localStorage.setItem(TEMP_SAVE_KEYS.WORK_HISTORY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('自動保存フラグの更新に失敗:', error);
    return false;
  }
};

/**
 * フォームの完了率を計算
 */
export const calculateCompletionRate = (data: Partial<WorkHistoryFormData>): number => {
  const requiredFields = [
    'projectName',
    'startDate',
    'industry',
    'projectOverview',
    'responsibilities',
    'teamSize',
    'role',
  ];

  const optionalFields = [
    'endDate',
    'companyName',
    'achievements',
    'notes',
    'processes',
    'programmingLanguages',
    'serversDatabases',
    'tools',
  ];

  // const totalFields = requiredFields.length + optionalFields.length;
  let filledFields = 0;

  // 必須項目のチェック（重み付け：2倍）
  requiredFields.forEach(field => {
    const value = data[field as keyof WorkHistoryFormData];
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value) && value.length > 0) {
        filledFields += 2;
      } else if (!Array.isArray(value)) {
        filledFields += 2;
      }
    }
  });

  // オプション項目のチェック（重み付け：1倍）
  optionalFields.forEach(field => {
    const value = data[field as keyof WorkHistoryFormData];
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value) && value.length > 0) {
        filledFields += 1;
      } else if (!Array.isArray(value)) {
        filledFields += 1;
      }
    }
  });

  // 必須項目を2倍重み付けして計算
  const maxScore = requiredFields.length * 2 + optionalFields.length;
  return Math.round((filledFields / maxScore) * 100);
};

/**
 * フォームデータをマージ（新しいデータで上書き）
 */
export const mergeTempData = (
  existing: Partial<WorkHistoryFormData>,
  newData: Partial<WorkHistoryFormData>
): Partial<WorkHistoryFormData> => {
  const merged = { ...existing };

  Object.keys(newData).forEach(key => {
    const field = key as keyof WorkHistoryFormData;
    const newValue = newData[field];
    
    if (newValue !== undefined && newValue !== null) {
      if (Array.isArray(newValue)) {
        // 配列の場合は空でなければ更新
        if (newValue.length > 0) {
          (merged as any)[field] = newValue;
        }
      } else if (typeof newValue === 'string') {
        // 文字列の場合は空文字でなければ更新
        if (newValue.trim() !== '') {
          (merged as any)[field] = newValue;
        }
      } else {
        // その他の型は常に更新
        (merged as any)[field] = newValue;
      }
    }
  });

  return merged;
};