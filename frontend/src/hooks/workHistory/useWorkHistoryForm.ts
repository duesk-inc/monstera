import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWorkHistoryValidationEnhanced } from './useWorkHistoryValidationEnhanced';
import { useWorkHistory } from './useWorkHistory';
import { useWorkHistoryTempSave } from './useWorkHistoryTempSave';
import { useDebouncedCallback } from '../common/useDebouncedCallback';
import type { WorkHistoryFormData, WorkHistoryData } from '../../types/workHistory';

// フォームの状態管理（内部使用のみ）

interface UseWorkHistoryFormOptions {
  initialData?: Partial<WorkHistoryFormData>;
  enableAutoSave?: boolean;
  autoSaveInterval?: number;
  enableRealTimeValidation?: boolean;
  enableTempSave?: boolean;
  currentStep?: number;
  totalSteps?: number;
  onSuccess?: (data: WorkHistoryData) => void;
  onError?: (error: unknown) => void;
  onTempSaveRestore?: (data: Partial<WorkHistoryFormData>) => void;
}

const DEFAULT_FORM_DATA: WorkHistoryFormData = {
  projectName: '',
  industry: null,
  teamSize: null,
  role: '',
  startDate: null,
  endDate: null,
  projectOverview: '',
  responsibilities: '',
  achievements: '',
  notes: '',
  processes: [],
  programmingLanguages: [],
  serversDatabases: [],
  tools: [],
};

