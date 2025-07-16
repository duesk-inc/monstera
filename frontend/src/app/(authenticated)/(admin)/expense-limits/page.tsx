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
  TextField,
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
} from '@mui/material';
import {
  Settings as SettingsIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useExpenseLimitAdmin, useExpenseLimitForm } from '@/hooks/useExpenseLimitAdmin';
import { PageContainer, PageHeader, ContentCard } from '@/components/common';
import type { ExpenseLimit } from '@/lib/api/expenseLimit';

/**
 * 経費申請上限管理画面
 */
export default function ExpenseLimitsPage() {
  const {
    limits,
    currentLimits,
    isLoading,
    error,
    isUpdating,
    updateLimit,
    refetch,
    formatCurrency,
    formatDateTime,
  } = useExpenseLimitAdmin();

  const {
    formData,
    errors,
    updateFormData,
    resetForm,
    loadCurrentLimit,
    getSubmitData,
    isValid,
  } = useExpenseLimitForm();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingType, setEditingType] = useState<'monthly' | 'yearly' | null>(null);

  // ダイアログを開く
  const handleOpenDialog = (limitType: 'monthly' | 'yearly') => {
    setEditingType(limitType);
    updateFormData({ limitType });
    
    // 現在の設定を読み込み
    const currentLimit = limitType === 'monthly' ? currentLimits.monthly : currentLimits.yearly;
    loadCurrentLimit(currentLimit);
    
    setOpenDialog(true);
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingType(null);
    resetForm();
  };

  // 上限更新
  const handleSubmit = () => {
    const submitData = getSubmitData();
    if (submitData) {
      updateLimit(submitData);
      handleCloseDialog();
    }
  };

  // エラー表示
  if (error) {
    return (
      <PageContainer>
        <PageHeader title="経費申請上限管理" />
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            再試行
          </Button>
        }>
          上限設定の取得に失敗しました
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="経費申請上限管理" />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* 現在の上限設定 */}
        <ContentCard variant="elevated">
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            現在の上限設定
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            現在有効な経費申請の上限金額を表示しています
          </Typography>
          
          <Grid container spacing={3}>
            {/* 月次上限 */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      月次上限
                    </Typography>
                    <TrendingUpIcon color="primary" />
                  </Stack>
                  
                  {isLoading ? (
                    <Skeleton variant="text" width="60%" height={32} />
                  ) : currentLimits.monthly ? (
                    <>
                      <Typography variant="h4" fontWeight="bold" color="primary.main" sx={{ mb: 1 }}>
                        {formatCurrency(currentLimits.monthly.amount)}
                      </Typography>
                      <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            有効開始: {formatDateTime(currentLimits.monthly.effectiveFrom)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            更新者: {currentLimits.monthly.createdBy}
                          </Typography>
                        </Stack>
                      </Stack>
                    </>
                  ) : (
                    <Typography color="text.secondary">
                      設定されていません
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<SettingsIcon />}
                    onClick={() => handleOpenDialog('monthly')}
                    disabled={isUpdating}
                  >
                    設定変更
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* 年次上限 */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      年次上限
                    </Typography>
                    <TrendingUpIcon color="secondary" />
                  </Stack>
                  
                  {isLoading ? (
                    <Skeleton variant="text" width="60%" height={32} />
                  ) : currentLimits.yearly ? (
                    <>
                      <Typography variant="h4" fontWeight="bold" color="secondary.main" sx={{ mb: 1 }}>
                        {formatCurrency(currentLimits.yearly.amount)}
                      </Typography>
                      <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            有効開始: {formatDateTime(currentLimits.yearly.effectiveFrom)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            更新者: {currentLimits.yearly.createdBy}
                          </Typography>
                        </Stack>
                      </Stack>
                    </>
                  ) : (
                    <Typography color="text.secondary">
                      設定されていません
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<SettingsIcon />}
                    onClick={() => handleOpenDialog('yearly')}
                    disabled={isUpdating}
                  >
                    設定変更
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </ContentCard>

        {/* 設定履歴 */}
        <ContentCard variant="elevated">
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <HistoryIcon color="action" />
            <Typography variant="h6" fontWeight="bold">
              設定履歴
            </Typography>
          </Stack>
          
          {isLoading ? (
            <Box>
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} variant="rectangular" height={60} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : limits.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>種別</TableCell>
                    <TableCell align="right">上限金額</TableCell>
                    <TableCell>有効開始日時</TableCell>
                    <TableCell>更新日時</TableCell>
                    <TableCell>更新者</TableCell>
                    <TableCell>ステータス</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {limits
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .map((limit) => {
                      const isActive = 
                        (limit.limitType === 'monthly' && currentLimits.monthly?.id === limit.id) ||
                        (limit.limitType === 'yearly' && currentLimits.yearly?.id === limit.id);
                      
                      return (
                        <TableRow key={limit.id}>
                          <TableCell>
                            <Chip
                              label={limit.limitType === 'monthly' ? '月次' : '年次'}
                              color={limit.limitType === 'monthly' ? 'primary' : 'secondary'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                            {formatCurrency(limit.amount)}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(limit.effectiveFrom)}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(limit.updatedAt)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {limit.createdBy}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {isActive ? (
                              <Chip label="有効" color="success" size="small" />
                            ) : new Date(limit.effectiveFrom) > new Date() ? (
                              <Chip label="予約済み" color="info" size="small" />
                            ) : (
                              <Chip label="過去" color="default" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              設定履歴がありません
            </Alert>
          )}
        </ContentCard>
      </Box>

      {/* 設定変更ダイアログ */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {editingType === 'monthly' ? '月次' : '年次'}上限の変更
            </Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              新しい上限は指定した有効開始日時から適用されます。過去の設定は履歴として保持されます。
            </Alert>
            
            <FormControl fullWidth>
              <InputLabel>種別</InputLabel>
              <Select
                value={formData.limitType}
                label="種別"
                disabled
              >
                <MenuItem value="monthly">月次上限</MenuItem>
                <MenuItem value="yearly">年次上限</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="上限金額（円）"
              type="number"
              fullWidth
              value={formData.amount}
              onChange={(e) => updateFormData({ amount: e.target.value })}
              error={!!errors.amount}
              helperText={errors.amount || '1円以上1億円以下で入力してください'}
              inputProps={{ min: 1, max: 100000000 }}
            />
            
            <TextField
              label="有効開始日時"
              type="datetime-local"
              fullWidth
              value={formData.effectiveFrom}
              onChange={(e) => updateFormData({ effectiveFrom: e.target.value })}
              error={!!errors.effectiveFrom}
              helperText={errors.effectiveFrom || '現在時刻以降を選択してください'}
              InputLabelProps={{ shrink: true }}
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
            disabled={!isValid || isUpdating}
          >
            {isUpdating ? '更新中...' : '設定を更新'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}