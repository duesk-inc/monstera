import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { CommonPagination, useToast } from '@/components/common';
import { useAlertHistory } from '@/hooks/admin/useAlertHistory';
import { AlertHistory, AlertFilters, AlertType, AlertSeverity, AlertStatus } from '@/types/admin/alert';
import { PAGINATION } from '@/constants/pagination';
import { formatDateTime } from '@/utils/formatUtils';
import { usePermission, PermissionGate, Permission } from '@/hooks/common/usePermission';

interface AlertHistoryListProps {
  onEdit?: (alertHistory: AlertHistory) => void;
}

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  [AlertType.OVERWORK]: '長時間労働',
  [AlertType.SUDDEN_CHANGE]: '急激な労働時間変化',
  [AlertType.HOLIDAY_WORK]: '休日出勤',
  [AlertType.MONTHLY_OVERTIME]: '月間残業時間超過',
  [AlertType.LATE_NIGHT_WORK]: '深夜労働',
  [AlertType.IRREGULAR_WORK_HOURS]: '不規則な勤務時間',
  [AlertType.CONSECUTIVE_LONG_WORK]: '連続長時間労働',
  [AlertType.UNSUBMITTED]: '週報未提出',
};

const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  [AlertSeverity.LOW]: '低',
  [AlertSeverity.MEDIUM]: '中',
  [AlertSeverity.HIGH]: '高',
};

const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  [AlertStatus.UNHANDLED]: '未対応',
  [AlertStatus.HANDLING]: '対応中',
  [AlertStatus.RESOLVED]: '対応済み',
};

const SEVERITY_COLORS: Record<AlertSeverity, 'error' | 'warning' | 'info'> = {
  [AlertSeverity.HIGH]: 'error',
  [AlertSeverity.MEDIUM]: 'warning',
  [AlertSeverity.LOW]: 'info',
};

const STATUS_COLORS: Record<AlertStatus, 'error' | 'warning' | 'success'> = {
  [AlertStatus.UNHANDLED]: 'error',
  [AlertStatus.HANDLING]: 'warning',
  [AlertStatus.RESOLVED]: 'success',
};

