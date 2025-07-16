import React, { useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  MobileStepper,
} from '@mui/material';
import { useResponsive } from '../../../hooks/common/useResponsive';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  SaveAlt as SaveDraftIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useWorkHistoryForm } from '../../../hooks/workHistory/useWorkHistoryForm';
import { useWorkHistoryMasterData } from '../../../hooks/workHistory/useWorkHistoryMasterData';
import { TempSaveAlert } from './TempSaveAlert';
import { ValidationAlert } from './ValidationAlert';
import { ValidationSummaryCard } from './ValidationSummaryCard';
import WorkHistoryBasicForm from './forms/WorkHistoryBasicForm';
import WorkHistoryDetailForm from './forms/WorkHistoryDetailForm';
import WorkHistoryTechForm from './forms/WorkHistoryTechForm';
import WorkHistoryConfirmation from './forms/WorkHistoryConfirmation';
import type { WorkHistoryFormData, WorkHistoryData } from '../../../types/workHistory';

const DialogContainer = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    maxWidth: 900,
    width: '100%',
    maxHeight: '90vh',
    [theme.breakpoints.down('sm')]: {
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100vh',
      margin: 0,
      borderRadius: 0,
    },
  },
}));

const StepperContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.shape.borderRadius,
  [theme.breakpoints.down('sm')]: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1),
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
}));

const ContentContainer = styled(Box)(({ theme }) => ({
  minHeight: 400,
  padding: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    minHeight: 'auto',
    padding: theme.spacing(1),
    paddingBottom: theme.spacing(2),
  },
}));

const ActionContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
}));

interface WorkHistoryEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: WorkHistoryData) => void;
  editData?: WorkHistoryData | null;
  mode?: 'create' | 'edit';
}

const STEPS = ['基本情報', 'プロジェクト詳細', '技術・スキル', '確認'];

