import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Alert,
  LinearProgress,
  IconButton,
  Divider,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { WorkHistoryItem } from '../../../types/workHistory';
import { useAriaAttributes, useKeyboardNavigation } from '../../../hooks/accessibility/useAccessibility';
import { useFocusManagement, useLiveRegion } from '../../../hooks/accessibility/useFocusManagement';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    minHeight: '60vh',
    maxHeight: '90vh',
  },
  '& .MuiDialogTitle-root': {
    paddingBottom: theme.spacing(1),
  },
}));

const StepperContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '& .MuiStep-root': {
    '&:focus-within': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
      borderRadius: theme.shape.borderRadius,
    },
  },
}));

const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '& .MuiTextField-root': {
    marginBottom: theme.spacing(2),
  },
}));

const ErrorAlert = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiAlert-message': {
    width: '100%',
  },
}));

interface FormErrors {
  [key: string]: string | undefined;
}

interface AccessibleWorkHistoryFormProps {
  open: boolean;
  workHistory?: WorkHistoryItem | null;
  isLoading?: boolean;
  onClose: () => void;
  onSave: (workHistory: Partial<WorkHistoryItem>) => Promise<void>;
  onTempSave?: (workHistory: Partial<WorkHistoryItem>) => void;
  industries?: string[];
}

const steps = [
  { id: 'basic', label: '基本情報', description: 'プロジェクト名、会社名、業界などの基本情報を入力' },
  { id: 'details', label: '詳細情報', description: 'プロジェクト概要、担当業務、実績などの詳細を入力' },
  { id: 'technologies', label: '技術情報', description: '使用した技術やツールを選択・入力' },
  { id: 'review', label: '確認', description: '入力内容を確認して保存' },
];