export const useWorkHistoryForm = (options: UseWorkHistoryFormOptions = {}) => {
  const {
    initialData = {},
    enableAutoSave = true,
    autoSaveInterval = 30000, // 30秒
    enableRealTimeValidation = true,
    enableTempSave = true,
    currentStep = 1,
    totalSteps = 4,
    onSuccess,
    onError,
    onTempSaveRestore,
  } = options;

  // フォームデータの初期化
  const [formData, setFormData] = useState<WorkHistoryFormData>(() => ({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  }));

  const [originalData] = useState<WorkHistoryFormData>(() => ({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  }));

  const [isDirty, setIsDirty] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // バリデーションフック
  const { validateForm, validateField } = useWorkHistoryValidationEnhanced({
    realTimeValidation: enableRealTimeValidation,
    context: {
      mode: 'normal',
      isSubmitting: workHistory.isCreating || workHistory.isUpdating,
      isEditing: !!initialData.id,
      allowPartialValidation: enableTempSave,
    },
  });

  // CRUD操作フック
  const workHistory = useWorkHistory();

  // 一時保存フック
  const tempSave = useWorkHistoryTempSave({
    autoSaveInterval,
    enableLocalStorage: enableTempSave,
  });

  // フォームバリデーションの実行
  const validation = useMemo(() => {
    if (enableRealTimeValidation || isDirty) {
      return validateForm(formData);
    }
    return { isValid: true, errors: [], fieldErrors: {} };
  }, [formData, validateForm, enableRealTimeValidation, isDirty]);

  // 変更検知
  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  }, [formData, originalData]);

  // フィールド値の更新
  const updateField = useCallback(<K extends keyof WorkHistoryFormData>(
    field: K,
    value: WorkHistoryFormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    setTouchedFields(prev => new Set(prev).add(field));
    setIsDirty(true);
  }, []);

  // 複数フィールドの一括更新
  const updateFields = useCallback((updates: Partial<WorkHistoryFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...updates,
    }));
    
    setTouchedFields(prev => {
      const newTouched = new Set(prev);
      Object.keys(updates).forEach(field => newTouched.add(field));
      return newTouched;
    });
    setIsDirty(true);
  }, []);

  // フォームリセット
  const resetForm = useCallback((newData?: Partial<WorkHistoryFormData>) => {
    const resetData = newData ? { ...DEFAULT_FORM_DATA, ...newData } : originalData;
    setFormData(resetData);
    setTouchedFields(new Set());
    setIsDirty(false);
  }, [originalData]);

  // 個別フィールドのバリデーション
  const getFieldError = useCallback((fieldName: string) => {
    if (!enableRealTimeValidation && !touchedFields.has(fieldName)) {
      return [];
    }
    return validateField(fieldName, formData[fieldName as keyof WorkHistoryFormData], formData);
  }, [validateField, formData, enableRealTimeValidation, touchedFields]);

  // フィールドがタッチされているかチェック
  const isFieldTouched = useCallback((fieldName: string): boolean => {
    return touchedFields.has(fieldName);
  }, [touchedFields]);

  // フィールドにエラーがあるかチェック
  const hasFieldError = useCallback((fieldName: string): boolean => {
    const errors = getFieldError(fieldName);
    return errors.some(error => error.severity === 'error');
  }, [getFieldError]);

  // 一時保存データの復元
  const restoreTempData = useCallback(() => {
    const tempData = tempSave.restoreFromLocal();
    if (tempData) {
      const restoredData = { ...DEFAULT_FORM_DATA, ...tempData.data };
      setFormData(restoredData);
      setIsDirty(true);
      onTempSaveRestore?.(tempData.data);
      return true;
    }
    return false;
  }, [tempSave, onTempSaveRestore]);

  // 一時保存データのクリア
  const clearTempData = useCallback(async () => {
    await tempSave.clearTempData();
  }, [tempSave]);

  // 手動一時保存
  const saveTempData = useCallback(async () => {
    return await tempSave.manualSave(formData, {
      step: currentStep,
      totalSteps,
    });
  }, [tempSave, formData, currentStep, totalSteps]);

  // 一時保存（デバウンス付き）
  const debouncedAutoSave = useDebouncedCallback(
    useCallback(async (data: WorkHistoryFormData) => {
      if (enableTempSave && hasChanges) {
        try {
          await tempSave.saveTempData(data, {
            step: currentStep,
            totalSteps,
            autoSaved: true,
          });
        } catch (error) {
          // 一時保存のエラーは静かに処理（ユーザーには通知しない）
          console.warn('Auto-save failed:', error);
        }
      }
    }, [enableTempSave, hasChanges, tempSave, currentStep, totalSteps]),
    autoSaveInterval
  );

  // 自動保存の実行
  useEffect(() => {
    if (enableTempSave && hasChanges) {
      debouncedAutoSave(formData);
    }
  }, [formData, hasChanges, enableTempSave, debouncedAutoSave]);

  // フォーム送信
  const submitForm = useCallback(async (isUpdate = false, id?: string) => {
    setIsDirty(true);
    const validationResult = validateForm(formData);
    
    if (!validationResult.isValid) {
      // すべてのフィールドをタッチ済みにしてエラーを表示
      setTouchedFields(new Set(Object.keys(formData)));
      onError?.(new Error('入力内容に誤りがあります'));
      return false;
    }

    try {
      let result: WorkHistoryData;
      
      if (isUpdate && id) {
        result = await workHistory.handleUpdate(id, formData);
      } else {
        result = await workHistory.handleCreate(formData);
      }
      
      // 成功時は一時保存データを削除
      if (enableTempSave) {
        try {
          await tempSave.clearTempData();
        } catch {
          // 一時保存データの削除に失敗しても継続
        }
      }
      
      onSuccess?.(result);
      return true;
    } catch (error) {
      onError?.(error);
      return false;
    }
  }, [formData, validateForm, workHistory, enableTempSave, tempSave, onSuccess, onError]);

  // 便利なフィールド更新関数群
  const fieldUpdaters = useMemo(() => ({
    setProjectName: (value: string) => updateField('projectName', value),
    setIndustry: (value: number | null) => updateField('industry', value),
    setTeamSize: (value: number | null) => updateField('teamSize', value),
    setRole: (value: string) => updateField('role', value),
    setStartDate: (value: Date | null) => updateField('startDate', value),
    setEndDate: (value: Date | null) => updateField('endDate', value),
    setProjectOverview: (value: string) => updateField('projectOverview', value),
    setResponsibilities: (value: string) => updateField('responsibilities', value),
    setAchievements: (value: string) => updateField('achievements', value),
    setNotes: (value: string) => updateField('notes', value),
    setProcesses: (value: number[]) => updateField('processes', value),
    setProgrammingLanguages: (value: string[]) => updateField('programmingLanguages', value),
    setServersDatabases: (value: string[]) => updateField('serversDatabases', value),
    setTools: (value: string[]) => updateField('tools', value),
  }), [updateField]);

  return {
    // フォームデータ
    formData,
    originalData,
    
    // 状態
    isDirty,
    hasChanges,
    isSubmitting: workHistory.isLoading,
    isValid: validation.isValid,
    
    // バリデーション
    validation,
    getFieldError,
    isFieldTouched,
    hasFieldError,
    
    // 操作
    updateField,
    updateFields,
    resetForm,
    submitForm,
    
    // 一時保存機能
    tempSave: {
      data: tempSave.tempData,
      hasLocalData: tempSave.hasLocalTempData,
      hasServerData: tempSave.hasServerTempData,
      isAutoSaving: tempSave.isAutoSaving,
      lastSaved: tempSave.lastSaved,
      completionRate: tempSave.completionRate,
      restore: restoreTempData,
      clear: clearTempData,
      save: saveTempData,
    },
    
    // 便利な更新関数
    ...fieldUpdaters,
    
    // ローディング状態
    isCreating: workHistory.isCreating,
    isUpdating: workHistory.isUpdating,
    
    // エラー状態
    createError: workHistory.createError,
    updateError: workHistory.updateError,
  };
};

export default useWorkHistoryForm;