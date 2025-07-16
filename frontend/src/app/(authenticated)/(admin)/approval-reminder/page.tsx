'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Send as SendIcon,
  AccessTime as AccessTimeIcon,
  NotificationsActive as NotificationsActiveIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useToast } from '@/components/common/Toast';
import { formatDate } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatUtils';

interface ApprovalReminderConfig {
  enabled: boolean;
  reminder_threshold: number; // 秒単位
  reminder_interval: number;  // 秒単位
  max_reminders: number;
  schedule: string;
}

interface ApprovalReminderStatus {
  is_running: boolean;
  last_executed: string | null;
  next_scheduled: string | null;
  pending_count: number;
  reminders_count: number;
}

interface GetApprovalReminderConfigResponse {
  config: ApprovalReminderConfig;
  status: ApprovalReminderStatus;
}

interface PendingExpenseWithApprover {
  expense_id: string;
  expense_title: string;
  expense_amount: number;
  submitter_name: string;
  submitted_at: string;
  days_pending: number;
  approver_id: string;
  approver_name: string;
  approver_email: string;
  reminders_sent: number;
  last_reminder_at: string | null;
}

interface ApprovalReminderReport {
  generated_at: string;
  total_pending: number;
  reminders_needed: number;
  reminders_sent: number;
  errors: number;
  pending_expenses: PendingExpenseWithApprover[];
}

interface ExecuteApprovalReminderResponse {
  success: boolean;
  report: ApprovalReminderReport;
  message: string;
}

