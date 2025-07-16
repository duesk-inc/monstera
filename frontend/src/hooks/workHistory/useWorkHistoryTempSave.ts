import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workHistoryApi } from '../../lib/api/workHistory';
import { useNotifications } from '../common/useNotifications';
import { useErrorHandler } from '../common/useErrorHandler';
import {
  saveTempDataLocally,
  getTempDataLocally,
  clearTempDataLocally,
  hasTempDataLocally,
  isTempDataStale,
  isFromSameDevice,
  markAsAutoSaved,
  calculateCompletionRate,
  type TempSaveData,
  type TempSaveMetadata,
} from '../../utils/tempSaveUtils';
import type { WorkHistoryFormData, WorkHistoryTempSaveRequest } from '../../types/workHistory';

export interface UseWorkHistoryTempSaveOptions {
  autoSaveInterval?: number; // 自動保存間隔（ミリ秒）
  enableLocalStorage?: boolean; // ローカルストレージの使用可否
  maxLocalStorageAge?: number; // ローカルストレージの最大保持時間（時間）
}

export interface UseWorkHistoryTempSaveReturn {
  // 状態
  tempData: TempSaveData | null;
  hasLocalTempData: boolean;
  hasServerTempData: boolean;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  completionRate: number;
  
  // 操作
  saveTempData: (data: Partial<WorkHistoryFormData>, metadata?: Partial<TempSaveMetadata>) => Promise<boolean>;
  loadTempData: () => Promise<TempSaveData | null>;
  clearTempData: () => Promise<boolean>;
  restoreFromLocal: () => TempSaveData | null;
  clearLocalTempData: () => boolean;
  
  // サーバー操作
  saveToServer: (data: Partial<WorkHistoryFormData>, metadata?: Partial<TempSaveMetadata>) => Promise<boolean>;
  loadFromServer: () => Promise<TempSaveData | null>;
  clearFromServer: () => Promise<boolean>;
  
  // 自動保存制御
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  manualSave: (data: Partial<WorkHistoryFormData>, metadata?: Partial<TempSaveMetadata>) => Promise<boolean>;
}

const QUERY_KEY = 'workHistory_tempSave';
const DEFAULT_AUTO_SAVE_INTERVAL = 30000; // 30秒
const DEFAULT_MAX_AGE_HOURS = 24; // 24時間

