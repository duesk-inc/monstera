import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { AdminWeeklyReport } from '@/types/admin/weeklyReport';
import { formatDate } from '@/utils/dateUtils';
import apiClient from '@/lib/axios';

interface CommentDialogProps {
  open: boolean;
  onClose: () => void;
  report: AdminWeeklyReport | null;
  onSubmit: () => void;
}

export const CommentDialog: React.FC<CommentDialogProps> = ({
  open,
  onClose,
  report,
  onSubmit,
}) => {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (report) {
      setComment(report.manager_comment || '');
    }
    setError(null);
  }, [report]);

  const handleSubmit = async () => {
    if (!report) return;

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.post(
        `/api/v1/admin/engineers/weekly-reports/${report.id}/comment`,
        { comment }
      );
      
      onClose();
      onSubmit();
    } catch (err: any) {
      setError(err.response?.data?.message || 'コメントの送信に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        管理者コメント
        {report && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {report.user_name}さんの週報（{formatDate(report.start_date)} 〜 {formatDate(report.end_date)}）
          </Typography>
        )}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="週報に対するコメントを入力してください"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={submitting}
          sx={{ mt: 1 }}
        />
        
        {report?.commented_at && (
          <Alert severity="info" sx={{ mt: 2 }}>
            最終コメント日時: {formatDate(report.commented_at)}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!comment.trim() || submitting}
        >
          {submitting ? '送信中...' : 'コメントを送信'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};