export default function ApprovalReminderPage() {
  const { showSuccess, showError } = useToast();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [executionReport, setExecutionReport] = useState<ApprovalReminderReport | null>(null);

  const [editConfig, setEditConfig] = useState<{
    enabled: boolean;
    reminder_threshold_days: number;
    reminder_interval_days: number;
    max_reminders: number;
    schedule: string;
  }>({
    enabled: false,
    reminder_threshold_days: 3,
    reminder_interval_days: 1,
    max_reminders: 3,
    schedule: '0 9 * * *',
  });

  // 設定を取得
  const { data: configData, refetch: refetchConfig } = useQuery<GetApprovalReminderConfigResponse>({
    queryKey: ['approval-reminder-config'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/admin/approval-reminder/config');
      return response.data;
    },
  });

  // 設定更新
  const updateConfigMutation = useMutation({
    mutationFn: async (data: Partial<typeof editConfig>) => {
      const response = await apiClient.put('/api/v1/admin/approval-reminder/config', data);
      return response.data;
    },
    onSuccess: () => {
      showSuccess('承認催促設定を更新しました');
      setConfigDialogOpen(false);
      refetchConfig();
    },
    onError: () => {
      showError('設定の更新に失敗しました');
    },
  });

  // スケジューラー開始
  const startSchedulerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/v1/admin/approval-reminder/scheduler/start');
      return response.data;
    },
    onSuccess: () => {
      showSuccess('スケジューラーを開始しました');
      refetchConfig();
    },
    onError: () => {
      showError('スケジューラーの開始に失敗しました');
    },
  });

  // スケジューラー停止
  const stopSchedulerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/v1/admin/approval-reminder/scheduler/stop');
      return response.data;
    },
    onSuccess: () => {
      showSuccess('スケジューラーを停止しました');
      refetchConfig();
    },
    onError: () => {
      showError('スケジューラーの停止に失敗しました');
    },
  });

  // 手動実行
  const executeReminderMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const response = await apiClient.post<ExecuteApprovalReminderResponse>(
        '/api/v1/admin/approval-reminder/execute',
        { dry_run: dryRun }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setExecutionReport(data.report);
      showSuccess(data.message);
    },
    onError: () => {
      showError('承認催促の実行に失敗しました');
    },
  });

  // 設定データが読み込まれたら編集用フォームを初期化
  useEffect(() => {
    if (configData?.config) {
      setEditConfig({
        enabled: configData.config.enabled,
        reminder_threshold_days: Math.floor(configData.config.reminder_threshold / (24 * 60 * 60)),
        reminder_interval_days: Math.floor(configData.config.reminder_interval / (24 * 60 * 60)),
        max_reminders: configData.config.max_reminders,
        schedule: configData.config.schedule,
      });
    }
  }, [configData]);

  const handleConfigSave = () => {
    updateConfigMutation.mutate(editConfig);
  };

  const handleExecute = () => {
    executeReminderMutation.mutate(dryRun);
  };

  const getStatusChip = (isRunning: boolean) => {
    return (
      <Chip
        label={isRunning ? '実行中' : '停止中'}
        color={isRunning ? 'success' : 'default'}
        size="small"
        icon={isRunning ? <PlayArrowIcon /> : <StopIcon />}
      />
    );
  };

  if (!configData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const { config, status } = configData;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        承認催促通知管理
      </Typography>

      <Grid container spacing={3}>
        {/* ステータスカード */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">システムステータス</Typography>
                <Box>
                  <Tooltip title="設定を更新">
                    <IconButton onClick={() => refetchConfig()} size="small">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="設定">
                    <IconButton onClick={() => setConfigDialogOpen(true)} size="small">
                      <SettingsIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    スケジューラー
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusChip(status.is_running)}
                    {status.is_running ? (
                      <IconButton
                        size="small"
                        onClick={() => stopSchedulerMutation.mutate()}
                        disabled={stopSchedulerMutation.isPending}
                      >
                        <StopIcon />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => startSchedulerMutation.mutate()}
                        disabled={startSchedulerMutation.isPending || !config.enabled}
                      >
                        <PlayArrowIcon />
                      </IconButton>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    機能の有効化
                  </Typography>
                  <Chip
                    label={config.enabled ? '有効' : '無効'}
                    color={config.enabled ? 'primary' : 'default'}
                    size="small"
                  />
                </Grid>

                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    最終実行
                  </Typography>
                  <Typography variant="body2">
                    {status.last_executed
                      ? formatDate(status.last_executed, 'YYYY/MM/DD HH:mm')
                      : '未実行'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    次回実行予定
                  </Typography>
                  <Typography variant="body2">
                    {status.next_scheduled
                      ? formatDate(status.next_scheduled, 'YYYY/MM/DD HH:mm')
                      : '予定なし'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    承認待ち件数
                  </Typography>
                  <Typography variant="h6">{status.pending_count}件</Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    送信済み催促数
                  </Typography>
                  <Typography variant="h6">{status.reminders_count}件</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 設定情報カード */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                現在の設定
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    催促開始日数
                  </Typography>
                  <Typography>
                    {Math.floor(config.reminder_threshold / (24 * 60 * 60))}日後
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    催促間隔
                  </Typography>
                  <Typography>
                    {Math.floor(config.reminder_interval / (24 * 60 * 60))}日ごと
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    最大催促回数
                  </Typography>
                  <Typography>{config.max_reminders}回</Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    実行スケジュール
                  </Typography>
                  <Typography variant="body2">{config.schedule}</Typography>
                </Grid>
              </Grid>

              <Box mt={3}>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={() => setExecuteDialogOpen(true)}
                  fullWidth
                >
                  手動で催促を実行
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 実行レポート */}
        {executionReport && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  実行レポート
                </Typography>

                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>
                    実行時刻: {formatDate(executionReport.generated_at, 'YYYY/MM/DD HH:mm:ss')}
                  </AlertTitle>
                  承認待ち: {executionReport.total_pending}件 / 
                  催促対象: {executionReport.reminders_needed}件 / 
                  送信成功: {executionReport.reminders_sent}件 / 
                  エラー: {executionReport.errors}件
                </Alert>

                {executionReport.pending_expenses.length > 0 && (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>申請タイトル</TableCell>
                          <TableCell>申請者</TableCell>
                          <TableCell align="right">金額</TableCell>
                          <TableCell>承認者</TableCell>
                          <TableCell align="center">承認待ち日数</TableCell>
                          <TableCell align="center">催促回数</TableCell>
                          <TableCell>最終催促日</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {executionReport.pending_expenses.map((expense) => (
                          <TableRow key={expense.expense_id}>
                            <TableCell>{expense.expense_title}</TableCell>
                            <TableCell>{expense.submitter_name}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(expense.expense_amount)}
                            </TableCell>
                            <TableCell>{expense.approver_name}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${expense.days_pending}日`}
                                size="small"
                                color={expense.days_pending > 7 ? 'error' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="center">{expense.reminders_sent}回</TableCell>
                            <TableCell>
                              {expense.last_reminder_at
                                ? formatDate(expense.last_reminder_at, 'MM/DD HH:mm')
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* 設定ダイアログ */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>承認催促設定</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={editConfig.enabled}
                  onChange={(e) => setEditConfig({ ...editConfig, enabled: e.target.checked })}
                />
              }
              label="承認催促機能を有効にする"
            />

            <TextField
              label="催促開始日数"
              type="number"
              value={editConfig.reminder_threshold_days}
              onChange={(e) =>
                setEditConfig({
                  ...editConfig,
                  reminder_threshold_days: parseInt(e.target.value) || 3,
                })
              }
              helperText="承認待ちになってから何日後に催促を開始するか"
              fullWidth
            />

            <TextField
              label="催促間隔（日）"
              type="number"
              value={editConfig.reminder_interval_days}
              onChange={(e) =>
                setEditConfig({
                  ...editConfig,
                  reminder_interval_days: parseInt(e.target.value) || 1,
                })
              }
              helperText="何日ごとに催促を送信するか"
              fullWidth
            />

            <TextField
              label="最大催促回数"
              type="number"
              value={editConfig.max_reminders}
              onChange={(e) =>
                setEditConfig({
                  ...editConfig,
                  max_reminders: parseInt(e.target.value) || 3,
                })
              }
              helperText="最大何回まで催促を送信するか"
              fullWidth
            />

            <TextField
              label="実行スケジュール（Cron形式）"
              value={editConfig.schedule}
              onChange={(e) => setEditConfig({ ...editConfig, schedule: e.target.value })}
              helperText="例: 0 9 * * * (毎日午前9時)"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleConfigSave}
            variant="contained"
            disabled={updateConfigMutation.isPending}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 手動実行ダイアログ */}
      <Dialog open={executeDialogOpen} onClose={() => setExecuteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>承認催促の手動実行</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>実行前の確認</AlertTitle>
              承認待ちの経費申請に対して催促通知を送信します。
            </Alert>

            <FormControlLabel
              control={
                <Switch
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
              }
              label="ドライラン（実際には送信しない）"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExecuteDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleExecute}
            variant="contained"
            color={dryRun ? 'primary' : 'warning'}
            disabled={executeReminderMutation.isPending}
            startIcon={<SendIcon />}
          >
            {dryRun ? 'テスト実行' : '実行'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}