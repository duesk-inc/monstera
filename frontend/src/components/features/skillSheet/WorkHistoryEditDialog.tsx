import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, TextField, Stack, Divider, IconButton, Chip, FormHelperText, Stepper, Step, StepLabel, useTheme, useMediaQuery, Alert, Tooltip, FormControlLabel, Switch, LinearProgress, Fade, Button, CircularProgress } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  Engineering as EngineeringIcon,
  Code as CodeIcon,
  Work as WorkIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { UseFormReturn, Controller, useWatch } from 'react-hook-form';
import { SkillSheetFormData } from '@/types/skillSheet';
import { 
  FormDatePicker, 
  FormSelect, 
  FormCheckboxGroup,
  SectionHeader,
  ConfirmDialog,
} from '@/components/common';
import { TechnologyInput } from '@/components/common/forms/TechnologyInput';
import ActionButton from '@/components/common/ActionButton';
import { useWorkHistoryDraft } from '@/hooks/skillSheet/useWorkHistoryDraft';
import { useWorkHistoryMutation } from '@/hooks/useWorkHistoryMutation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getCareerMinDate } from '@/constants/date';
import { formatDateForApi } from '@/lib/api/workHistory';
import type { WorkHistoryCreateRequest, WorkHistoryUpdateRequest } from '@/types/workHistory';
// useSessionは不要 - userIdとprofileIdはpropsから取得

// 担当工程オプション
const processOptions = [
  { value: 1, label: '要件定義' },
  { value: 2, label: '基本設計' },
  { value: 3, label: '詳細設計' },
  { value: 4, label: '製造・実装' },
  { value: 5, label: 'テスト' },
  { value: 6, label: '保守・運用' },
];

// 業種オプション
const industryOptions = [
  { value: 1, label: 'IT・通信' },
  { value: 2, label: '金融・保険' },
  { value: 3, label: '医療・福祉' },
  { value: 4, label: '製造' },
  { value: 5, label: '小売・流通' },
  { value: 6, label: '公共・官公庁' },
  { value: 7, label: 'その他' },
];

// 役割オプション
const roleOptions = [
  { value: 'テスター', label: 'テスター' },
  { value: 'PG', label: 'PG' },
  { value: 'SE', label: 'SE' },
  { value: 'サブリーダー', label: 'サブリーダー' },
  { value: 'PL', label: 'PL' },
  { value: 'テックリード', label: 'テックリード' },
  { value: 'PMO', label: 'PMO' },
  { value: 'PM', label: 'PM' },
];

interface WorkHistoryEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  formMethods: UseFormReturn<SkillSheetFormData>;
  workHistoryIndex: number;
  isNew?: boolean;
  workHistoryId?: string;
  userId?: string;
  profileId?: string;
}

/**
 * 技術入力セクションコンポーネント
 */
