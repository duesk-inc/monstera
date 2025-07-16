import { useState, useEffect, useCallback, useRef } from 'react';
import { SkillSheetFormData } from '@/types/skillSheet';
import { UseFormReturn } from 'react-hook-form';
import { DebugLogger } from '@/lib/debug/logger';

interface DraftData {
  workHistory: SkillSheetFormData['workHistory'][0];
  activeStep: number;
  savedAt: string;
}

interface UseWorkHistoryDraftReturn {
  hasDraft: boolean;
  draftSavedAt: Date | null;
  isAutoSaving: boolean;
  saveDraft: () => void;
  loadDraft: () => void;
  clearDraft: () => void;
  autoSaveEnabled: boolean;
  toggleAutoSave: () => void;
}

/**
 * 職務経歴編集ダイアログの下書き管理カスタムフック
 * ローカルストレージを使用して入力中のデータを一時保存
 */
export const useWorkHistoryDraft = (
  formMethods: UseFormReturn<SkillSheetFormData>,
  workHistoryIndex: number,
  isNew: boolean,
  activeStep: number,
  setActiveStep: (step: number) => void
): UseWorkHistoryDraftReturn => {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  const { getValues, setValue, watch } = formMethods;
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ローカルストレージのキーを生成
  const getDraftKey = useCallback(() => {
    return isNew 
      ? 'skillSheet_workHistory_draft_new' 
      : `skillSheet_workHistory_draft_${workHistoryIndex}`;
  }, [workHistoryIndex, isNew]);

  // 下書きの存在確認
  const checkDraftExists = useCallback(() => {
    try {
      const draftKey = getDraftKey();
      const draftData = localStorage.getItem(draftKey);
      
      if (draftData) {
        const parsed: DraftData = JSON.parse(draftData);
        setHasDraft(true);
        setDraftSavedAt(new Date(parsed.savedAt));
        
        DebugLogger.info(
          { category: 'Draft', operation: 'Check' },
          `下書きが見つかりました: ${draftKey}`,
          { savedAt: parsed.savedAt }
        );
        
        return true;
      }
      
      setHasDraft(false);
      setDraftSavedAt(null);
      return false;
    } catch (error) {
      DebugLogger.apiError(
        { category: 'Draft', operation: 'Check' },
        { error }
      );
      return false;
    }
  }, [getDraftKey]);

  // 下書きを保存
  const saveDraft = useCallback(() => {
    try {
      const draftKey = getDraftKey();
      const currentData = getValues(`workHistory.${workHistoryIndex}`);
      
      const draftData: DraftData = {
        workHistory: currentData,
        activeStep: activeStep,
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setDraftSavedAt(new Date());
      setHasDraft(true);
      
      DebugLogger.info(
        { category: 'Draft', operation: 'Save' },
        `下書きを保存しました: ${draftKey}`,
        { activeStep }
      );
    } catch (error) {
      DebugLogger.apiError(
        { category: 'Draft', operation: 'Save' },
        { error }
      );
    }
  }, [getDraftKey, getValues, workHistoryIndex, activeStep]);

  // 下書きを読み込み
  const loadDraft = useCallback(() => {
    try {
      const draftKey = getDraftKey();
      const draftData = localStorage.getItem(draftKey);
      
      if (draftData) {
        const parsed: DraftData = JSON.parse(draftData);
        
        // フォームに値を設定
        Object.entries(parsed.workHistory).forEach(([key, value]) => {
          setValue(`workHistory.${workHistoryIndex}.${key}` as any, value);
        });
        
        // アクティブステップを復元
        setActiveStep(parsed.activeStep);
        
        DebugLogger.info(
          { category: 'Draft', operation: 'Load' },
          `下書きを読み込みました: ${draftKey}`,
          { activeStep: parsed.activeStep }
        );
      }
    } catch (error) {
      DebugLogger.apiError(
        { category: 'Draft', operation: 'Load' },
        { error }
      );
    }
  }, [getDraftKey, setValue, workHistoryIndex, setActiveStep]);

  // 下書きをクリア
  const clearDraft = useCallback(() => {
    try {
      const draftKey = getDraftKey();
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setDraftSavedAt(null);
      
      DebugLogger.info(
        { category: 'Draft', operation: 'Clear' },
        `下書きをクリアしました: ${draftKey}`
      );
    } catch (error) {
      DebugLogger.apiError(
        { category: 'Draft', operation: 'Clear' },
        { error }
      );
    }
  }, [getDraftKey]);

  // 自動保存のトグル
  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled(prev => !prev);
  }, []);

  // 自動保存の実行
  const performAutoSave = useCallback(() => {
    if (!autoSaveEnabled) return;

    setIsAutoSaving(true);
    saveDraft();
    
    // 保存インジケーターを1秒後に非表示
    setTimeout(() => {
      setIsAutoSaving(false);
    }, 1000);
  }, [autoSaveEnabled, saveDraft]);


  // 初回マウント時に下書きの存在を確認
  useEffect(() => {
    checkDraftExists();
  }, [checkDraftExists]);

  return {
    hasDraft,
    draftSavedAt,
    isAutoSaving,
    saveDraft,
    loadDraft,
    clearDraft,
    autoSaveEnabled,
    toggleAutoSave
  };
};