export const AlertHistoryList: React.FC<AlertHistoryListProps> = ({ onEdit }) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AlertFilters>({});
  const [selectedAlert, setSelectedAlert] = useState<AlertHistory | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  const { showSuccess, showError } = useToast();
  const { hasPermission } = usePermission();
  const {
    alertHistories,
    total,
    isLoading,
    refetch,
    updateStatus,
    isUpdatingStatus,
  } = useAlertHistory(filters, page, PAGINATION.DEFAULT_SIZES.ALERT_HISTORY);
  
  // 権限チェック - アラート履歴を閲覧する権限がない場合
  if (!hasPermission(Permission.ALERT_HISTORY_VIEW)) {
    return (
      <Card>
        <CardContent>
          <Typography color="error" align="center">
            アラート履歴を閲覧する権限がありません
          </Typography>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    refetch();
  }, [page, filters, refetch]);

  const handleFilterChange = (field: keyof AlertFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined,
    }));
    setPage(1); // フィルター変更時は1ページ目に戻る
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handleShowDetail = (alertHistory: AlertHistory) => {
    setSelectedAlert(alertHistory);
    setShowDetailDialog(true);
  };

  const handleCloseDetail = () => {
    setSelectedAlert(null);
    setShowDetailDialog(false);
  };

  const handleStatusUpdate = async (alertId: string, status: AlertStatus, comment?: string) => {
    // 権限チェック
    if (!hasPermission(Permission.ALERT_HISTORY_MANAGE)) {
      showError('アラートのステータスを更新する権限がありません');
      return;
    }
    
    try {
      await updateStatus({ id: alertId, status, comment });
      showSuccess('アラートのステータスを更新しました');
      setShowDetailDialog(false);
      refetch();
    } catch (error) {
      showError('ステータス更新に失敗しました');
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <Box>
      {/* フィルター部分 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="ステータス"
                >
                  <MenuItem value="">すべて</MenuItem>
                  {Object.entries(ALERT_STATUS_LABELS).map(([status, label]) => (
                    <MenuItem key={status} value={status}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>重要度</InputLabel>
                <Select
                  value={filters.severity || ''}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  label="重要度"
                >
                  <MenuItem value="">すべて</MenuItem>
                  {Object.entries(ALERT_SEVERITY_LABELS).map(([severity, label]) => (
                    <MenuItem key={severity} value={severity}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>アラートタイプ</InputLabel>
                <Select
                  value={filters.alertType || ''}
                  onChange={(e) => handleFilterChange('alertType', e.target.value)}
                  label="アラートタイプ"
                >
                  <MenuItem value="">すべて</MenuItem>
                  {Object.entries(ALERT_TYPE_LABELS).map(([type, label]) => (
                    <MenuItem key={type} value={type}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="フィルターをクリア">
                  <IconButton 
                    onClick={handleClearFilters}
                    disabled={!hasActiveFilters}
                    size="small"
                  >
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="再読み込み">
                  <IconButton onClick={() => refetch()} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                label="開始日"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                label="終了日"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* テーブル部分 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              アラート履歴一覧
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {total}件中 {Math.min((page - 1) * PAGINATION.DEFAULT_SIZES.ALERT_HISTORY + 1, total)}～
              {Math.min(page * PAGINATION.DEFAULT_SIZES.ALERT_HISTORY, total)}件を表示
            </Typography>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>発生日時</TableCell>
                  <TableCell>ユーザー</TableCell>
                  <TableCell>アラートタイプ</TableCell>
                  <TableCell>重要度</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell>対象期間</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      読み込み中...
                    </TableCell>
                  </TableRow>
                ) : alertHistories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      アラート履歴が見つかりません
                    </TableCell>
                  </TableRow>
                ) : (
                  alertHistories.map((alert) => (
                    <TableRow key={alert.id} hover>
                      <TableCell>
                        {formatDateTime(alert.createdAt)}
                      </TableCell>
                      <TableCell>
                        {alert.user?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ALERT_SEVERITY_LABELS[alert.severity]}
                          color={SEVERITY_COLORS[alert.severity]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ALERT_STATUS_LABELS[alert.status]}
                          color={STATUS_COLORS[alert.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {alert.weeklyReport ? (
                          `${formatDateTime(alert.weeklyReport.startDate)} ～ ${formatDateTime(alert.weeklyReport.endDate)}`
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="詳細表示">
                            <IconButton
                              size="small"
                              onClick={() => handleShowDetail(alert)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <PermissionGate permission={Permission.ALERT_HISTORY_MANAGE}>
                            {onEdit && (
                              <Tooltip title="編集">
                                <IconButton
                                  size="small"
                                  onClick={() => onEdit(alert)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </PermissionGate>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* ページネーション */}
          {total > PAGINATION.DEFAULT_SIZES.ALERT_HISTORY && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <CommonPagination
                page={page}
                count={Math.ceil(total / PAGINATION.DEFAULT_SIZES.ALERT_HISTORY)}
                onPageChange={setPage}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 詳細ダイアログ */}
      <Dialog
        open={showDetailDialog}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          アラート詳細
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    発生日時
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {formatDateTime(selectedAlert.createdAt)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    ユーザー
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {selectedAlert.user?.name || 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    アラートタイプ
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {ALERT_TYPE_LABELS[selectedAlert.alertType] || selectedAlert.alertType}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    重要度
                  </Typography>
                  <Chip
                    label={ALERT_SEVERITY_LABELS[selectedAlert.severity]}
                    color={SEVERITY_COLORS[selectedAlert.severity]}
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    ステータス
                  </Typography>
                  <Chip
                    label={ALERT_STATUS_LABELS[selectedAlert.status]}
                    color={STATUS_COLORS[selectedAlert.status]}
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    対象期間
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {selectedAlert.weeklyReport ? (
                      `${formatDateTime(selectedAlert.weeklyReport.startDate)} ～ ${formatDateTime(selectedAlert.weeklyReport.endDate)}`
                    ) : (
                      'N/A'
                    )}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    検出値
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <pre style={{ margin: 0, fontSize: '12px' }}>
                      {JSON.stringify(selectedAlert.detectedValue, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    閾値
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <pre style={{ margin: 0, fontSize: '12px' }}>
                      {JSON.stringify(selectedAlert.thresholdValue, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
                
                {selectedAlert.handledBy && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        対応者
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        {selectedAlert.handler?.name || selectedAlert.handledBy}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        対応日時
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        {selectedAlert.handledAt ? formatDateTime(selectedAlert.handledAt) : 'N/A'}
                      </Typography>
                    </Grid>
                  </>
                )}
                
                {selectedAlert.resolutionComment && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      対応コメント
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body2">
                        {selectedAlert.resolutionComment}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <PermissionGate permission={Permission.ALERT_HISTORY_MANAGE}>
            {selectedAlert && selectedAlert.status !== AlertStatus.RESOLVED && (
              <>
                {selectedAlert.status === AlertStatus.UNHANDLED && (
                  <Button
                    variant="outlined"
                    onClick={() => handleStatusUpdate(selectedAlert.id, AlertStatus.HANDLING)}
                    disabled={isUpdatingStatus}
                  >
                    対応開始
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={() => handleStatusUpdate(selectedAlert.id, AlertStatus.RESOLVED, '管理画面から対応済みに変更')}
                  disabled={isUpdatingStatus}
                >
                  対応完了
                </Button>
              </>
            )}
          </PermissionGate>
          <Button onClick={handleCloseDetail}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};