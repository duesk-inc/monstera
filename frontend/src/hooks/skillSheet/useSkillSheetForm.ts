import { useState, useCallback, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { SkillSheet, SkillSheetFormData } from '@/types/skillSheet';
import { updateSkillSheet, tempSaveSkillSheet } from '@/lib/api/skillSheet';
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';
import { SUCCESS_MESSAGES } from '@/constants/errorMessages';

interface SubmitResult {
  open: boolean;
  success: boolean;
  message: string;
}

/**
 * スキルシートフォームを管理するカスタムフック
 */
export const useSkillSheetForm = (skillSheet: SkillSheet | null) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTempSaved, setIsTempSaved] = useState(false);
  const [tempSavedAt, setTempSavedAt] = useState<Date | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult>({
    open: false,
    success: false,
    message: ''
  });

  // React Hook Formの初期化
  const formMethods = useForm<SkillSheetFormData>({
    defaultValues: {
      workHistory: []
    }
  });

  // スキルシートデータからフォームデータへの変換
  const convertSkillSheetToFormData = useCallback((skillSheetData: SkillSheet): SkillSheetFormData => {
    return {
      workHistory: skillSheetData.workHistories?.map(wh => ({
        projectName: wh.projectName || '',
        startDate: wh.startDate ? new Date(wh.startDate) : null,
        endDate: wh.endDate ? new Date(wh.endDate) : null,
        industry: wh.industry || 7, // デフォルトは「その他」
        projectOverview: wh.projectOverview || '',
        responsibilities: wh.responsibilities || '',
        achievements: wh.achievements || '',
        notes: wh.notes || '',
        processes: wh.processes || [],
        technologies: wh.technologies || '',
        programmingLanguages: wh.programmingLanguages || [],
        serversDatabases: wh.serversDatabases || [],
        tools: wh.tools || [],
        teamSize: wh.teamSize || 0,
        role: wh.role || 'SE'
      })) || []
    };
  }, []);

  // スキルシートデータが変更された時にフォームをリセット
  useEffect(() => {
    if (skillSheet) {
      const formData = convertSkillSheetToFormData(skillSheet);
      formMethods.reset(formData);
      
      DebugLogger.dataConversion(
        { category: 'Form', operation: DEBUG_OPERATIONS.UPDATE },
        skillSheet,
        formData,
        'スキルシートからフォームデータへの変換'
      );
    }
  }, [skillSheet, formMethods, convertSkillSheetToFormData]);

  // 本保存処理
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitResult({ open: false, success: false, message: '' });

    try {
      DebugLogger.info(
        { category: 'Form', operation: DEBUG_OPERATIONS.UPDATE, description: 'スキルシート本保存' },
        'action: submit',
        { formData: formMethods.getValues() }
      );

      const formData = formMethods.getValues();
      await updateSkillSheet(formData);

      // 保存後にフォームの状態をリセット
      formMethods.reset(formData);
      
      setIsTempSaved(false);
      setTempSavedAt(null);
      setSubmitResult({
        open: true,
        success: true,
        message: SUCCESS_MESSAGES.SKILL_SHEET_SAVED
      });

      DebugLogger.info(
        { category: 'Form', operation: DEBUG_OPERATIONS.UPDATE, description: 'スキルシート本保存成功' },
        'action: submit - success'
      );
    } catch (error: any) {
      const errorMessage = error.message || 'スキルシート情報の保存に失敗しました';
      setSubmitResult({
        open: true,
        success: false,
        message: errorMessage
      });

      DebugLogger.apiError(
        { category: 'Form', operation: DEBUG_OPERATIONS.UPDATE, description: 'スキルシート本保存エラー' },
        { error, metadata: { errorMessage } }
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formMethods]);

  // 一時保存処理
  const handleTempSave = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitResult({ open: false, success: false, message: '' });

    try {
      DebugLogger.info(
        { category: 'Form', operation: DEBUG_OPERATIONS.CREATE, description: 'スキルシート一時保存' },
        'action: temp-save',
        { formData: formMethods.getValues() }
      );

      const formData = formMethods.getValues();
      await tempSaveSkillSheet(formData);

      // 一時保存後にフォームの状態をリセット
      formMethods.reset(formData);
      
      setIsTempSaved(true);
      setTempSavedAt(new Date());
      setSubmitResult({
        open: true,
        success: true,
        message: SUCCESS_MESSAGES.SKILL_SHEET_TEMP_SAVED
      });

      DebugLogger.info(
        { category: 'Form', operation: DEBUG_OPERATIONS.CREATE, description: 'スキルシート一時保存成功' },
        'action: temp-save - success'
      );
    } catch (error: any) {
      const errorMessage = error.message || 'スキルシート情報の一時保存に失敗しました';
      setSubmitResult({
        open: true,
        success: false,
        message: errorMessage
      });

      DebugLogger.apiError(
        { category: 'Form', operation: DEBUG_OPERATIONS.CREATE, description: 'スキルシート一時保存エラー' },
        { error, metadata: { errorMessage } }
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formMethods]);

  // ===== オートセーブ（デバウンス） =====
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveInFlight = useRef(false);

  const performAutoTempSave = useCallback(async () => {
    // 送信中や既にオートセーブ中はスキップ
    if (isSubmitting || autoSaveInFlight.current) return;
    autoSaveInFlight.current = true;
    try {
      const formData = formMethods.getValues();

      DebugLogger.info(
        { category: 'Form', operation: DEBUG_OPERATIONS.CREATE, description: 'スキルシート一時保存（オートセーブ）' },
        'action: temp-save (auto)',
        { formData }
      );

      await tempSaveSkillSheet(formData);

      // 一時保存後にフォーム状態をリセットしてdirtyフラグを解除
      formMethods.reset(formData);
      setIsTempSaved(true);
      setTempSavedAt(new Date());

      DebugLogger.info(
        { category: 'Form', operation: DEBUG_OPERATIONS.CREATE, description: 'スキルシート一時保存成功（オートセーブ）' },
        'action: temp-save (auto) - success'
      );
    } catch (error: any) {
      DebugLogger.apiError(
        { category: 'Form', operation: DEBUG_OPERATIONS.CREATE, description: 'スキルシート一時保存エラー（オートセーブ）' },
        { error }
      );
      // オートセーブはサイレント運用（スナックバーは出さない）
    } finally {
      autoSaveInFlight.current = false;
    }
  }, [formMethods, isSubmitting]);

  // フォーム変更を監視してデバウンスオートセーブ
  useEffect(() => {
    // watchの購読で全フィールド変更を捕捉
    const subscription = formMethods.watch(() => {
      // 直近変更があればデバウンスして一時保存
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      // 800msのデバウンス
      autoSaveTimer.current = setTimeout(() => {
        // 直近の変更でdirtyな場合のみ実行
        if (formMethods.formState.isDirty) {
          void performAutoTempSave();
        }
      }, 800);
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe();
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [formMethods, performAutoTempSave]);

  // 通知をリセット
  const resetSnackbar = useCallback(() => {
    setSubmitResult({ open: false, success: false, message: '' });
  }, []);

  return {
    formMethods,
    isSubmitting,
    isTempSaved,
    tempSavedAt,
    submitResult,
    handleSubmit,
    handleTempSave,
    resetSnackbar,
    isDirty: formMethods.formState.isDirty,
  };
};
