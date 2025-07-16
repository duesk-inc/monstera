'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  Chip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Close,
  Sync,
  CheckCircle,
  Error,
  Warning,
  Info,
  Refresh,
  Download,
  Upload
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

import { StatusChip } from '@/components/common';
import { POC_SYNC_STATUS, POC_SYNC_STATUS_COLORS } from '@/constants/sales';
import { SPACING } from '@/constants/dimensions';
import type { PocProject, PocSyncResult, PocSyncStep } from '@/types/sales';

interface PocSyncDialogProps {
  open: boolean;
  project?: PocProject;
  syncResult?: PocSyncResult;
  isLoading?: boolean;
  onClose: () => void;
  onSync: (projectId?: string) => void;
  onRetry?: (projectId: string) => void;
  onForceSync?: () => void;
}

/**
 * POC同期実行・結果表示ダイアログ
 */
export const PocSyncDialog: React.FC<PocSyncDialogProps> = ({
  open,
  project,
  syncResult,
  isLoading = false,
  onClose,
  onSync,
  onRetry,
  onForceSync
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [syncSteps, setSyncSteps] = useState<PocSyncStep[]>([]);

  useEffect(() => {
    if (syncResult?.steps) {
      setSyncSteps(syncResult.steps);
      const currentStepIndex = syncResult.steps.findIndex(step => step.status === 'running');
      setActiveStep(currentStepIndex >= 0 ? currentStepIndex : syncResult.steps.length - 1);
    }
  }, [syncResult]);

  const handleSync = () => {
    onSync(project?.id);
  };

  const handleRetry = () => {
    if (project?.id && onRetry) {
      onRetry(project.id);
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      case 'running':
        return <Sync color="primary" />;
      default:
        return <Info color="disabled" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'primary';
      default:
        return 'grey';
    }
  };

  const isAllSync = !project; // プロジェクト指定がない場合は全体同期
  const title = isAllSync ? 'POC全体同期' : `POC同期: ${project?.projectName}`;

  const defaultSteps: PocSyncStep[] = [
    {
      id: '1',
      name: 'POC接続確認',
      description: 'monstera-pocへの接続を確認しています',
      status: 'pending',
      startTime: '',
      endTime: '',
      details: []
    },
    {
      id: '2',
      name: 'データ取得',
      description: 'POCプロジェクトデータを取得しています',
      status: 'pending',
      startTime: '',
      endTime: '',
      details: []
    },
    {
      id: '3',
      name: 'データ検証',
      description: '取得したデータの整合性を確認しています',
      status: 'pending',
      startTime: '',
      endTime: '',
      details: []
    },
    {
      id: '4',
      name: 'データ統合',
      description: '既存データとの統合処理を実行しています',
      status: 'pending',
      startTime: '',
      endTime: '',
      details: []
    },
    {
      id: '5',
      name: '同期完了',
      description: '同期処理が完了しました',
      status: 'pending',
      startTime: '',
      endTime: '',
      details: []
    }
  ];

  const displaySteps = syncSteps.length > 0 ? syncSteps : defaultSteps;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* プロジェクト情報 */}
        {project && (
          <Box sx={{ mb: SPACING.lg }}>
            <Typography variant="h6" gutterBottom>
              プロジェクト情報
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body1" fontWeight="medium">
                {project.projectName}
              </Typography>
              <StatusChip
                status={project.syncStatus}
                statusLabels={POC_SYNC_STATUS}
                statusColors={POC_SYNC_STATUS_COLORS}
                size="small"
              />
            </Box>
            {project.description && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {project.description}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip label={`POC ID: ${project.pocProjectId}`} size="small" />
              <Chip label={project.projectType} size="small" color="primary" />
            </Box>
          </Box>
        )}

        {/* 同期ステータス概要 */}
        {syncResult && (
          <Box sx={{ mb: SPACING.lg }}>
            <Alert 
              severity={
                syncResult.status === 'success' ? 'success' :
                syncResult.status === 'error' ? 'error' : 'info'
              }
              icon={
                syncResult.status === 'success' ? <CheckCircle /> :
                syncResult.status === 'error' ? <Error /> : <Sync />
              }
            >
              <Typography variant="body2" gutterBottom>
                {syncResult.status === 'success' && '同期が正常に完了しました'}
                {syncResult.status === 'error' && '同期処理中にエラーが発生しました'}
                {syncResult.status === 'running' && '同期処理を実行中です...'}
              </Typography>
              
              {syncResult.summary && (
                <Typography variant="body2">
                  {syncResult.summary.totalProjects}件のプロジェクト中、
                  {syncResult.summary.successCount}件成功、
                  {syncResult.summary.errorCount}件エラー
                </Typography>
              )}
            </Alert>

            {/* 進捗バー */}
            {syncResult.status === 'running' && (
              <LinearProgress sx={{ mt: 2 }} />
            )}
          </Box>
        )}

        {/* 同期手順 */}
        <Box sx={{ mb: SPACING.lg }}>
          <Typography variant="h6" gutterBottom>
            同期手順
          </Typography>
          
          <Stepper activeStep={activeStep} orientation="vertical">
            {displaySteps.map((step, index) => (
              <Step key={step.id}>
                <StepLabel
                  icon={getStepIcon(step.status)}
                  sx={{
                    '& .MuiStepLabel-label': {
                      color: theme.palette[getStepColor(step.status) as keyof typeof theme.palette].main
                    }
                  }}
                >
                  {step.name}
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {step.description}
                  </Typography>
                  
                  {step.details && step.details.length > 0 && (
                    <List dense sx={{ mt: 1 }}>
                      {step.details.map((detail, detailIndex) => (
                        <ListItem key={detailIndex} sx={{ py: 0.25 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {detail.type === 'success' && <CheckCircle fontSize="small" color="success" />}
                            {detail.type === 'error' && <Error fontSize="small" color="error" />}
                            {detail.type === 'warning' && <Warning fontSize="small" color="warning" />}
                            {detail.type === 'info' && <Info fontSize="small" color="info" />}
                          </ListItemIcon>
                          <ListItemText
                            primary={detail.message}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                  
                  {step.startTime && (
                    <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                      {step.startTime}
                      {step.endTime && ` - ${step.endTime}`}
                    </Typography>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* エラー詳細 */}
        {syncResult?.status === 'error' && syncResult.error && (
          <Box sx={{ mb: SPACING.lg }}>
            <Typography variant="h6" gutterBottom color="error">
              エラー詳細
            </Typography>
            <Alert severity="error">
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {syncResult.error}
              </Typography>
            </Alert>
          </Box>
        )}

        {/* 同期統計 */}
        {syncResult?.summary && (
          <Box>
            <Typography variant="h6" gutterBottom>
              同期結果
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                <Typography variant="h4" color="primary" align="center">
                  {syncResult.summary.totalProjects}
                </Typography>
                <Typography variant="body2" align="center" color="textSecondary">
                  総プロジェクト数
                </Typography>
              </Box>
              
              <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                <Typography variant="h4" color="success.main" align="center">
                  {syncResult.summary.successCount}
                </Typography>
                <Typography variant="body2" align="center" color="textSecondary">
                  成功
                </Typography>
              </Box>
              
              <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                <Typography variant="h4" color="error.main" align="center">
                  {syncResult.summary.errorCount}
                </Typography>
                <Typography variant="body2" align="center" color="textSecondary">
                  エラー
                </Typography>
              </Box>
              
              {syncResult.summary.newProposals !== undefined && (
                <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                  <Typography variant="h4" color="info.main" align="center">
                    {syncResult.summary.newProposals}
                  </Typography>
                  <Typography variant="body2" align="center" color="textSecondary">
                    新規提案
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* 同期前の注意事項 */}
        {!syncResult && (
          <Alert severity="info">
            <Typography variant="body2" gutterBottom>
              <strong>同期について:</strong>
            </Typography>
            <Typography variant="body2" component="div">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>POCシステムから最新のプロジェクトデータを取得します</li>
                <li>既存データと重複チェックを行い、新規データのみ追加されます</li>
                <li>同期中は他の処理を行わないでください</li>
                <li>大量データの場合、処理に時間がかかる場合があります</li>
              </ul>
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          閉じる
        </Button>
        
        {syncResult?.status === 'error' && project && onRetry && (
          <Button
            onClick={handleRetry}
            color="warning"
            startIcon={<Refresh />}
            disabled={isLoading}
          >
            再試行
          </Button>
        )}
        
        {isAllSync && onForceSync && (
          <Button
            onClick={onForceSync}
            color="secondary"
            startIcon={<Download />}
            disabled={isLoading}
          >
            全データ再取得
          </Button>
        )}
        
        {(!syncResult || syncResult.status === 'error') && (
          <Button
            onClick={handleSync}
            variant="contained"
            startIcon={<Sync />}
            disabled={isLoading}
          >
            {isLoading ? '同期中...' : '同期開始'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};