'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { User } from '@/types/auth';
// Cookie認証を使用するためgetAuthHeadersは不要

interface ExpenseApproverSetting {
  id: string;
  approvalType: 'manager' | 'executive';
  approverId: string;
  approver: User;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export default function ExpenseApproverSettings() {
  const [settings, setSettings] = useState<ExpenseApproverSetting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    approvalType: 'manager' as 'manager' | 'executive',
    approverId: '',
    isActive: true,
    priority: 1,
  });
  const { enqueueSnackbar } = useSnackbar();

  // 承認者設定を取得
  const fetchSettings = async () => {
    try {
      const response = await fetch('/admin/expense-approvers', {
        credentials: 'include', // Cookie認証を使用
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data.approvers || []);
    } catch (error) {
      console.error('Error fetching approver settings:', error);
      enqueueSnackbar('承認者設定の取得に失敗しました', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ユーザー一覧を取得
  const fetchUsers = async () => {
    try {
      const response = await fetch('/admin/users', {
        credentials: 'include', // Cookie認証を使用
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      enqueueSnackbar('ユーザー一覧の取得に失敗しました', { variant: 'error' });
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  // ダイアログを開く
  const handleOpenDialog = (setting?: ExpenseApproverSetting) => {
    if (setting) {
      setEditingId(setting.id);
      setFormData({
        approvalType: setting.approvalType,
        approverId: setting.approverId,
        isActive: setting.isActive,
        priority: setting.priority,
      });
    } else {
      setEditingId(null);
      setFormData({
        approvalType: 'manager',
        approverId: '',
        isActive: true,
        priority: 1,
      });
    }
    setDialogOpen(true);
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  // 保存処理
  const handleSave = async () => {
    try {
      const url = editingId
        ? `/admin/expense-approvers/${editingId}`
        : '/admin/expense-approvers';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include', // Cookie認証を使用
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save setting');
      }

      enqueueSnackbar(
        editingId ? '承認者設定を更新しました' : '承認者設定を追加しました',
        { variant: 'success' }
      );
      handleCloseDialog();
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving setting:', error);
      enqueueSnackbar(error.message || '保存に失敗しました', { variant: 'error' });
    }
  };

  // 削除処理
  const handleDelete = async (id: string) => {
    if (!window.confirm('この承認者設定を削除しますか？')) return;

    try {
      const response = await fetch(`/admin/expense-approvers/${id}`, {
        method: 'DELETE',
        credentials: 'include', // Cookie認証を使用
      });

      if (!response.ok) throw new Error('Failed to delete setting');

      enqueueSnackbar('承認者設定を削除しました', { variant: 'success' });
      fetchSettings();
    } catch (error) {
      console.error('Error deleting setting:', error);
      enqueueSnackbar('削除に失敗しました', { variant: 'error' });
    }
  };

  // 優先順位変更
  const handlePriorityChange = async (id: string, newPriority: number) => {
    try {
      const response = await fetch(`/admin/expense-approvers/${id}/priority`, {
        method: 'PATCH',
        credentials: 'include', // Cookie認証を使用
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (!response.ok) throw new Error('Failed to update priority');

      fetchSettings();
    } catch (error) {
      console.error('Error updating priority:', error);
      enqueueSnackbar('優先順位の更新に失敗しました', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  const getApprovalTypeLabel = (type: string) => {
    return type === 'manager' ? '管理部' : '役員';
  };

  const getApprovalTypeColor = (type: string) => {
    return type === 'manager' ? 'primary' : 'secondary';
  };

  return (
    <Box>
      {settings.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          承認者が設定されていません。経費申請を処理するには承認者の設定が必要です。
        </Alert>
      )}

      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          承認者を追加
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>承認タイプ</TableCell>
              <TableCell>承認者</TableCell>
              <TableCell>メールアドレス</TableCell>
              <TableCell align="center">優先順位</TableCell>
              <TableCell align="center">状態</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settings
              .sort((a, b) => {
                if (a.approvalType !== b.approvalType) {
                  return a.approvalType === 'manager' ? -1 : 1;
                }
                return a.priority - b.priority;
              })
              .map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell>
                    <Chip
                      label={getApprovalTypeLabel(setting.approvalType)}
                      color={getApprovalTypeColor(setting.approvalType)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{setting.approver?.name || '-'}</TableCell>
                  <TableCell>{setting.approver?.email || '-'}</TableCell>
                  <TableCell align="center">
                    <Box display="flex" alignItems="center" justifyContent="center">
                      <IconButton
                        size="small"
                        onClick={() => handlePriorityChange(setting.id, setting.priority - 1)}
                        disabled={setting.priority === 1}
                      >
                        <ArrowUpIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="body2" sx={{ mx: 1 }}>
                        {setting.priority}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handlePriorityChange(setting.id, setting.priority + 1)}
                      >
                        <ArrowDownIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={setting.isActive ? '有効' : '無効'}
                      color={setting.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(setting)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(setting.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 追加・編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? '承認者設定を編集' : '承認者を追加'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              select
              fullWidth
              label="承認タイプ"
              value={formData.approvalType}
              onChange={(e) =>
                setFormData({ ...formData, approvalType: e.target.value as 'manager' | 'executive' })
              }
              margin="normal"
            >
              <MenuItem value="manager">管理部承認</MenuItem>
              <MenuItem value="executive">役員承認</MenuItem>
            </TextField>

            <TextField
              select
              fullWidth
              label="承認者"
              value={formData.approverId}
              onChange={(e) => setFormData({ ...formData, approverId: e.target.value })}
              margin="normal"
            >
              <MenuItem value="">選択してください</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              type="number"
              label="優先順位"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 1 })
              }
              margin="normal"
              inputProps={{ min: 1 }}
              helperText="同じ承認タイプ内での優先順位（小さい数字が優先）"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="有効"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.approverId}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}