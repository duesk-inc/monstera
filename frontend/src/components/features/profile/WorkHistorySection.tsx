import React, { useState, useMemo, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Stack, 
  IconButton,
  FormControl,
  InputLabel,
} from '@mui/material';
import { 
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { ProfileFormData } from '@/types/profile';
import ActionButton from '@/components/common/ActionButton';
import { ConfirmDialog, FormDatePicker, FormSelect, FormCheckboxGroup, CommonAccordion } from '@/components/common';
import { TechnologiesSection } from './TechnologySection';
import { getCareerMinDate } from '@/constants/date';

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

// 型定義
interface WorkHistoryField {
  projectName: string;
  startDate: Date | null;
  endDate: Date | null;
  industry: number;
  projectOverview: string;
  responsibilities: string;
  achievements: string;
  notes: string;
  processes: number[];
  technologies: string;
  programmingLanguages: string[];
  serversDatabases: string[];
  tools: string[];
  teamSize: number;
  role: string;
}

interface WorkHistorySectionProps {
  formMethods: UseFormReturn<ProfileFormData>;
}

/**
 * 職歴情報セクションコンポーネント
 * 職歴の追加・削除・編集・アコーディオン表示を管理
 * React.memoで最適化済み
 */
export const WorkHistorySection: React.FC<WorkHistorySectionProps> = React.memo(({
  formMethods,
}) => {
  const { 
    control, 
    register, 
    formState: { errors },
    getValues,
    setValue,
  } = formMethods;

  // アコーディオンの展開状態を管理
  const [expandedPanels, setExpandedPanels] = useState<{ [key: number]: boolean }>({});

  // 削除確認ダイアログの状態を管理
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    targetIndex: number;
  }>({
    isOpen: false,
    targetIndex: -1
  });

  // React Hook Formのフィールド配列を監視
  const workHistoryFields = useWatch({
    control,
    name: 'workHistory'
  }) || [{
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
    programmingLanguages: [],
    serversDatabases: [],
    tools: [],
    teamSize: 0,
    role: '',
  }];

  // 期間を計算する関数をメモ化
  const calculateDuration = useCallback((startDate: Date | null, endDate: Date | null): string => {
    if (!startDate) return '';
    
    const end = endDate || new Date(); // 終了日がない場合は現在日を使用
    const start = new Date(startDate);
    
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    
    let totalMonths = yearDiff * 12 + monthDiff;
    
    // 日付を考慮した調整
    if (end.getDate() < start.getDate()) {
      totalMonths--;
    }
    
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    if (years > 0 && months > 0) {
      return `（${years}年${months}ヶ月）`;
    } else if (years > 0) {
      return `（${years}年）`;
    } else if (months > 0) {
      return `（${months}ヶ月）`;
    } else {
      return '（1ヶ月未満）';
    }
  }, []);

  // FieldArrayのappendとremove関数をメモ化
  const appendWorkHistory = useCallback((data: WorkHistoryField) => {
    const current = getValues().workHistory || [];
    setValue('workHistory', [...current, data]);
  }, [getValues, setValue]);

  const removeWorkHistory = useCallback((index: number) => {
    const current = getValues().workHistory || [];
    if (current.length > 1 || index > 0) {
      setValue('workHistory', current.filter((_, i) => i !== index));
    }
  }, [getValues, setValue]);

  // 削除確認ダイアログを開く処理をメモ化
  const handleDeleteWorkHistory = useCallback((index: number) => {
    const workHistory = workHistoryFields[index];
    const hasContent = workHistory && Boolean(
      workHistory.projectName ||
      workHistory.startDate ||
      workHistory.endDate ||
      workHistory.industry ||
      workHistory.projectOverview ||
      workHistory.responsibilities ||
      workHistory.achievements ||
      workHistory.notes ||
      workHistory.technologies ||
      workHistory.role ||
      workHistory.teamSize > 0 ||
      (workHistory.processes && workHistory.processes.length > 0)
    );

    if (hasContent) {
      // 入力内容がある場合は確認ダイアログを表示
      setDeleteConfirmDialog({
        isOpen: true,
        targetIndex: index
      });
    } else {
      // 入力内容がない場合は直接削除
      removeWorkHistory(index);
    }
  }, [workHistoryFields, removeWorkHistory]);

  // 削除確認ダイアログの処理をメモ化
  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmDialog.targetIndex >= 0) {
      removeWorkHistory(deleteConfirmDialog.targetIndex);
    }
    setDeleteConfirmDialog({ isOpen: false, targetIndex: -1 });
  }, [deleteConfirmDialog.targetIndex, removeWorkHistory]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmDialog({ isOpen: false, targetIndex: -1 });
  }, []);

  // 日付表示フォーマット関数をメモ化
  const formatDateDisplay = useCallback((date: Date | null) => {
    if (!date) return '';
    return `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月`;
  }, []);

  // 新しい職務経歴を追加する処理をメモ化
  const handleAddWorkHistory = useCallback(() => {
    appendWorkHistory({
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
      programmingLanguages: [],
      serversDatabases: [],
      tools: [],
      teamSize: 0,
      role: '',
    });
  }, [appendWorkHistory]);

  return (
    <Box sx={{ 
      backgroundColor: '#f6f8fa',
      borderRadius: '8px',
      p: 3,
      border: '1px solid #d1d9e0'
    }}>
      {workHistoryFields.map((field: WorkHistoryField, index: number) => {
        const workHistory = workHistoryFields[index];
        const projectName = workHistory?.projectName || '';
        const startDate = workHistory?.startDate;
        const endDate = workHistory?.endDate;
        
        // アコーディオンタイトル用の情報を作成
        const startDateDisplay = formatDateDisplay(startDate);
        const endDateDisplay = endDate ? formatDateDisplay(endDate) : '現在';
        const duration = calculateDuration(startDate, endDate);
        
        const accordionTitle = projectName ? 
          `#${index + 1} ${projectName}${startDateDisplay ? ` [${startDateDisplay} 〜 ${endDateDisplay}${duration}]` : ''}` :
          `職務経歴 #${index + 1}`;
        
        return (
          <CommonAccordion
            key={index}
            title={accordionTitle}
            variant="minimal"
            expanded={expandedPanels[index] || false}
            onToggle={(expanded) => {
              setExpandedPanels(prev => ({
                ...prev,
                [index]: expanded
              }));
            }}
            sx={{ mb: 2 }}
            data-testid={`work-history-accordion-${index}`}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#656d76' }}>
                #{index + 1} 詳細情報
              </Typography>
              
              {workHistoryFields.length > 1 && (
                <IconButton 
                  size="small"
                  onClick={() => handleDeleteWorkHistory(index)}
                  aria-label="経歴を削除"
                  sx={{
                    color: '#cf222e',
                    '&:hover': {
                      backgroundColor: '#ffebe9'
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            
            <Stack spacing={2}>
              <TextField
                label="プロジェクト名"
                {...register(`workHistory.${index}.projectName` as const, {
                  required: 'プロジェクト名を入力してください'
                })}
                error={!!errors.workHistory?.[index]?.projectName}
                helperText={errors.workHistory?.[index]?.projectName?.message}
              />
              
              {/* 開始日・終了日の横並び */}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FormDatePicker
                  name={`workHistory.${index}.startDate` as const}
                  control={control}
                  label="開始年月"
                  mode="month-year"
                  minDate={getCareerMinDate()}
                  maxDate={new Date()}
                  required
                  rules={{
                    required: '開始年月を選択してください'
                  }}
                  error={errors.workHistory?.[index]?.startDate}
                />
                <FormDatePicker
                  name={`workHistory.${index}.endDate` as const}
                  control={control}
                  label="終了年月（現在進行中の場合は空欄）"
                  mode="month-year"
                  minDate={startDate || getCareerMinDate()}
                  maxDate={new Date()}
                  error={errors.workHistory?.[index]?.endDate}
                />
              </Stack>
              
              {/* 業種・チーム規模の横並び */}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id={`industry-label-${index}`}>業種</InputLabel>
                  <FormSelect
                    name={`workHistory.${index}.industry` as const}
                    control={control}
                    label="業種"
                    options={industryOptions}
                    required
                    rules={{
                      required: '業種を選択してください'
                    }}
                    error={errors.workHistory?.[index]?.industry}
                  />
                </FormControl>
                <TextField
                  fullWidth
                  label="チーム規模"
                  type="number"
                  InputProps={{ inputProps: { min: 1 } }}
                  {...register(`workHistory.${index}.teamSize` as const, {
                    valueAsNumber: true,
                    required: 'チーム規模を入力してください',
                    min: { value: 1, message: 'チーム規模は1以上で入力してください' }
                  })}
                  error={!!errors.workHistory?.[index]?.teamSize}
                  helperText={errors.workHistory?.[index]?.teamSize?.message}
                  sx={{ height: 56 }}
                />
              </Stack>
              
              <TextField
                label="案件概要"
                multiline
                rows={3}
                {...register(`workHistory.${index}.projectOverview` as const, {
                  required: '案件概要を入力してください'
                })}
                error={!!errors.workHistory?.[index]?.projectOverview}
                helperText={errors.workHistory?.[index]?.projectOverview?.message}
              />
              
              <TextField
                label="担当業務"
                multiline
                rows={3}
                {...register(`workHistory.${index}.responsibilities` as const, {
                  required: '担当業務を入力してください'
                })}
                error={!!errors.workHistory?.[index]?.responsibilities}
                helperText={errors.workHistory?.[index]?.responsibilities?.message}
              />
              
              <TextField
                label="成果／貢献"
                multiline
                rows={3}
                {...register(`workHistory.${index}.achievements` as const, {
                  required: '成果／貢献を入力してください'
                })}
                error={!!errors.workHistory?.[index]?.achievements}
                helperText={errors.workHistory?.[index]?.achievements?.message}
              />
              
              {/* <Typography variant="subtitle2" gutterBottom>担当工程</Typography> */}
							{/* <Typography variant="h6" sx={{ mb: 3 }}>担当工程</Typography> */}
              <FormCheckboxGroup
                name={`workHistory.${index}.processes` as const}
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
                error={errors.workHistory?.[index]?.processes ? { type: 'required', message: '担当工程を選択してください' } : undefined}
              />
              
              <TechnologiesSection
                workHistoryIndex={index}
                formMethods={formMethods}
              />
              
              <TextField
                label="使用技術（従来）"
                placeholder="Java, Spring Boot, MySQL, AWS など"
                {...register(`workHistory.${index}.technologies` as const)}
                error={!!errors.workHistory?.[index]?.technologies}
                helperText={errors.workHistory?.[index]?.technologies?.message}
                sx={{ display: 'none' }}
              />
              
              <TextField
                label="役割"
                placeholder="プロジェクトリーダー、フロントエンドエンジニア など"
                {...register(`workHistory.${index}.role` as const, {
                  required: '役割を入力してください'
                })}
                error={!!errors.workHistory?.[index]?.role}
                helperText={errors.workHistory?.[index]?.role?.message}
              />
              
              <TextField
                label="備考"
                multiline
                rows={2}
                {...register(`workHistory.${index}.notes` as const)}
              />
            </Stack>
          </CommonAccordion>
        );
      })}
      
      <ActionButton
        buttonType="secondary"
        startIcon={<AddIcon />}
        onClick={handleAddWorkHistory}
        sx={{ 
          mt: 2,
          fontWeight: 500
        }}
      >
        職務経歴を追加
      </ActionButton>

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={deleteConfirmDialog.isOpen}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="職務経歴の削除確認"
        message="この職務経歴には入力された情報があります。削除すると入力内容はすべて失われます。本当に削除しますか？"
        severity="warning"
        confirmText="削除する"
        cancelText="キャンセル"
      />
    </Box>
  );
}); 