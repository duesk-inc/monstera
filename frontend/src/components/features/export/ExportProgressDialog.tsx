import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import type { ExportJobStatusResponse, ExportJobStatus } from '@/types/export';

interface ExportProgressDialogProps {
  open: boolean;
  onClose: () => void;
  jobStatus: ExportJobStatusResponse | undefined;
  isPolling: boolean;
  onCancel?: () => void;
}

export const ExportProgressDialog: React.FC<ExportProgressDialogProps> = ({
  open,
  onClose,
  jobStatus,
  isPolling,
  onCancel,
}) => {
  const getStatusColor = (status: ExportJobStatus) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'default';
      case 'processing':
        return 'primary';
      case 'pending':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: ExportJobStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon />;
      case 'failed':
        return <ErrorIcon />;
      case 'cancelled':
        return <CancelIcon />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: ExportJobStatus) => {
    switch (status) {
      case 'pending':
        return '待機中';
      case 'processing':
        return '処理中';
      case 'completed':
        return '完了';
      case 'failed':
        return '失敗';
      case 'cancelled':
        return 'キャンセル';
      default:
        return status;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    if (jobStatus?.file_url) {
      window.open(jobStatus.file_url, '_blank');
    }
  };

  const canCancel = jobStatus?.status === 'pending' || jobStatus?.status === 'processing';
  const isCompleted = jobStatus?.status === 'completed';
  const isFailed = jobStatus?.status === 'failed';

  return (
    <Dialog
      open={open}
      onClose={isPolling ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={isPolling}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">エクスポート進捗</Typography>
          {!isPolling && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {jobStatus ? (
          <Box>
            {/* ステータス表示 */}
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Typography variant="body2" color="textSecondary">
                ステータス:
              </Typography>
              <Chip
                label={getStatusLabel(jobStatus.status)}
                color={getStatusColor(jobStatus.status)}
                size="small"
                icon={getStatusIcon(jobStatus.status)}
              />
            </Box>

            {/* 進捗バー */}
            {(jobStatus.status === 'processing' || jobStatus.status === 'pending') && (
              <Box mb={3}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">進捗</Typography>
                  <Typography variant="body2">
                    {jobStatus.progress}%
                    {jobStatus.total_records > 0 && (
                      <> ({jobStatus.processed_rows} / {jobStatus.total_records})</>
                    )}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={jobStatus.progress}
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
            )}

            {/* エラーメッセージ */}
            {isFailed && jobStatus.error_message && (
              <Box
                bgcolor="error.light"
                color="error.contrastText"
                p={2}
                borderRadius={1}
                mb={3}
              >
                <Typography variant="body2">{jobStatus.error_message}</Typography>
              </Box>
            )}

            {/* 完了情報 */}
            {isCompleted && jobStatus.file_name && (
              <Box bgcolor="grey.100" p={2} borderRadius={1}>
                <Typography variant="body2" gutterBottom>
                  <strong>ファイル名:</strong> {jobStatus.file_name}
                </Typography>
                {jobStatus.file_size && (
                  <Typography variant="body2" gutterBottom>
                    <strong>ファイルサイズ:</strong> {formatFileSize(jobStatus.file_size)}
                  </Typography>
                )}
                {jobStatus.expires_at && (
                  <Typography variant="body2" color="textSecondary">
                    <strong>有効期限:</strong>{' '}
                    {new Date(jobStatus.expires_at).toLocaleString('ja-JP')}
                  </Typography>
                )}
              </Box>
            )}

            {/* 処理時間 */}
            {jobStatus.started_at && (
              <Box mt={2}>
                <Typography variant="caption" color="textSecondary">
                  開始時刻: {new Date(jobStatus.started_at).toLocaleString('ja-JP')}
                </Typography>
                {jobStatus.completed_at && (
                  <Typography variant="caption" color="textSecondary" display="block">
                    完了時刻: {new Date(jobStatus.completed_at).toLocaleString('ja-JP')}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        ) : (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {canCancel && onCancel && (
          <Button onClick={onCancel} color="inherit">
            キャンセル
          </Button>
        )}
        {isCompleted && (
          <Button
            onClick={handleDownload}
            variant="contained"
            startIcon={<DownloadIcon />}
          >
            ダウンロード
          </Button>
        )}
        {!isPolling && (
          <Button onClick={onClose} variant={isCompleted ? 'outlined' : 'contained'}>
            閉じる
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};