export const WorkHistoryEditDialog: React.FC<WorkHistoryEditDialogProps> = ({
  open,
  onClose,
  onSave,
  editData,
  mode = 'create',
}) => {
  const [activeStep, setActiveStep] = React.useState(0);
  const [showCloseConfirm, setShowCloseConfirm] = React.useState(false);
  const { isMobile, dialogFullScreen } = useResponsive();

  // 編集データの初期値設定
  const initialData = useMemo(() => {
    if (editData) {
      // 編集モードの場合はeditDataを使用
      return {
        projectName: editData.projectName || '',
        startDate: editData.startDate ? new Date(editData.startDate) : null,
        endDate: editData.endDate ? new Date(editData.endDate) : null,
        industry: editData.industry || null,
        companyName: editData.companyName || '',
        projectOverview: editData.projectOverview || '',
        responsibilities: editData.responsibilities || '',
        achievements: editData.achievements || '',
        notes: editData.notes || '',
        teamSize: editData.teamSize || null,
        role: editData.role || '',
        processes: editData.processes || [],
        programmingLanguages: editData.programmingLanguages || [],
        serversDatabases: editData.serversDatabases || [],
        tools: editData.tools || [],
      } as WorkHistoryFormData;
    }
    return undefined;
  }, [editData]);

  // フォーム管理
  const {
    formData,
    isValid,
    isDirty,
    hasChanges,
    isSubmitting,
    validation,
    updateField,
    updateFields,
    submitForm,
    getFieldError,
    hasFieldError,
    tempSave,
  } = useWorkHistoryForm({
    initialData,
    enableTempSave: mode === 'create',
    enableRealTimeValidation: true,
    currentStep: activeStep + 1,
    totalSteps: STEPS.length,
    onSuccess: (data) => {
      onSave(data);
      handleClose();
    },
    onTempSaveRestore: (data) => {
      // 一時保存データが復元された場合は適切なステップに移動
      if (data.projectName) {
        setActiveStep(Math.min(tempSave.data?.metadata.step ? tempSave.data.metadata.step - 1 : 0, STEPS.length - 1));
      }
    },
  });

  // マスターデータ
  const { industries, processes, popularTechnologies } = useWorkHistoryMasterData();

  // ステップ変更
  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (mode === 'edit' && editData?.id) {
      await submitForm(true, editData.id);
    } else {
      await submitForm(false);
    }
  };

  // 一時保存

  // ダイアログ閉じる
  const handleClose = () => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
      setActiveStep(0);
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
    setActiveStep(0);
  };

  // 各ステップのバリデーション
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // 基本情報
        return !hasFieldError('projectName') &&
               !hasFieldError('startDate') &&
               !hasFieldError('endDate') &&
               !hasFieldError('industry') &&
               !hasFieldError('teamSize') &&
               !hasFieldError('role');
      case 1: // プロジェクト詳細
        return !hasFieldError('projectOverview') &&
               !hasFieldError('responsibilities') &&
               !hasFieldError('processes');
      case 2: // 技術・スキル
        return formData.programmingLanguages.length > 0 ||
               formData.serversDatabases.length > 0 ||
               formData.tools.length > 0;
      default:
        return true;
    }
  };

  const canProceed = isStepValid(activeStep);

  // ステップコンテンツのレンダリング
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <WorkHistoryBasicForm
            formData={formData}
            errors={validation.fieldErrors}
            industries={industries}
            onFieldChange={updateField}
            getFieldError={getFieldError}
          />
        );
      case 1:
        return (
          <WorkHistoryDetailForm
            formData={formData}
            errors={validation.fieldErrors}
            processes={processes}
            onFieldChange={updateField}
            getFieldError={getFieldError}
          />
        );
      case 2:
        return (
          <WorkHistoryTechForm
            formData={formData}
            errors={validation.fieldErrors}
            popularTechnologies={popularTechnologies}
            onFieldChange={updateField}
            getFieldError={getFieldError}
          />
        );
      case 3:
        return (
          <WorkHistoryConfirmation
            formData={formData}
            industries={industries}
            processes={processes}
          />
        );
      default:
        return null;
    }
  };

  // ダイアログが開かれたときに一時保存データをチェック
  useEffect(() => {
    if (open && mode === 'create' && !editData) {
      // 一時保存データがある場合は自動的にアラートが表示される
    }
  }, [open, mode, editData]);

  return (
    <>
      <DialogContainer 
        open={open} 
        onClose={handleClose} 
        maxWidth={false}
        fullScreen={isMobile || dialogFullScreen}
        scroll={isMobile ? 'body' : 'paper'}
      >
        <DialogTitle>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            pr: isMobile ? 1 : 2,
          }}>
            <Typography 
              variant={isMobile ? 'h6' : 'h6'}
              sx={{
                fontSize: isMobile ? '1.1rem' : undefined,
                fontWeight: isMobile ? 600 : undefined,
              }}
            >
              {mode === 'create' ? '職務経歴を新規作成' : '職務経歴を編集'}
            </Typography>
            <IconButton 
              onClick={handleClose} 
              size={isMobile ? 'medium' : 'small'}
              sx={{
                color: 'text.secondary',
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {/* 一時保存アラート */}
          {mode === 'create' && tempSave.data && (
            <TempSaveAlert
              tempData={tempSave.data}
              hasLocalData={tempSave.hasLocalData}
              hasServerData={tempSave.hasServerData}
              completionRate={tempSave.completionRate}
              lastSaved={tempSave.lastSaved}
              isAutoSaving={tempSave.isAutoSaving}
              onRestore={tempSave.restore}
              onClear={tempSave.clear}
              showDetails={true}
            />
          )}

          <StepperContainer>
            {isMobile ? (
              // モバイルではMobileStepperを使用
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    ステップ {activeStep + 1} / {STEPS.length}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {STEPS[activeStep]}
                  </Typography>
                </Box>
                <MobileStepper
                  variant="progress"
                  steps={STEPS.length}
                  position="static"
                  activeStep={activeStep}
                  sx={{
                    maxWidth: '100%',
                    flexGrow: 1,
                    backgroundColor: 'transparent',
                    '& .MuiLinearProgress-root': {
                      height: 6,
                      borderRadius: 3,
                    },
                  }}
                  nextButton={<div />}
                  backButton={<div />}
                />
              </Box>
            ) : (
              // デスクトップでは通常のStepper
              <Stepper activeStep={activeStep}>
                {STEPS.map((label, index) => (
                  <Step key={label} completed={index < activeStep && isStepValid(index)}>
                    <StepLabel error={index === activeStep && !canProceed}>
                      {label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}
          </StepperContainer>

          {/* バリデーション表示 */}
          {activeStep === 3 ? (
            // 確認ステップではサマリーカードを表示
            <ValidationSummaryCard
              validation={validation}
              showDetails={true}
            />
          ) : (
            // 入力ステップではアラートを表示
            (validation.errors.length > 0 || validation.warnings?.length > 0) && (
              <ValidationAlert
                errors={validation.errors}
                warnings={validation.warnings || []}
                collapsible={true}
                defaultExpanded={false}
                title={`ステップ${activeStep + 1}の入力チェック結果`}
                maxHeight={200}
              />
            )
          )}

          <ContentContainer>
            {renderStepContent()}
          </ContentContainer>
        </DialogContent>

        <DialogActions sx={{ 
          p: isMobile ? 1.5 : 2,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 1 : 0,
        }}>
          {isMobile ? (
            // モバイルレイアウト：縦並び
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* メインアクション */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                {activeStep < STEPS.length - 1 ? (
                  <>
                    {activeStep > 0 && (
                      <Button
                        onClick={handleBack}
                        variant="outlined"
                        fullWidth
                        size="large"
                      >
                        戻る
                      </Button>
                    )}
                    <Button
                      onClick={handleNext}
                      variant="contained"
                      disabled={!canProceed}
                      fullWidth
                      size="large"
                    >
                      次へ
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={!isValid || isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={16} /> : <SaveIcon />}
                    fullWidth
                    size="large"
                  >
                    {mode === 'create' ? '作成' : '更新'}
                  </Button>
                )}
              </Box>
              
              {/* サブアクション */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  onClick={handleClose} 
                  variant="text"
                  fullWidth
                  color="inherit"
                >
                  キャンセル
                </Button>
                {mode === 'create' && (
                  <Button
                    onClick={tempSave.save}
                    disabled={!hasChanges || tempSave.isAutoSaving}
                    startIcon={tempSave.isAutoSaving ? <CircularProgress size={16} /> : <SaveDraftIcon />}
                    variant="text"
                    fullWidth
                  >
                    一時保存
                  </Button>
                )}
              </Box>
            </Box>
          ) : (
            // デスクトップレイアウト：横並び
            <ActionContainer>
              <Box>
                {mode === 'create' && (
                  <Button
                    onClick={tempSave.save}
                    disabled={!hasChanges || tempSave.isAutoSaving}
                    startIcon={tempSave.isAutoSaving ? <CircularProgress size={16} /> : <SaveDraftIcon />}
                  >
                    一時保存
                  </Button>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={handleClose} variant="outlined">
                  キャンセル
                </Button>
                
                {activeStep > 0 && (
                  <Button onClick={handleBack}>
                    戻る
                  </Button>
                )}

                {activeStep < STEPS.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    variant="contained"
                    disabled={!canProceed}
                  >
                    次へ
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={!isValid || isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={16} /> : <SaveIcon />}
                  >
                    {mode === 'create' ? '作成' : '更新'}
                  </Button>
                )}
              </Box>
            </ActionContainer>
          )}
        </DialogActions>
      </DialogContainer>

      {/* 閉じる確認ダイアログ */}
      <Dialog 
        open={showCloseConfirm} 
        onClose={() => setShowCloseConfirm(false)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>編集内容を破棄しますか？</DialogTitle>
        <DialogContent>
          <Typography>
            編集中の内容が保存されていません。
            このまま閉じると、変更内容は失われます。
          </Typography>
        </DialogContent>
        <DialogActions sx={{
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 1 : 0,
          p: isMobile ? 2 : 1,
        }}>
          <Button 
            onClick={() => setShowCloseConfirm(false)}
            fullWidth={isMobile}
            variant={isMobile ? 'contained' : 'text'}
            size={isMobile ? 'large' : 'medium'}
          >
            編集を続ける
          </Button>
          <Button 
            onClick={handleConfirmClose} 
            color="error"
            fullWidth={isMobile}
            variant={isMobile ? 'outlined' : 'text'}
            size={isMobile ? 'large' : 'medium'}
          >
            破棄して閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WorkHistoryEditDialog;