export const AccessibleWorkHistoryForm: React.FC<AccessibleWorkHistoryFormProps> = ({
  open,
  workHistory,
  isLoading = false,
  onClose,
  onSave,
  onTempSave,
  industries = [],
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Partial<WorkHistoryItem>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveAttempted, setSaveAttempted] = useState(false);
  
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  
  const { getFormFieldAttributes, getButtonAttributes, getStatusAttributes } = useAriaAttributes();
  const { handleEscapeKey, handleActionKeys } = useKeyboardNavigation();
  const { saveFocus, restoreFocus, setFocusTrap, activateFocusTrap, deactivateFocusTrap, focusFirstElement } = useFocusManagement();
  const { announce } = useLiveRegion();

  // フォームデータの初期化
  useEffect(() => {
    if (open) {
      if (workHistory) {
        setFormData(workHistory);
        announce(`${workHistory.projectName}の編集を開始します`, 'polite');
      } else {
        setFormData({});
        announce('新規職務経歴の作成を開始します', 'polite');
      }
      setActiveStep(0);
      setErrors({});
      setSaveAttempted(false);
    }
  }, [open, workHistory, announce]);

  // フォーカス管理
  useEffect(() => {
    if (open) {
      saveFocus();
      setFocusTrap(dialogRef.current);
      activateFocusTrap();
      
      // 少し遅延してから最初のフィールドにフォーカス
      setTimeout(() => {
        firstFieldRef.current?.focus();
      }, 100);
    } else {
      deactivateFocusTrap();
      restoreFocus();
    }

    return () => {
      if (open) {
        deactivateFocusTrap();
      }
    };
  }, [open, saveFocus, restoreFocus, setFocusTrap, activateFocusTrap, deactivateFocusTrap]);

  // バリデーション
  const validateStep = useCallback((step: number): FormErrors => {
    const stepErrors: FormErrors = {};

    switch (step) {
      case 0: // 基本情報
        if (!formData.projectName?.trim()) {
          stepErrors.projectName = 'プロジェクト名は必須です';
        }
        if (!formData.industry && !formData.industryName) {
          stepErrors.industry = '業界は必須です';
        }
        if (!formData.role?.trim()) {
          stepErrors.role = '役割は必須です';
        }
        if (!formData.startDate) {
          stepErrors.startDate = '開始日は必須です';
        }
        if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
          stepErrors.endDate = '終了日は開始日より後の日付を入力してください';
        }
        break;

      case 1: // 詳細情報
        // 詳細情報は任意項目のため、特別なバリデーションなし
        break;

      case 2: // 技術情報
        // 技術情報も任意項目のため、特別なバリデーションなし
        break;

      case 3: // 確認
        // すべてのステップをバリデーション
        return {
          ...validateStep(0),
          ...validateStep(1),
          ...validateStep(2),
        };
    }

    return stepErrors;
  }, [formData]);

  // フィールド値の更新
  const handleFieldChange = useCallback((field: keyof WorkHistoryItem, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // エラーがある場合はクリア
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // 一時保存
    onTempSave?.({ ...formData, [field]: value });
  }, [formData, errors, onTempSave]);

  // ステップ移動
  const handleNext = useCallback(() => {
    const stepErrors = validateStep(activeStep);
    setErrors(stepErrors);

    if (Object.keys(stepErrors).length === 0) {
      const nextStep = activeStep + 1;
      setActiveStep(nextStep);
      announce(`ステップ ${nextStep + 1}: ${steps[nextStep].label}に移動しました`, 'polite');
      
      // 次のステップの最初のフィールドにフォーカス
      setTimeout(() => {
        focusFirstElement(dialogRef.current);
      }, 100);
    } else {
      announce(`入力エラーがあります。${Object.keys(stepErrors).length}個のフィールドを確認してください`, 'assertive');
      
      // 最初のエラーフィールドにフォーカス
      const firstErrorField = Object.keys(stepErrors)[0];
      const errorElement = dialogRef.current?.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
      errorElement?.focus();
    }
  }, [activeStep, validateStep, announce, focusFirstElement]);

  const handleBack = useCallback(() => {
    const prevStep = activeStep - 1;
    setActiveStep(prevStep);
    announce(`ステップ ${prevStep + 1}: ${steps[prevStep].label}に戻りました`, 'polite');
    
    setTimeout(() => {
      focusFirstElement(dialogRef.current);
    }, 100);
  }, [activeStep, announce, focusFirstElement]);

  // 保存処理
  const handleSave = useCallback(async () => {
    setSaveAttempted(true);
    const allErrors = validateStep(3);
    setErrors(allErrors);

    if (Object.keys(allErrors).length === 0) {
      try {
        announce('保存しています...', 'polite');
        await onSave(formData);
        announce('保存が完了しました', 'assertive');
        onClose();
      } catch (error) {
        announce('保存に失敗しました', 'assertive');
      }
    } else {
      announce(`保存できません。${Object.keys(allErrors).length}個のエラーを修正してください`, 'assertive');
      
      // 最初のエラーがあるステップに移動
      const errorFields = Object.keys(allErrors);
      let targetStep = 0;
      
      if (errorFields.some(field => ['projectName', 'industry', 'industryName', 'role', 'startDate', 'endDate'].includes(field))) {
        targetStep = 0;
      } else if (errorFields.some(field => ['projectOverview', 'responsibilities', 'achievements'].includes(field))) {
        targetStep = 1;
      } else if (errorFields.some(field => ['programmingLanguages', 'serversDatabases', 'tools'].includes(field))) {
        targetStep = 2;
      }
      
      setActiveStep(targetStep);
    }
  }, [formData, validateStep, onSave, onClose, announce]);

  // キーボードナビゲーション
  const handleDialogKeyDown = useCallback((event: React.KeyboardEvent) => {
    handleEscapeKey(event, onClose);
  }, [handleEscapeKey, onClose]);

  // エラーメッセージの生成
  const getErrorMessage = useCallback((field: string) => {
    return errors[field];
  }, [errors]);

  const hasErrors = Object.keys(errors).length > 0;
  const isLastStep = activeStep === steps.length - 1;
  const currentStep = steps[activeStep];

  return (
    <StyledDialog
      ref={dialogRef}
      open={open}
      onClose={onClose}
      onKeyDown={handleDialogKeyDown}
      maxWidth="md"
      fullWidth
      aria-labelledby="work-history-form-title"
      aria-describedby="work-history-form-description"
    >
      <DialogTitle id="work-history-form-title">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {workHistory ? '職務経歴の編集' : '新規職務経歴の作成'}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            {...getButtonAttributes('閉じる')}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography
          id="work-history-form-description"
          variant="body2"
          color="text.secondary"
          paragraph
        >
          {currentStep.description}
        </Typography>

        {/* ステッパー */}
        <StepperContainer>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((step, index) => (
              <Step key={step.id}>
                <StepLabel
                  error={saveAttempted && index === activeStep && hasErrors}
                  aria-current={index === activeStep ? 'step' : undefined}
                >
                  {step.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </StepperContainer>

        {/* エラー表示 */}
        {hasErrors && saveAttempted && (
          <ErrorAlert
            severity="error"
            icon={<WarningIcon />}
            {...getStatusAttributes('error', 'フォームに入力エラーがあります')}
          >
            <Typography variant="subtitle2" gutterBottom>
              以下の項目を修正してください:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>
                  <Typography variant="body2">{message}</Typography>
                </li>
              ))}
            </ul>
          </ErrorAlert>
        )}

        {/* ローディング */}
        {isLoading && (
          <Box mb={2}>
            <LinearProgress aria-describedby="form-loading-description" />
            <Typography id="form-loading-description" variant="body2" sx={{ mt: 1 }}>
              保存しています...
            </Typography>
          </Box>
        )}

        {/* フォームステップ */}
        <Box>
          {activeStep === 0 && (
            <FormSection>
              <Typography variant="h6" gutterBottom>
                基本情報
              </Typography>
              
              <TextField
                ref={firstFieldRef}
                fullWidth
                label="プロジェクト名"
                name="projectName"
                value={formData.projectName || ''}
                onChange={(e) => handleFieldChange('projectName', e.target.value)}
                error={!!getErrorMessage('projectName')}
                helperText={getErrorMessage('projectName') || 'プロジェクトの正式名称を入力してください'}
                required
                {...getFormFieldAttributes('projectName', true, !!getErrorMessage('projectName'), getErrorMessage('projectName'), 'プロジェクトの正式名称を入力してください')}
              />

              <TextField
                fullWidth
                label="会社名"
                name="companyName"
                value={formData.companyName || ''}
                onChange={(e) => handleFieldChange('companyName', e.target.value)}
                helperText="プロジェクトを実施した会社名"
                {...getFormFieldAttributes('companyName', false, false, undefined, 'プロジェクトを実施した会社名')}
              />

              <FormControl 
                fullWidth 
                error={!!getErrorMessage('industry')}
                required
              >
                <InputLabel id="industry-label">業界</InputLabel>
                <Select
                  labelId="industry-label"
                  name="industry"
                  value={formData.industryName || formData.industry || ''}
                  onChange={(e) => handleFieldChange('industryName', e.target.value)}
                  label="業界"
                  {...getFormFieldAttributes('industry', true, !!getErrorMessage('industry'), getErrorMessage('industry'))}
                >
                  {industries.map((industry) => (
                    <MenuItem key={industry} value={industry}>
                      {industry}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {getErrorMessage('industry') || 'プロジェクトが属する業界を選択してください'}
                </FormHelperText>
              </FormControl>

              <TextField
                fullWidth
                label="役割・ポジション"
                name="role"
                value={formData.role || ''}
                onChange={(e) => handleFieldChange('role', e.target.value)}
                error={!!getErrorMessage('role')}
                helperText={getErrorMessage('role') || 'プロジェクトでの役割やポジション'}
                required
                {...getFormFieldAttributes('role', true, !!getErrorMessage('role'), getErrorMessage('role'), 'プロジェクトでの役割やポジション')}
              />

              <Box display="flex" gap={2}>
                <TextField
                  type="date"
                  label="開始日"
                  name="startDate"
                  value={formData.startDate || ''}
                  onChange={(e) => handleFieldChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  error={!!getErrorMessage('startDate')}
                  helperText={getErrorMessage('startDate')}
                  required
                  sx={{ flex: 1 }}
                  {...getFormFieldAttributes('startDate', true, !!getErrorMessage('startDate'), getErrorMessage('startDate'))}
                />

                <TextField
                  type="date"
                  label="終了日"
                  name="endDate"
                  value={formData.endDate || ''}
                  onChange={(e) => handleFieldChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  error={!!getErrorMessage('endDate')}
                  helperText={getErrorMessage('endDate') || '現在も継続中の場合は空欄'}
                  sx={{ flex: 1 }}
                  {...getFormFieldAttributes('endDate', false, !!getErrorMessage('endDate'), getErrorMessage('endDate'), '現在も継続中の場合は空欄')}
                />
              </Box>
            </FormSection>
          )}

          {activeStep === 1 && (
            <FormSection>
              <Typography variant="h6" gutterBottom>
                詳細情報
              </Typography>

              <TextField
                ref={firstFieldRef}
                fullWidth
                multiline
                rows={4}
                label="プロジェクト概要"
                name="projectOverview"
                value={formData.projectOverview || ''}
                onChange={(e) => handleFieldChange('projectOverview', e.target.value)}
                helperText="プロジェクトの目的や背景、概要を記述してください"
                {...getFormFieldAttributes('projectOverview', false, false, undefined, 'プロジェクトの目的や背景、概要を記述してください')}
              />

              <TextField
                fullWidth
                multiline
                rows={4}
                label="担当業務"
                name="responsibilities"
                value={formData.responsibilities || ''}
                onChange={(e) => handleFieldChange('responsibilities', e.target.value)}
                helperText="プロジェクトで担当した具体的な業務内容"
                {...getFormFieldAttributes('responsibilities', false, false, undefined, 'プロジェクトで担当した具体的な業務内容')}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="実績・成果"
                name="achievements"
                value={formData.achievements || ''}
                onChange={(e) => handleFieldChange('achievements', e.target.value)}
                helperText="プロジェクトで達成した成果や実績"
                {...getFormFieldAttributes('achievements', false, false, undefined, 'プロジェクトで達成した成果や実績')}
              />

              <TextField
                type="number"
                label="チーム規模"
                name="teamSize"
                value={formData.teamSize || ''}
                onChange={(e) => handleFieldChange('teamSize', parseInt(e.target.value) || undefined)}
                helperText="プロジェクトに参加したメンバー数"
                inputProps={{ min: 1, max: 1000 }}
                {...getFormFieldAttributes('teamSize', false, false, undefined, 'プロジェクトに参加したメンバー数')}
              />
            </FormSection>
          )}

          {activeStep === 2 && (
            <FormSection>
              <Typography variant="h6" gutterBottom>
                技術情報
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                使用した技術やツールを入力してください。カンマ区切りで複数入力できます。
              </Typography>

              <TextField
                ref={firstFieldRef}
                fullWidth
                label="プログラミング言語"
                name="programmingLanguages"
                value={Array.isArray(formData.programmingLanguages) ? formData.programmingLanguages.join(', ') : ''}
                onChange={(e) => handleFieldChange('programmingLanguages', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                helperText="例: JavaScript, TypeScript, Python"
                placeholder="JavaScript, TypeScript"
                {...getFormFieldAttributes('programmingLanguages', false, false, undefined, '例: JavaScript, TypeScript, Python')}
              />

              <TextField
                fullWidth
                label="サーバー・データベース"
                name="serversDatabases"
                value={Array.isArray(formData.serversDatabases) ? formData.serversDatabases.join(', ') : ''}
                onChange={(e) => handleFieldChange('serversDatabases', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                helperText="例: MySQL, PostgreSQL, Redis, Docker"
                placeholder="MySQL, Redis"
                {...getFormFieldAttributes('serversDatabases', false, false, undefined, '例: MySQL, PostgreSQL, Redis, Docker')}
              />

              <TextField
                fullWidth
                label="ツール・その他"
                name="tools"
                value={Array.isArray(formData.tools) ? formData.tools.join(', ') : ''}
                onChange={(e) => handleFieldChange('tools', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                helperText="例: Git, Jenkins, JIRA, Figma"
                placeholder="Git, Jenkins"
                {...getFormFieldAttributes('tools', false, false, undefined, '例: Git, Jenkins, JIRA, Figma')}
              />
            </FormSection>
          )}

          {activeStep === 3 && (
            <FormSection>
              <Typography variant="h6" gutterBottom>
                入力内容の確認
              </Typography>

              <Box mb={2}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  基本情報
                </Typography>
                <Typography variant="body2">プロジェクト名: {formData.projectName}</Typography>
                <Typography variant="body2">会社名: {formData.companyName || '未入力'}</Typography>
                <Typography variant="body2">業界: {formData.industryName || formData.industry}</Typography>
                <Typography variant="body2">役割: {formData.role}</Typography>
                <Typography variant="body2">
                  期間: {formData.startDate} 〜 {formData.endDate || '現在'}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box mb={2}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  詳細情報
                </Typography>
                <Typography variant="body2">
                  プロジェクト概要: {formData.projectOverview || '未入力'}
                </Typography>
                <Typography variant="body2">
                  担当業務: {formData.responsibilities || '未入力'}
                </Typography>
                <Typography variant="body2">
                  実績・成果: {formData.achievements || '未入力'}
                </Typography>
                <Typography variant="body2">
                  チーム規模: {formData.teamSize ? `${formData.teamSize}人` : '未入力'}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  技術情報
                </Typography>
                <Typography variant="body2">
                  プログラミング言語: {Array.isArray(formData.programmingLanguages) && formData.programmingLanguages.length > 0 ? formData.programmingLanguages.join(', ') : '未入力'}
                </Typography>
                <Typography variant="body2">
                  サーバー・データベース: {Array.isArray(formData.serversDatabases) && formData.serversDatabases.length > 0 ? formData.serversDatabases.join(', ') : '未入力'}
                </Typography>
                <Typography variant="body2">
                  ツール・その他: {Array.isArray(formData.tools) && formData.tools.length > 0 ? formData.tools.join(', ') : '未入力'}
                </Typography>
              </Box>
            </FormSection>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Box display="flex" justifyContent="space-between" width="100%">
          <Button
            onClick={handleBack}
            disabled={activeStep === 0 || isLoading}
            startIcon={<PrevIcon />}
            {...getButtonAttributes('前のステップに戻る')}
          >
            戻る
          </Button>

          <Box display="flex" gap={1}>
            <Button 
              onClick={onClose} 
              disabled={isLoading}
              {...getButtonAttributes('キャンセル')}
            >
              キャンセル
            </Button>
            
            {isLastStep ? (
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={isLoading}
                startIcon={<SaveIcon />}
                {...getButtonAttributes('保存')}
              >
                保存
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={isLoading}
                endIcon={<NextIcon />}
                {...getButtonAttributes('次のステップに進む')}
              >
                次へ
              </Button>
            )}
          </Box>
        </Box>
      </DialogActions>
    </StyledDialog>
  );
};