export const useWorkHistoryTempSave = (
  options: UseWorkHistoryTempSaveOptions = {}
): UseWorkHistoryTempSaveReturn => {
  const {
    autoSaveInterval = DEFAULT_AUTO_SAVE_INTERVAL,
    enableLocalStorage = true,
    maxLocalStorageAge = DEFAULT_MAX_AGE_HOURS,
  } = options;

  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();
  const { handleError } = useErrorHandler();

  // 状態管理
  const [tempData, setTempData] = useState<TempSaveData | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // サーバーからの一時保存データ取得
  const { data: serverTempData } = useQuery({
    queryKey: [QUERY_KEY, 'server'],
    queryFn: async () => {
      const result = await workHistoryApi.getTemporarySave();
      return result ? { data: result as any, metadata: {} as TempSaveMetadata } : null;
    },
    staleTime: 1000 * 60 * 5, // 5分
    retry: 1,
  });

  // サーバーへの一時保存
  const saveToServerMutation = useMutation({
    mutationFn: async (request: WorkHistoryTempSaveRequest) => {
      return await workHistoryApi.saveTemporary(request);
    },
    onSuccess: () => {
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'server'] });
    },
    onError: (error) => {
      handleError(error, '一時保存');
    },
  });

  // サーバーからの一時保存データ削除
  const clearFromServerMutation = useMutation({
    mutationFn: async () => {
      return await workHistoryApi.deleteTemporarySave();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'server'] });
    },
    onError: (error) => {
      handleError(error, '一時保存データの削除');
    },
  });

  // 初期化時にローカルデータをチェック
  useEffect(() => {
    if (enableLocalStorage) {
      const localData = getTempDataLocally();
      if (localData) {
        // 古いデータや異なるデバイスのデータは削除
        if (isTempDataStale(maxLocalStorageAge) || !isFromSameDevice()) {
          clearTempDataLocally();
        } else {
          setTempData(localData);
          setLastSaved(new Date(localData.metadata.lastModified));
        }
      }
    }
  }, [enableLocalStorage, maxLocalStorageAge]);

  // 一時保存データの統合ロジック
  const hasLocalTempData = enableLocalStorage && hasTempDataLocally();
  const hasServerTempData = Boolean(serverTempData);
  const completionRate = tempData ? calculateCompletionRate(tempData.data) : 0;

  // ローカルストレージに保存
  const saveLocally = useCallback((data: Partial<WorkHistoryFormData>, metadata: Partial<TempSaveMetadata> = {}) => {
    if (!enableLocalStorage) return false;

    const success = saveTempDataLocally(data, metadata);
    if (success) {
      const newData = getTempDataLocally();
      setTempData(newData);
      setLastSaved(new Date());
    }
    return success;
  }, [enableLocalStorage]);

  // サーバーに保存
  const saveToServer = useCallback(async (
    data: Partial<WorkHistoryFormData>, 
    metadata: Partial<TempSaveMetadata> = {}
  ): Promise<boolean> => {
    try {
      const request: WorkHistoryTempSaveRequest = {
        data,
        metadata: {
          step: metadata.step ?? 1,
          totalSteps: metadata.totalSteps ?? 4,
          lastModified: new Date().toISOString(),
          deviceInfo: navigator.userAgent,
          ...metadata,
        },
      };

      await saveToServerMutation.mutateAsync(request);
      return true;
    } catch (error) {
      console.error('サーバーへの一時保存に失敗:', error);
      return false;
    }
  }, [saveToServerMutation]);

  // 統合された一時保存（ローカル + サーバー）
  const saveTempData = useCallback(async (
    data: Partial<WorkHistoryFormData>, 
    metadata: Partial<TempSaveMetadata> = {}
  ): Promise<boolean> => {
    const localSuccess = saveLocally(data, metadata);
    const serverSuccess = await saveToServer(data, metadata);

    // ローカルまたはサーバーのいずれかが成功すれば OK
    return localSuccess || serverSuccess;
  }, [saveLocally, saveToServer]);

  // 一時保存データの読み込み
  const loadTempData = useCallback(async (): Promise<TempSaveData | null> => {
    let result: TempSaveData | null = null;

    // ローカルデータを優先
    if (enableLocalStorage) {
      const localData = getTempDataLocally();
      if (localData && !isTempDataStale(maxLocalStorageAge) && isFromSameDevice()) {
        result = localData;
      }
    }

    // ローカルデータがない場合はサーバーから取得
    if (!result && serverTempData) {
      result = serverTempData;
    }

    setTempData(result);
    if (result) {
      setLastSaved(new Date(result.metadata.lastModified));
    }

    return result;
  }, [enableLocalStorage, maxLocalStorageAge, serverTempData]);

  // サーバーからの読み込み
  const loadFromServer = useCallback(async (): Promise<TempSaveData | null> => {
    try {
      const result = await workHistoryApi.getTemporarySave();
      if (result) {
        const tempData: TempSaveData = {
          data: result as any,
          metadata: {
            step: 1,
            totalSteps: 4,
            lastModified: new Date().toISOString(),
            deviceInfo: navigator.userAgent,
            autoSaved: false,
          },
        };
        setTempData(tempData);
        return tempData;
      }
      return null;
    } catch (error) {
      console.error('サーバーからの一時保存データ読み込みに失敗:', error);
      return null;
    }
  }, []);

  // ローカルデータの復元
  const restoreFromLocal = useCallback((): TempSaveData | null => {
    if (!enableLocalStorage) return null;

    const localData = getTempDataLocally();
    if (localData && !isTempDataStale(maxLocalStorageAge) && isFromSameDevice()) {
      setTempData(localData);
      setLastSaved(new Date(localData.metadata.lastModified));
      return localData;
    }
    return null;
  }, [enableLocalStorage, maxLocalStorageAge]);

  // 一時保存データの削除
  const clearTempData = useCallback(async (): Promise<boolean> => {
    const localSuccess = enableLocalStorage ? clearTempDataLocally() : true;
    
    let serverSuccess = true;
    try {
      await clearFromServerMutation.mutateAsync();
    } catch {
      serverSuccess = false;
    }

    if (localSuccess || serverSuccess) {
      setTempData(null);
      setLastSaved(null);
      return true;
    }
    return false;
  }, [enableLocalStorage, clearFromServerMutation]);

  // ローカル一時保存データのクリア
  const clearLocalTempData = useCallback((): boolean => {
    if (!enableLocalStorage) return true;

    const success = clearTempDataLocally();
    if (success) {
      // ローカルデータのみクリア（サーバーデータは保持）
      if (tempData && !serverTempData) {
        setTempData(null);
        setLastSaved(null);
      }
    }
    return success;
  }, [enableLocalStorage, tempData, serverTempData]);

  // サーバーからのクリア
  const clearFromServer = useCallback(async (): Promise<boolean> => {
    try {
      await clearFromServerMutation.mutateAsync();
      return true;
    } catch {
      return false;
    }
  }, [clearFromServerMutation]);

  // 自動保存の有効化
  const enableAutoSave = useCallback(() => {
    setAutoSaveEnabled(true);
  }, []);

  // 自動保存の無効化
  const disableAutoSave = useCallback(() => {
    setAutoSaveEnabled(false);
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      setAutoSaveTimer(null);
    }
  }, [autoSaveTimer]);

  // 手動保存
  const manualSave = useCallback(async (
    data: Partial<WorkHistoryFormData>, 
    metadata: Partial<TempSaveMetadata> = {}
  ): Promise<boolean> => {
    const result = await saveTempData(data, { ...metadata, autoSaved: false });
    if (result) {
      showSuccess('一時保存しました');
    } else {
      showError('一時保存に失敗しました');
    }
    return result;
  }, [saveTempData, showSuccess, showError]);

  // 自動保存タイマーの設定
  useEffect(() => {
    if (autoSaveEnabled && tempData) {
      const timer = setTimeout(async () => {
        setIsAutoSaving(true);
        try {
          await saveTempData(tempData.data, { ...tempData.metadata, autoSaved: true });
          markAsAutoSaved();
        } catch (error) {
          console.error('自動保存に失敗:', error);
        } finally {
          setIsAutoSaving(false);
        }
      }, autoSaveInterval);

      setAutoSaveTimer(timer);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [autoSaveEnabled, tempData, autoSaveInterval, saveTempData]);

  return {
    // 状態
    tempData,
    hasLocalTempData,
    hasServerTempData,
    isAutoSaving,
    lastSaved,
    completionRate,
    
    // 操作
    saveTempData,
    loadTempData,
    clearTempData,
    restoreFromLocal,
    clearLocalTempData,
    
    // サーバー操作
    saveToServer,
    loadFromServer,
    clearFromServer,
    
    // 自動保存制御
    enableAutoSave,
    disableAutoSave,
    manualSave,
  };
};