const TechnologyInputSection: React.FC<{
  formMethods: UseFormReturn<SkillSheetFormData>;
  workHistoryIndex: number;
}> = ({ formMethods, workHistoryIndex }) => {
  const { control, getValues, setValue } = formMethods;

  // 各技術フィールドを監視
  const programmingLanguages = useWatch({
    control,
    name: `workHistory.${workHistoryIndex}.programmingLanguages`
  }) || [''];

  const serversDatabases = useWatch({
    control,
    name: `workHistory.${workHistoryIndex}.serversDatabases`
  }) || [''];

  const tools = useWatch({
    control,
    name: `workHistory.${workHistoryIndex}.tools`
  }) || [''];

  // 項目を追加
  const addItem = useCallback((fieldName: string) => {
    const currentValues = getValues(`workHistory.${workHistoryIndex}.${fieldName}`) || [];
    setValue(`workHistory.${workHistoryIndex}.${fieldName}`, [...currentValues, '']);
  }, [getValues, setValue, workHistoryIndex]);

  // 項目を削除
  const removeItem = useCallback((fieldName: string, index: number) => {
    const currentValues = getValues(`workHistory.${workHistoryIndex}.${fieldName}`) || [];
    const newValues = currentValues.filter((_, i) => i !== index);
    setValue(`workHistory.${workHistoryIndex}.${fieldName}`, newValues.length > 0 ? newValues : ['']);
  }, [getValues, setValue, workHistoryIndex]);

  // 項目の値を更新
  const updateItem = useCallback((fieldName: string, index: number, value: string) => {
    const currentValues = getValues(`workHistory.${workHistoryIndex}.${fieldName}`) || [];
    const newValues = [...currentValues];
    newValues[index] = value;
    setValue(`workHistory.${workHistoryIndex}.${fieldName}`, newValues);
  }, [getValues, setValue, workHistoryIndex]);

  // 技術項目の入力フィールドをレンダリング
  const renderTechnologyFields = (
    fieldName: 'programmingLanguages' | 'serversDatabases' | 'tools',
    categoryName: 'programming_languages' | 'servers_databases' | 'tools',
    label: string,
    placeholder: string,
    values: string[]
  ) => (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        {label}
      </Typography>
      <Stack spacing={1}>
        {values.map((value, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <TechnologyInput
                value={value}
                onChange={(newValue) => updateItem(fieldName, index, newValue)}
                categoryName={categoryName}
                label=""
                placeholder={placeholder}
              />
            </Box>
            {values.length > 1 && (
              <IconButton
                size="small"
                onClick={() => removeItem(fieldName, index)}
                sx={{ flexShrink: 0 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        ))}
      </Stack>
      <ActionButton
        buttonType="secondary"
        size="small"
        startIcon={<AddIcon />}
        onClick={() => addItem(fieldName)}
        sx={{ mt: 1 }}
      >
        追加
      </ActionButton>
    </Box>
  );

  return (
    <Stack spacing={3}>
      {renderTechnologyFields(
        'programmingLanguages',
        'programming_languages',
        'プログラミング言語・フレームワーク',
        '例: Java, Spring Boot, React, TypeScript',
        programmingLanguages
      )}
      {renderTechnologyFields(
        'serversDatabases',
        'servers_databases',
        'サーバー・データベース',
        '例: Linux, Windows Server, MySQL, PostgreSQL',
        serversDatabases
      )}
      {renderTechnologyFields(
        'tools',
        'tools',
        'ツール・その他',
        '例: Git, Docker, Jenkins, AWS',
        tools
      )}
    </Stack>
  );
};

/**
 * 職務経歴編集ダイアログコンポーネント
 * UI/UXを最適化した編集フォーム
 */
export const WorkHistoryEditDialog: React.FC<WorkHistoryEditDialogProps> = ({
  open,
  onClose,
  onSave,
  formMethods,
  workHistoryIndex,
  isNew = false,
  workHistoryId,
  userId,
  profileId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeStep, setActiveStep] = useState(0);
  const [showDraftRestoreDialog, setShowDraftRestoreDialog] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSavingIndividually, setIsSavingIndividually] = useState(false);

  const { 
    control, 
    register, 
    formState: { errors },
    watch,
    trigger,
    getValues,
  } = formMethods;
  
  // 個別保存用のミューテーション
  const { create, update, isLoading: isMutating } = useWorkHistoryMutation();
  // userIdはpropsから取得

  // 下書き管理フックを使用
  const {
    hasDraft,
    draftSavedAt,
    loadDraft,
    clearDraft,
  } = useWorkHistoryDraft(
    formMethods,
    workHistoryIndex,
    isNew,
    activeStep,
    setActiveStep
  );

  // 現在の値を監視
  const startDate = watch(`workHistory.${workHistoryIndex}.startDate`);
  const endDate = watch(`workHistory.${workHistoryIndex}.endDate`);

  // ステップ定義
  const steps = ['基本情報', 'プロジェクト詳細', '技術スタック'];

  // 現在のステップのフィールドを検証
  const validateCurrentStep = useCallback(async () => {
    let fieldsToValidate: string[] = [];
    
    switch (activeStep) {
      case 0: // 基本情報
        fieldsToValidate = [
          `workHistory.${workHistoryIndex}.projectName`,
          `workHistory.${workHistoryIndex}.startDate`,
          `workHistory.${workHistoryIndex}.industry`,
          `workHistory.${workHistoryIndex}.teamSize`,
          `workHistory.${workHistoryIndex}.role`,
        ];
        break;
      case 1: // プロジェクト詳細
        fieldsToValidate = [
          `workHistory.${workHistoryIndex}.projectOverview`,
          `workHistory.${workHistoryIndex}.responsibilities`,
          `workHistory.${workHistoryIndex}.achievements`,
          `workHistory.${workHistoryIndex}.processes`,
        ];
        break;
      case 2: // 技術スタック
        // 技術スタックは必須ではないので検証なし
        break;
    }
    
    const results = await Promise.all(
      fieldsToValidate.map(field => trigger(field as any))
    );
    
    return results.every(result => result);
  }, [activeStep, workHistoryIndex, trigger]);

  // ステップ移動
  const handleNext = useCallback(async () => {
    const isValid = await validateCurrentStep();
    if (isValid && activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  }, [activeStep, steps.length, validateCurrentStep]);

  const handleBack = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  }, [activeStep]);

  // 保存処理
  const handleSave = useCallback(async () => {
    // 全フィールドの検証
    const isValid = await trigger([
      `workHistory.${workHistoryIndex}.projectName`,
      `workHistory.${workHistoryIndex}.startDate`,
      `workHistory.${workHistoryIndex}.industry`,
      `workHistory.${workHistoryIndex}.projectOverview`,
      `workHistory.${workHistoryIndex}.responsibilities`,
      `workHistory.${workHistoryIndex}.achievements`,
      `workHistory.${workHistoryIndex}.processes`,
      `workHistory.${workHistoryIndex}.teamSize`,
      `workHistory.${workHistoryIndex}.role`,
    ] as any);

    if (isValid) {
      clearDraft(); // 保存成功時は下書きをクリア
      onSave();
      onClose();
    }
  }, [workHistoryIndex, trigger, onSave, onClose, clearDraft]);

  // 個別保存処理
  const handleIndividualSave = useCallback(async () => {

    // 全フィールドの検証
    const isValid = await trigger([
      `workHistory.${workHistoryIndex}.projectName`,
      `workHistory.${workHistoryIndex}.startDate`,
      `workHistory.${workHistoryIndex}.industry`,
      `workHistory.${workHistoryIndex}.projectOverview`,
      `workHistory.${workHistoryIndex}.responsibilities`,
      `workHistory.${workHistoryIndex}.achievements`,
      `workHistory.${workHistoryIndex}.processes`,
      `workHistory.${workHistoryIndex}.teamSize`,
      `workHistory.${workHistoryIndex}.role`,
    ] as any);

    if (!isValid) return;

    setIsSavingIndividually(true);

    try {
      const workHistoryData = getValues(`workHistory.${workHistoryIndex}`);
      
      // APIリクエスト用のデータを準備
      const requestData = {
        user_id: userId || '',
        profile_id: profileId || '',
        project_name: workHistoryData.projectName,
        start_date: workHistoryData.startDate ? formatDateForApi(workHistoryData.startDate) : '',
        end_date: workHistoryData.endDate ? formatDateForApi(workHistoryData.endDate) : null,
        industry: workHistoryData.industry || 7,
        project_overview: workHistoryData.projectOverview || null,
        responsibilities: workHistoryData.responsibilities || null,
        achievements: workHistoryData.achievements || null,
        remarks: workHistoryData.remarks || null,
        team_size: workHistoryData.teamSize || null,
        role: workHistoryData.role || '',
        processes: workHistoryData.processes?.map(String) || [],
        technologies: [
          ...(workHistoryData.programmingLanguages || []).map((lang: string) => ({
            category_id: 'programming',
            technology_name: lang
          })),
          ...(workHistoryData.serversDatabases || []).map((db: string) => ({
            category_id: 'database',
            technology_name: db
          })),
          ...(workHistoryData.tools || []).map((tool: string) => ({
            category_id: 'tool',
            technology_name: tool
          }))
        ].filter(tech => tech.technology_name)
      };

      if (isNew) {
        // 新規作成
        await create(requestData as WorkHistoryCreateRequest, {
          onSuccess: () => {
            clearDraft();
            onSave();
            // ダイアログは開いたままにする
          },
          showToast: true
        });
      } else if (workHistoryId) {
        // 更新
        await update(workHistoryId, requestData as WorkHistoryUpdateRequest, {
          onSuccess: () => {
            clearDraft();
            onSave();
            // ダイアログは開いたままにする
          },
          showToast: true,
          optimistic: true
        });
      } else {
        // IDがない場合は通常の保存処理
        handleSave();
      }
    } catch (error) {
      console.error('Failed to save work history individually:', error);
    } finally {
      setIsSavingIndividually(false);
    }
  }, [
    handleSave,
    workHistoryIndex,
    trigger,
    getValues,
    userId,
    profileId,

    isNew,
    workHistoryId,
    create,
    update,
    clearDraft,
    onSave,
    onClose
  ]);

  // 確認後の保存処理
  const handleConfirmSave = useCallback(async () => {
    setShowSaveConfirm(false);
    await handleIndividualSave();
  }, [handleIndividualSave]);

  // 下書きを復元
  const handleRestoreDraft = useCallback(() => {
    loadDraft();
    setShowDraftRestoreDialog(false);
  }, [loadDraft]);

  // 下書きを破棄
  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    setShowDraftRestoreDialog(false);
  }, [clearDraft]);

  // ダイアログが開いた時の処理
  useEffect(() => {
    if (open) {
      if (isNew) {
        // 新規作成時は初期値を設定
        const emptyWorkHistory = {
          projectName: '',
          startDate: null,
          endDate: null,
          industry: 0,
          projectOverview: '',
          responsibilities: '',
          achievements: '',
          notes: '',
          processes: [],
          technologies: '',
          programmingLanguages: [''],
          serversDatabases: [''],
          tools: [''],
          teamSize: 0,
          role: '',
        };
        
        // 各フィールドに初期値を設定
        Object.entries(emptyWorkHistory).forEach(([key, value]) => {
          formMethods.setValue(`workHistory.${workHistoryIndex}.${key}` as any, value);
        });
      }
      
      if (hasDraft && !showDraftRestoreDialog) {
        // 下書きがある場合は復元ダイアログを表示
        setShowDraftRestoreDialog(true);
      } else if (!hasDraft) {
        // 下書きがない場合は最初のステップにリセット
        setActiveStep(0);
      }
    }
  }, [open, hasDraft, showDraftRestoreDialog, isNew, workHistoryIndex, formMethods]);

  // 期間を計算
  const calculateDuration = (start: Date | null, end: Date | null): string => {
    if (!start) return '';
    
    const endDate = end || new Date();
    const startDate = new Date(start);
    
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    
    let totalMonths = yearDiff * 12 + monthDiff;
    
    if (endDate.getDate() < startDate.getDate()) {
      totalMonths--;
    }
    
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    if (years > 0 && months > 0) {
      return `${years}年${months}ヶ月`;
    } else if (years > 0) {
      return `${years}年`;
    } else if (months > 0) {
      return `${months}ヶ月`;
    } else {
      return '1ヶ月未満';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : '90vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: 1,
        borderColor: 'divider',
        pb: 2,
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 1,
        }}>
          <Typography variant="h6" component="div">
            {isNew ? '職務経歴を追加' : '職務経歴を編集'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* ステッパー */}
        <Box sx={{ p: 3, pb: 2, backgroundColor: 'background.default' }}>
          <Stepper activeStep={activeStep} alternativeLabel={!isMobile}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* ステップ1: 基本情報 */}
          {activeStep === 0 && (
            <Stack spacing={3}>
              <SectionHeader
                title="基本情報"
                subtitle="プロジェクトの基本的な情報を入力してください"
                icon={<CalendarIcon />}
              />
              
              <TextField
                fullWidth
                label="プロジェクト名"
                {...register(`workHistory.${workHistoryIndex}.projectName`, {
                  required: 'プロジェクト名を入力してください'
                })}
                error={!!errors.workHistory?.[workHistoryIndex]?.projectName}
                helperText={errors.workHistory?.[workHistoryIndex]?.projectName?.message}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormDatePicker
                    name={`workHistory.${workHistoryIndex}.startDate`}
                    control={control}
                    label="開始年月"
                    mode="month-year"
                    minDate={getCareerMinDate()}
                    maxDate={new Date()}
                    required
                    rules={{
                      required: '開始年月を選択してください'
                    }}
                    error={errors.workHistory?.[workHistoryIndex]?.startDate}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormDatePicker
                    name={`workHistory.${workHistoryIndex}.endDate`}
                    control={control}
                    label="終了年月"
                    mode="month-year"
                    minDate={startDate || getCareerMinDate()}
                    maxDate={new Date()}
                    error={errors.workHistory?.[workHistoryIndex]?.endDate}
                    helperText="現在進行中の場合は空欄"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    height: '100%',
                    px: 2,
                    backgroundColor: 'background.default',
                    borderRadius: 1,
                  }}>
                    <Typography variant="body2" color="text.primary">
                      {startDate ? `プロジェクト期間: ${calculateDuration(startDate, endDate)}` : 'プロジェクト期間: 未設定'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormSelect
                    name={`workHistory.${workHistoryIndex}.role`}
                    control={control}
                    label="役割"
                    options={roleOptions}
                    required
                    rules={{
                      required: '役割を選択してください'
                    }}
                    error={errors.workHistory?.[workHistoryIndex]?.role}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField
                    fullWidth
                    label="チーム規模"
                    type="number"
                    InputProps={{ 
                      inputProps: { min: 1 },
                      endAdornment: <Typography variant="body2" color="text.secondary">名</Typography>
                    }}
                    {...register(`workHistory.${workHistoryIndex}.teamSize`, {
                      valueAsNumber: true,
                      required: 'チーム規模を入力してください',
                      min: { value: 1, message: 'チーム規模は1以上で入力してください' }
                    })}
                    error={!!errors.workHistory?.[workHistoryIndex]?.teamSize}
                    helperText={errors.workHistory?.[workHistoryIndex]?.teamSize?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormSelect
                    name={`workHistory.${workHistoryIndex}.industry`}
                    control={control}
                    label="業種"
                    options={industryOptions}
                    required
                    rules={{
                      required: '業種を選択してください'
                    }}
                    error={errors.workHistory?.[workHistoryIndex]?.industry}
                  />
                </Grid>
              </Grid>
            </Stack>
          )}

          {/* ステップ2: プロジェクト詳細 */}
          {activeStep === 1 && (
            <Stack spacing={3}>
              <SectionHeader
                title="プロジェクト詳細"
                subtitle="プロジェクトの詳細情報を入力してください"
                icon={<WorkIcon />}
              />

              <TextField
                fullWidth
                label="プロジェクト概要"
                multiline
                rows={4}
                {...register(`workHistory.${workHistoryIndex}.projectOverview`, {
                  required: 'プロジェクト概要を入力してください'
                })}
                error={!!errors.workHistory?.[workHistoryIndex]?.projectOverview}
                helperText={errors.workHistory?.[workHistoryIndex]?.projectOverview?.message || 'プロジェクトの概要を簡潔に記載してください'}
              />

              <TextField
                fullWidth
                label="担当業務"
                multiline
                rows={4}
                {...register(`workHistory.${workHistoryIndex}.responsibilities`, {
                  required: '担当業務を入力してください'
                })}
                error={!!errors.workHistory?.[workHistoryIndex]?.responsibilities}
                helperText={errors.workHistory?.[workHistoryIndex]?.responsibilities?.message || 'あなたが担当した具体的な業務を記載してください'}
              />

              <TextField
                fullWidth
                label="成果・実績"
                multiline
                rows={4}
                {...register(`workHistory.${workHistoryIndex}.achievements`, {
                  required: '成果・実績を入力してください'
                })}
                error={!!errors.workHistory?.[workHistoryIndex]?.achievements}
                helperText={errors.workHistory?.[workHistoryIndex]?.achievements?.message || 'プロジェクトでの成果や実績を記載してください'}
              />

              <Box>
                <FormCheckboxGroup
                  name={`workHistory.${workHistoryIndex}.processes`}
                  control={control}
                  label="担当工程"
                  options={processOptions}
                  direction="row"
                  required
                  rules={{
                    validate: (value) => {
                      const processArray = value as number[] | null;
                      return processArray && processArray.length > 0 ? true : '担当工程を少なくとも1つ選択してください';
                    }
                  }}
                  error={errors.workHistory?.[workHistoryIndex]?.processes ? { type: 'required', message: '担当工程を選択してください' } : undefined}
                />
                <FormHelperText sx={{ mt: 1 }}>
                  プロジェクトで担当した工程をすべて選択してください
                </FormHelperText>
              </Box>

              <TextField
                fullWidth
                label="備考"
                multiline
                rows={3}
                {...register(`workHistory.${workHistoryIndex}.notes`)}
                helperText="その他特記事項があれば記載してください（任意）"
              />
            </Stack>
          )}

          {/* ステップ3: 技術スタック */}
          {activeStep === 2 && (
            <Stack spacing={3}>
              <SectionHeader
                title="技術スタック"
                subtitle="プロジェクトで使用した技術を入力してください"
                icon={<CodeIcon />}
              />

              <TechnologyInputSection
                formMethods={formMethods}
                workHistoryIndex={workHistoryIndex}
              />
            </Stack>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        borderTop: 1, 
        borderColor: 'divider',
        p: 2,
        gap: 1,
        flexWrap: 'wrap',
      }}>
        {activeStep > 0 && (
          <ActionButton
            buttonType="secondary"
            onClick={handleBack}
            sx={{ mr: 'auto' }}
            disabled={isSavingIndividually || isMutating}
          >
            戻る
          </ActionButton>
        )}
        
        <ActionButton
          buttonType="secondary"
          onClick={onClose}
          disabled={isSavingIndividually || isMutating}
        >
          キャンセル
        </ActionButton>
        
        {activeStep < steps.length - 1 ? (
          <ActionButton
            buttonType="primary"
            onClick={handleNext}
            disabled={isSavingIndividually || isMutating}
          >
            次へ
          </ActionButton>
        ) : (
          <ActionButton
            buttonType="primary"
            onClick={() => setShowSaveConfirm(true)}
            disabled={isSavingIndividually || isMutating}
          >
            {!isSavingIndividually ? '保存する' : '保存中...'}
          </ActionButton>
        )}
      </DialogActions>

      {/* 下書き復元ダイアログ */}
      <ConfirmDialog
        open={showDraftRestoreDialog}
        title="下書きの復元"
        message={
          <Box>
            <Typography variant="body2" gutterBottom>
              前回の編集内容の下書きが見つかりました。
            </Typography>
            {draftSavedAt && (
              <Typography variant="body2" color="text.secondary">
                保存日時: {format(draftSavedAt, 'yyyy年MM月dd日 HH:mm', { locale: ja })}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mt: 1 }}>
              下書きを復元しますか？
            </Typography>
          </Box>
        }
        confirmText="復元する"
        cancelText="破棄する"
        confirmIcon={<RestoreIcon />}
        onConfirm={handleRestoreDraft}
        onCancel={handleDiscardDraft}
      />


      {/* 保存確認ダイアログ */}
      <ConfirmDialog
        open={showSaveConfirm}
        title="職務経歴の保存"
        message="編集中の職務経歴を保存しますか？"
        confirmText="保存"
        cancelText="キャンセル"
        onConfirm={handleConfirmSave}
        onCancel={() => setShowSaveConfirm(false)}
      />
    </Dialog>
  );
};