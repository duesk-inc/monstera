'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  TextField,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  AdminPanelSettings as AdminIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useExpenseApproverAdmin, useExpenseApproverForm } from '@/hooks/useExpenseApproverAdmin';
import { PageContainer, PageHeader, ContentCard } from '@/components/common';
import type { ExpenseApproverSetting } from '@/lib/api/expenseApproverSetting';

/**
 * 経費承認者設定管理画面
 */
export default function ExpenseApproversPage() {
  const {
    settings,
    settingsByType,
    activeSettings,
    histories,
    users,
    isLoading,
    isLoadingHistories,
    isLoadingUsers,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    createSetting,
    updateSetting,
    deleteSetting,
    refetch,
    refetchHistories,
    formatDateTime,
    getApprovalTypeLabel,
    getActionLabel,
  } = useExpenseApproverAdmin();

  const {
    formData,
    errors,
    updateFormData,
    resetForm,
    loadEditData,
    getSubmitData,
    isValid,
  } = useExpenseApproverForm();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingSetting, setEditingSetting] = useState<ExpenseApproverSetting | null>(null);
  const [showHistories, setShowHistories] = useState(false);

  // ダイアログを開く（新規作成）
  const handleOpenCreateDialog = () => {
    setEditingSetting(null);
    resetForm();
    setOpenDialog(true);
  };

  // ダイアログを開く（編集）
  const handleOpenEditDialog = (setting: ExpenseApproverSetting) => {
    setEditingSetting(setting);
    loadEditData(setting);
    setOpenDialog(true);
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSetting(null);
    resetForm();
  };

  // 設定の作成・更新
  const handleSubmit = () => {
    const submitData = getSubmitData();
    if (submitData) {
      if (editingSetting) {
        updateSetting(editingSetting.id, submitData);
      } else {
        createSetting(submitData);
      }
      handleCloseDialog();
    }
  };

  // 設定の削除
  const handleDelete = (setting: ExpenseApproverSetting) => {
    if (window.confirm(`${setting.approver?.name || 'この承認者'}の設定を削除しますか？`)) {
      deleteSetting(setting.id);
    }
  };

  // ユーザー名を取得
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown User';
  };

  // エラー表示
  if (error) {
    return (
      <PageContainer>
        <PageHeader title="経費承認者設定" />
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            再試行
          </Button>
        }>
          承認者設定の取得に失敗しました
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader 
        title="経費承認者設定" 
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            disabled={isLoading}
          >
            承認者を追加
          </Button>
        }
      />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* 現在の承認者設定 */}
        <ContentCard variant="elevated">
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            現在の承認者設定
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            経費申請の承認フローで使用される承認者を管理します
          </Typography>
          
          <Grid container spacing={3}>
            {/* 管理部承認者 */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      管理部承認者
                    </Typography>
                    <BusinessIcon color="primary" />
                  </Stack>
                  
                  {isLoading ? (
                    <Box>
                      {Array.from({ length: 2 }).map((_, index) => (
                        <Skeleton key={index} variant="rectangular" height={60} sx={{ mb: 1 }} />
                      ))}
                    </Box>
                  ) : settingsByType.manager?.length > 0 ? (
                    <Stack spacing={2}>
                      {settingsByType.manager
                        .sort((a, b) => a.priority - b.priority)
                        .map((setting) => (
                          <Card key={setting.id} variant="outlined" sx={{ p: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Stack direction="row" alignItems="center" spacing={2}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                  {setting.priority}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {setting.approver?.name || getUserName(setting.approverId)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {setting.approver?.email}
                                  </Typography>
                                </Box>
                              </Stack>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Chip 
                                  label={setting.isActive ? 'アクティブ' : '無効'} 
                                  color={setting.isActive ? 'success' : 'default'}
                                  size="small"
                                />
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEditDialog(setting)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDelete(setting)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Stack>
                          </Card>
                        ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">
                      設定されていません
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      resetForm();
                      updateFormData({ approvalType: 'manager' });
                      setOpenDialog(true);
                    }}
                    disabled={isLoading}
                  >
                    管理部承認者を追加
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* 役員承認者 */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      役員承認者
                    </Typography>
                    <AdminIcon color="secondary" />
                  </Stack>
                  
                  {isLoading ? (
                    <Box>
                      {Array.from({ length: 2 }).map((_, index) => (
                        <Skeleton key={index} variant="rectangular" height={60} sx={{ mb: 1 }} />
                      ))}
                    </Box>
                  ) : settingsByType.executive?.length > 0 ? (
                    <Stack spacing={2}>
                      {settingsByType.executive
                        .sort((a, b) => a.priority - b.priority)
                        .map((setting) => (
                          <Card key={setting.id} variant="outlined" sx={{ p: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Stack direction="row" alignItems="center" spacing={2}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                                  {setting.priority}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {setting.approver?.name || getUserName(setting.approverId)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {setting.approver?.email}
                                  </Typography>
                                </Box>
                              </Stack>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Chip 
                                  label={setting.isActive ? 'アクティブ' : '無効'} 
                                  color={setting.isActive ? 'success' : 'default'}
                                  size="small"
                                />
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEditDialog(setting)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDelete(setting)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Stack>
                          </Card>
                        ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">
                      設定されていません
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      resetForm();
                      updateFormData({ approvalType: 'executive' });
                      setOpenDialog(true);
                    }}
                    disabled={isLoading}
                  >
                    役員承認者を追加
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </ContentCard>

        {/* 設定履歴 */}
        <ContentCard variant="elevated">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <HistoryIcon color="action" />
              <Typography variant="h6" fontWeight="bold">
                設定履歴
              </Typography>
            </Stack>
            <Button
              variant={showHistories ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setShowHistories(!showHistories)}
            >
              {showHistories ? '履歴を非表示' : '履歴を表示'}
            </Button>
          </Stack>
          
          {showHistories && (
            <>
              {isLoadingHistories ? (
                <Box>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} variant="rectangular" height={60} sx={{ mb: 1 }} />
                  ))}
                </Box>
              ) : histories.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>操作</TableCell>
                        <TableCell>承認タイプ</TableCell>
                        <TableCell>承認者</TableCell>
                        <TableCell>変更者</TableCell>
                        <TableCell>変更日時</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {histories
                        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
                        .map((history) => (
                          <TableRow key={history.id}>
                            <TableCell>
                              <Chip
                                label={getActionLabel(history.action)}
                                color={
                                  history.action === 'create' ? 'success' :
                                  history.action === 'update' ? 'info' : 'error'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={getApprovalTypeLabel(history.approvalType)}
                                color={history.approvalType === 'manager' ? 'primary' : 'secondary'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {getUserName(history.approverId)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {history.changer?.name || getUserName(history.changedBy)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDateTime(history.changedAt)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  設定履歴がありません
                </Alert>
              )}
            </>
          )}
        </ContentCard>
      </Box>

      {/* 設定作成・編集ダイアログ */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              承認者設定{editingSetting ? 'の編集' : 'の追加'}
            </Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              経費申請の承認フローで使用される承認者を設定します。優先順位の順番で承認が行われます。
            </Alert>
            
            <FormControl fullWidth>
              <InputLabel>承認タイプ</InputLabel>
              <Select
                value={formData.approvalType}
                label="承認タイプ"
                onChange={(e) => updateFormData({ approvalType: e.target.value as 'manager' | 'executive' })}
              >
                <MenuItem value="manager">管理部承認</MenuItem>
                <MenuItem value="executive">役員承認</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth error={!!errors.approverId}>
              <InputLabel>承認者</InputLabel>
              <Select
                value={formData.approverId}
                label="承認者"
                onChange={(e) => updateFormData({ approverId: e.target.value })}
                disabled={isLoadingUsers}
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{ width: 24, height: 24 }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2">{user.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
              {errors.approverId && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {errors.approverId}
                </Typography>
              )}
            </FormControl>
            
            <TextField
              label="優先順位"
              type="number"
              fullWidth
              value={formData.priority}
              onChange={(e) => updateFormData({ priority: parseInt(e.target.value) || 1 })}
              error={!!errors.priority}
              helperText={errors.priority || '1-99の範囲で入力してください（小さい順に承認されます）'}
              inputProps={{ min: 1, max: 99 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => updateFormData({ isActive: e.target.checked })}
                />
              }
              label="アクティブ"
            />
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!isValid || isCreating || isUpdating}
          >
            {isCreating || isUpdating ? '処理中...' : editingSetting ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}