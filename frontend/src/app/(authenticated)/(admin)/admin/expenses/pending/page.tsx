'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Stack,
  Alert,
  Skeleton,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import { Grid as MuiGrid } from '@mui/material';
const Grid: any = MuiGrid;
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

import { useToast } from '@/components/common/Toast';
import { EXPENSE_STATUS, EXPENSE_STATUS_LABELS, EXPENSE_STATUS_COLORS } from '@/constants/expense';
import { adminExpenseApi } from '@/lib/api/adminExpense';

interface ExpenseApproval {
  approvalId: string;
  expenseId: string;
  title: string;
  amount: number;
  expenseDate: string;
  category: string;
  approvalType: 'manager' | 'executive';
  approvalOrder: number;
  requestedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  description: string;
  receiptUrls: string[];
  previousApproval?: {
    approverName: string;
    approvedAt: string;
    comment?: string;
  };
}

interface ApprovalDialogData {
  expense: ExpenseApproval;
  action: 'approve' | 'reject';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`approval-tabpanel-${index}`}
      aria-labelledby={`approval-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ExpensePendingPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [approvalDialog, setApprovalDialog] = useState<ApprovalDialogData | null>(null);
  const [comment, setComment] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [amountFilter, setAmountFilter] = useState('');

  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  // 承認待ち経費申請一覧を取得
  const {
    data: approvalData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'expenses', 'pending', {
      page: page + 1,
      limit: rowsPerPage,
      category: categoryFilter || undefined,
      amountRange: amountFilter || undefined,
      approvalType: tabValue === 0 ? 'manager' : 'executive',
    }],
    queryFn: ({ queryKey }) => {
      const [, , , params] = queryKey as [string, string, string, any];
      return adminExpenseApi.getPendingApprovals(params);
    },
    staleTime: 5 * 60 * 1000, // 5分
  });

  // 経費申請承認
  const approveMutation = useMutation({
    mutationFn: ({ expenseId, comment, version }: { expenseId: string; comment: string; version: number }) =>
      adminExpenseApi.approveExpense(expenseId, { comment, version }),
    onSuccess: () => {
      showSuccess('経費申請を承認しました');
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses', 'pending'] });
      setApprovalDialog(null);
      setComment('');
    },
    onError: (error: any) => {
      showError(error?.response?.data?.error || '承認に失敗しました');
    },
  });

  // 経費申請却下
  const rejectMutation = useMutation({
    mutationFn: ({ expenseId, comment, version }: { expenseId: string; comment: string; version: number }) =>
      adminExpenseApi.rejectExpense(expenseId, { comment, version }),
    onSuccess: () => {
      showSuccess('経費申請を却下しました');
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses', 'pending'] });
      setApprovalDialog(null);
      setComment('');
    },
    onError: (error: any) => {
      showError(error?.response?.data?.error || '却下に失敗しました');
    },
  });

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
  };

  const handleApprovalAction = (expense: ExpenseApproval, action: 'approve' | 'reject') => {
    setApprovalDialog({ expense, action });
    setComment('');
  };

  const handleApprovalSubmit = () => {
    if (!approvalDialog) return;

    const { expense, action } = approvalDialog;

    if (action === 'approve') {
      approveMutation.mutate({
        expenseId: expense.expenseId,
        comment,
        version: 1, // バージョン情報は詳細取得時に取得する必要があります
      });
    } else {
      if (!comment.trim()) {
        showError('却下理由を入力してください');
        return;
      }
      rejectMutation.mutate({
        expenseId: expense.expenseId,
        comment: comment,
        version: 1, // バージョン情報は詳細取得時に取得する必要があります
      });
    }
  };

  const handleViewReceipt = (receiptUrl: string) => {
    window.open(receiptUrl, '_blank');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy/MM/dd HH:mm', { locale: ja });
  };

  const isProcessing = approveMutation.isPending || rejectMutation.isPending;

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          承認待ち経費申請の取得に失敗しました。ページを再読み込みしてください。
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        経費申請承認
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        承認待ちの経費申請を確認・承認できます
      </Typography>

      <Card>
        <CardContent>
          {/* タブ */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="approval tabs">
              <Tab label="管理部承認" />
              <Tab label="役員承認" />
            </Tabs>
          </Box>

          {/* フィルター */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>カテゴリ</InputLabel>
                <Select
                  value={categoryFilter}
                  label="カテゴリ"
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="transport">旅費交通費</MenuItem>
                  <MenuItem value="entertainment">交際費</MenuItem>
                  <MenuItem value="supplies">備品</MenuItem>
                  <MenuItem value="books">書籍</MenuItem>
                  <MenuItem value="seminar">セミナー</MenuItem>
                  <MenuItem value="other">その他</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>金額範囲</InputLabel>
                <Select
                  value={amountFilter}
                  label="金額範囲"
                  onChange={(e) => {
                    setAmountFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="0-10000">1万円未満</MenuItem>
                  <MenuItem value="10000-50000">1万円〜5万円</MenuItem>
                  <MenuItem value="50000-100000">5万円〜10万円</MenuItem>
                  <MenuItem value="100000-">10万円以上</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TabPanel value={tabValue} index={0}>
            {/* 管理部承認テーブル */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>申請者</TableCell>
                    <TableCell>件名</TableCell>
                    <TableCell>カテゴリ</TableCell>
                    <TableCell align="right">金額</TableCell>
                    <TableCell>経費日</TableCell>
                    <TableCell>提出日</TableCell>
                    <TableCell>領収書</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    // ローディング中のスケルトン
                    Array.from({ length: rowsPerPage }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 8 }).map((_, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : approvalData?.items?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        承認待ちの経費申請はありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvalData?.items?.map((expense) => (
                      <TableRow key={expense.approvalId} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {expense.user.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {expense.user.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {expense.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={expense.category}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(expense.amount)}
                          </Typography>
                          {expense.amount >= 50000 && (
                            <Typography variant="caption" color="warning.main">
                              役員承認必要
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(expense.expenseDate), 'yyyy/MM/dd', { locale: ja })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(expense.requestedAt), 'yyyy/MM/dd', { locale: ja })}
                        </TableCell>
                        <TableCell>
                          {expense.receiptUrls?.length > 0 && (
                            <Button
                              size="small"
                              startIcon={<ReceiptIcon />}
                              onClick={() => handleViewReceipt(expense.receiptUrls[0])}
                            >
                              表示
                            </Button>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<ApproveIcon />}
                              onClick={() => handleApprovalAction(expense, 'approve')}
                              disabled={isProcessing}
                            >
                              承認
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<RejectIcon />}
                              onClick={() => handleApprovalAction(expense, 'reject')}
                              disabled={isProcessing}
                            >
                              却下
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {/* 役員承認テーブル */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>申請者</TableCell>
                    <TableCell>件名</TableCell>
                    <TableCell>カテゴリ</TableCell>
                    <TableCell align="right">金額</TableCell>
                    <TableCell>経費日</TableCell>
                    <TableCell>管理部承認日</TableCell>
                    <TableCell>領収書</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    // ローディング中のスケルトン
                    Array.from({ length: rowsPerPage }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 8 }).map((_, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : approvalData?.items?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        役員承認待ちの経費申請はありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvalData?.items?.map((expense) => (
                      <TableRow key={expense.approvalId} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {expense.user.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {expense.user.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {expense.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={expense.category}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium" color="warning.main">
                            {formatCurrency(expense.amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            高額申請
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {format(new Date(expense.expenseDate), 'yyyy/MM/dd', { locale: ja })}
                        </TableCell>
                        <TableCell>
                          {expense.previousApproval ? 
                            format(new Date(expense.previousApproval.approvedAt), 'yyyy/MM/dd', { locale: ja }) :
                            '-'
                          }
                        </TableCell>
                        <TableCell>
                          {expense.receiptUrls?.length > 0 && (
                            <Button
                              size="small"
                              startIcon={<ReceiptIcon />}
                              onClick={() => handleViewReceipt(expense.receiptUrls[0])}
                            >
                              表示
                            </Button>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<ApproveIcon />}
                              onClick={() => handleApprovalAction(expense, 'approve')}
                              disabled={isProcessing}
                            >
                              承認
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<RejectIcon />}
                              onClick={() => handleApprovalAction(expense, 'reject')}
                              disabled={isProcessing}
                            >
                              却下
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* ページネーション */}
          <TablePagination
            rowsPerPageOptions={[10, 20, 50]}
            component="div"
            count={approvalData?.total || 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            labelRowsPerPage="表示件数"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} / ${count !== -1 ? count : `${to}以上`}`
            }
          />
        </CardContent>
      </Card>

      {/* 承認・却下ダイアログ */}
      <Dialog
        open={!!approvalDialog}
        onClose={() => setApprovalDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {approvalDialog?.action === 'approve' ? '経費申請の承認' : '経費申請の却下'}
        </DialogTitle>
        <DialogContent>
          {approvalDialog && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {approvalDialog.expense.title}
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    申請者
                  </Typography>
                  <Typography variant="body1">
                    {approvalDialog.expense.user.name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    金額
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrency(approvalDialog.expense.amount)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    カテゴリ
                  </Typography>
                  <Typography variant="body1">
                    {approvalDialog.expense.category}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    経費日
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(approvalDialog.expense.expenseDate), 'yyyy年MM月dd日', { locale: ja })}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    使用理由
                  </Typography>
                  <Typography variant="body1">
                    {approvalDialog.expense.description}
                  </Typography>
                </Grid>
              </Grid>

              <TextField
                fullWidth
                multiline
                rows={3}
                label={approvalDialog.action === 'approve' ? 'コメント（任意）' : '却下理由（必須）'}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  approvalDialog.action === 'approve'
                    ? '承認時のコメントがあれば入力してください'
                    : '却下する理由を具体的に入力してください'
                }
                required={approvalDialog.action === 'reject'}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setApprovalDialog(null)}
            disabled={isProcessing}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleApprovalSubmit}
            variant="contained"
            color={approvalDialog?.action === 'approve' ? 'success' : 'error'}
            disabled={isProcessing || (approvalDialog?.action === 'reject' && !comment.trim())}
          >
            {approvalDialog?.action === 'approve' ? '承認する' : '却下する'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
