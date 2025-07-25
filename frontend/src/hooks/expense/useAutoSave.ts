import { useEffect, useRef, useCallback, useState } from 'react';
import { debounce } from 'lodash';
import { useToast } from '@/components/common/Toast';
import { DebugLogger } from '@/lib/debug/logger';
import { AUTO_SAVE_CONFIG, AUTO_SAVE_EVENTS } from '@/config/autoSave';
import type { ExpenseFormData } from '@/types/expense';

interface AutoSaveData {
  formData: ExpenseFormData;
  expenseId?: string;
  savedAt: string;
  expiresAt: string;
}

interface UseAutoSaveOptions {
  enabled?: boolean;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  isDraftSaving: boolean;
  lastSavedAt: Date | null;
  hasDraft: boolean;
  loadDraft: () => AutoSaveData | null;
  clearDraft: () => void;
  saveDraft: (data: ExpenseFormData, expenseId?: string) => Promise<void>;
}

/**
 * 経費申請フォームの自動保存機能を提供するカスタムフック
 * - ローカルストレージへの自動保存
 * - サーバーへのドラフト保存（将来的な拡張用）
 * - タイムアウト時の自動保存
 */
export const useAutoSave = (
  formData: ExpenseFormData,
  expenseId?: string,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn => {
  const { enabled = true, onSaveSuccess, onSaveError } = options;
  const { showInfo } = useToast();
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  
  const formDataRef = useRef(formData);
  const expenseIdRef = useRef(expenseId);
  const intervalRef = useRef<NodeJS.Timeout>();

  // formDataの参照を更新
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // expenseIdの参照を更新
  useEffect(() => {
    expenseIdRef.current = expenseId;
  }, [expenseId]);

  /**
   * ドラフトをローカルストレージに保存
   */
  const saveDraftToLocalStorage = useCallback((data: ExpenseFormData, id?: string) => {
    try {
      const now = new Date();
      const MINUTES_IN_HOUR = 60;
      const SECONDS_IN_MINUTE = 60;
      const MS_IN_SECOND = 1000;
      const expiresAt = new Date(now.getTime() + AUTO_SAVE_CONFIG.EXPIRY_HOURS * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MS_IN_SECOND);
      
      const autoSaveData: AutoSaveData = {
        formData: data,
        expenseId: id,
        savedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      // サイズチェック
      const dataSize = new Blob([JSON.stringify(autoSaveData)]).size;
      if (dataSize > AUTO_SAVE_CONFIG.MAX_DRAFT_SIZE) {
        throw new Error('下書きデータが大きすぎます');
      }

      localStorage.setItem(AUTO_SAVE_CONFIG.STORAGE_KEY, JSON.stringify(autoSaveData));
      setLastSavedAt(now);
      setHasDraft(true);
      
      DebugLogger.log('AUTO_SAVE', 'Draft saved to localStorage', {
        expenseId: id,
        savedAt: now.toISOString(),
      });

      return autoSaveData;
    } catch (error) {
      DebugLogger.log('AUTO_SAVE', 'Failed to save draft to localStorage', { error });
      throw error;
    }
  }, []);

  /**
   * サーバーにドラフトを保存（将来的な実装用）
   */
  const saveDraftToServer = useCallback(async (data: ExpenseFormData, id?: string) => {
    try {
      setIsDraftSaving(true);
      
      // APIエンドポイントが実装されたら有効化
      // const endpoint = id 
      //   ? `/api/v1/expenses/${id}/draft`
      //   : '/api/v1/expenses/draft';
      
      // const response = await apiClient.post(endpoint, data);
      
      // 現在はローカルストレージのみ
      const savedData = saveDraftToLocalStorage(data, id);
      
      onSaveSuccess?.();
      
      if (AUTO_SAVE_CONFIG.NOTIFICATIONS.SHOW_SAVE_SUCCESS) {
        showInfo('下書きを自動保存しました');
      }
      
      // イベント発火
      window.dispatchEvent(new CustomEvent(AUTO_SAVE_EVENTS.SAVE_SUCCESS, {
        detail: { expenseId: id, savedAt: new Date() }
      }));
      
      return savedData;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('自動保存に失敗しました');
      DebugLogger.log('AUTO_SAVE', 'Failed to save draft', { error: err });
      onSaveError?.(err);
      throw err;
    } finally {
      setIsDraftSaving(false);
    }
  }, [saveDraftToLocalStorage, onSaveSuccess, onSaveError, showInfo]);

  /**
   * ドラフトを保存（デバウンス付き）
   */
  // デバウンスされた保存関数を作成
  const saveDraft = useCallback(() => {
    const debouncedFn = debounce((data: ExpenseFormData, id?: string) => {
      if (!enabled) return;
      
      saveDraftToServer(data, id).catch((error) => {
        // エラーはログに記録済み
        if (AUTO_SAVE_CONFIG.NOTIFICATIONS.SHOW_SAVE_ERROR) {
          showInfo('自動保存に失敗しました');
        }
        
        // イベント発火
        window.dispatchEvent(new CustomEvent(AUTO_SAVE_EVENTS.SAVE_ERROR, {
          detail: { error }
        }));
      });
    }, AUTO_SAVE_CONFIG.DEBOUNCE_DELAY);
    
    return debouncedFn;
  }, [enabled, saveDraftToServer, showInfo])();

  /**
   * ドラフトをロード
   */
  const loadDraft = useCallback((): AutoSaveData | null => {
    try {
      const stored = localStorage.getItem(AUTO_SAVE_CONFIG.STORAGE_KEY);
      if (!stored) return null;

      const draft: AutoSaveData = JSON.parse(stored);
      const now = new Date();
      const expiresAt = new Date(draft.expiresAt);

      // 期限切れの場合は削除
      if (now > expiresAt) {
        localStorage.removeItem(AUTO_SAVE_CONFIG.STORAGE_KEY);
        setHasDraft(false);
        return null;
      }

      setHasDraft(true);
      setLastSavedAt(new Date(draft.savedAt));
      
      DebugLogger.debug(
        { category: 'AUTO_SAVE', operation: 'Load' },
        'Draft loaded from localStorage',
        {
          expenseId: draft.expenseId,
          savedAt: draft.savedAt,
        }
      );

      return draft;
    } catch (error) {
      DebugLogger.debug(
        { category: 'AUTO_SAVE', operation: 'Load' },
        'Failed to load draft',
        { error }
      );
      return null;
    }
  }, []);

  /**
   * ドラフトをクリア
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(AUTO_SAVE_CONFIG.STORAGE_KEY);
      setHasDraft(false);
      setLastSavedAt(null);
      
      // イベント発火
      window.dispatchEvent(new CustomEvent(AUTO_SAVE_EVENTS.DRAFT_CLEARED));
      
      DebugLogger.log('AUTO_SAVE', 'Draft cleared');
    } catch (error) {
      DebugLogger.log('AUTO_SAVE', 'Failed to clear draft', { error });
    }
  }, []);

  /**
   * ページ離脱時の自動保存
   */
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    // フォームに変更がある場合のみ
    const hasChanges = JSON.stringify(formDataRef.current) !== JSON.stringify({
      categoryId: '',
      amount: 0,
      description: '',
      expenseDate: '',
    });

    if (hasChanges && enabled) {
      // 同期的にローカルストレージに保存
      saveDraftToLocalStorage(formDataRef.current, expenseIdRef.current);
      
      // ブラウザの確認ダイアログを表示
      e.preventDefault();
      e.returnValue = '';
    }
  }, [enabled, saveDraftToLocalStorage]);

  /**
   * 可視性変更時の自動保存
   */
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && enabled) {
      // ページが非表示になった時に保存
      saveDraftToLocalStorage(formDataRef.current, expenseIdRef.current);
    }
  }, [enabled, saveDraftToLocalStorage]);

  // 定期的な自動保存のセットアップ
  useEffect(() => {
    if (!enabled) return;

    // 定期保存のインターバルを設定
    intervalRef.current = setInterval(() => {
      saveDraft(formDataRef.current, expenseIdRef.current);
    }, AUTO_SAVE_CONFIG.INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, saveDraft]);

  // イベントリスナーのセットアップ
  useEffect(() => {
    if (!enabled) return;

    // 初回ロード時にドラフトをチェック
    loadDraft();

    // イベントリスナーを追加
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // デバウンスされた関数をキャンセル
      saveDraft.cancel();
    };
  }, [enabled, handleBeforeUnload, handleVisibilityChange, loadDraft, saveDraft]);

  // フォームデータが変更されたときの自動保存
  useEffect(() => {
    if (!enabled) return;

    // 初回レンダリング時はスキップ
    const isInitialData = JSON.stringify(formData) === JSON.stringify({
      categoryId: '',
      amount: 0,
      description: '',
      expenseDate: '',
    });

    if (!isInitialData) {
      saveDraft(formData, expenseId);
    }
  }, [enabled, formData, expenseId, saveDraft]);

  return {
    isDraftSaving,
    lastSavedAt,
    hasDraft,
    loadDraft,
    clearDraft,
    saveDraft: useCallback(
      async (data: ExpenseFormData, id?: string) => {
        await saveDraftToServer(data, id);
      },
      [saveDraftToServer]
    ),
  };
};