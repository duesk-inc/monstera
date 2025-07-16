'use client';

import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, InputAdornment, Chip, Menu, MenuItem, Tooltip, Select, FormControl, InputLabel, Tab, Tabs, Alert, Skeleton } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { DataTable, DataTableColumn } from '@/components/common';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/utils/formatUtils';
import { formatDate } from '@/utils/dateUtils';
import { useInvoices, useInvoiceSummary, useInvoiceForm } from '@/hooks/admin/useInvoicesQuery';
import { Invoice } from '@/types/admin/invoice';
import { FONT_SIZE } from '@/constants/typography';

const invoiceStatusLabels: Record<string, string> = {
  draft: '下書き',
  sent: '送付済み',
  paid: '支払済み',
  overdue: '支払期限超過',
  cancelled: 'キャンセル',
};

const invoiceStatusColors: Record<string, any> = {
  draft: 'default',
  sent: 'warning',
  paid: 'success',
  overdue: 'error',
  cancelled: 'default',
};

const invoiceStatusIcons: Record<string, any> = {
  draft: EditIcon,
  sent: SendIcon,
  paid: CheckCircleIcon,
  overdue: ErrorIcon,
  cancelled: WarningIcon,
};

export default function InvoiceManagement() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  const { invoices, total, loading, error, updateParams, refresh } = useInvoices({
    status: statusFilter,
  });
  const { summary, loading: summaryLoading } = useInvoiceSummary();
  const { deleteInvoice, submitting } = useInvoiceForm();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 検索フィルタリング（クライアント側）
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // タブごとのフィルタリング
  const getTabInvoices = () => {
    switch (tabValue) {
      case 0: // すべて
        return filteredInvoices;
      case 1: // 下書き
        return filteredInvoices.filter(inv => inv.status === 'draft');
      case 2: // 未払い
        return filteredInvoices.filter(inv => ['sent', 'overdue'].includes(inv.status));
      case 3: // 支払済み
        return filteredInvoices.filter(inv => inv.status === 'paid');
      default:
        return filteredInvoices;
    }
  };

  const displayInvoices = getTabInvoices();

  const handleCreate = () => {
    router.push('/admin/business/invoices/create');
  };

  const handleEdit = (invoice: Invoice) => {
    router.push(`/admin/business/invoices/${invoice.id}/edit`);
    setAnchorEl(null);
  };

  const handleSend = async (invoice: Invoice) => {
    try {
      // ステータス更新APIを呼び出す（実装が必要）
      console.log('Send invoice:', invoice);
      refresh();
    } catch (error) {
      // エラーハンドリング
    }
    setAnchorEl(null);
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      // ステータス更新APIを呼び出す（実装が必要）
      console.log('Mark as paid:', invoice);
      refresh();
    } catch (error) {
      // エラーハンドリング
    }
    setAnchorEl(null);
  };

  const handleDelete = async () => {
    if (!selectedInvoice) return;
    
    try {
      await deleteInvoice(selectedInvoice.id);
      setDeleteDialogOpen(false);
      setAnchorEl(null);
      refresh();
    } catch (error) {
      // エラーはフック内で処理される
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, invoice: Invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleExportPDF = async (invoice: Invoice) => {
    try {
      // PDF出力APIを呼び出す（実装が必要）
      console.log('Export PDF:', invoice);
    } catch (error) {
      // エラーハンドリング
    }
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    updateParams({ status: value || undefined });
  };

  const columns: DataTableColumn<Invoice>[] = [
    {
      id: 'invoice_number',
      label: '請求書番号',
      minWidth: 150,
      format: (value, row) => (
        <Typography variant="body2" fontWeight="medium">
          {row.invoice_number}
        </Typography>
      ),
    },
    {
      id: 'client_name',
      label: '取引先',
      minWidth: 250,
      format: (value, row) => (
        <Typography variant="body2">
          {row.client_name}
        </Typography>
      ),
    },
    {
      id: 'invoice_date' as keyof Invoice,
      label: '請求日/支払期限',
      minWidth: 200,
      format: (value, row) => (
        <Box>
          <Typography variant="body2">
            {formatDate(row.invoice_date)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            期限: {formatDate(row.due_date)}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'total_amount',
      label: '金額',
      minWidth: 150,
      format: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {formatCurrency(row.total_amount)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            (税込)
          </Typography>
        </Box>
      ),
    },
    {
      id: 'status',
      label: 'ステータス',
      minWidth: 150,
      format: (value, row) => {
        const Icon = invoiceStatusIcons[row.status];
        return (
          <Chip
            icon={<Icon sx={{ fontSize: 18 }} />}
            label={invoiceStatusLabels[row.status]}
            size="small"
            color={invoiceStatusColors[row.status]}
          />
        );
      },
    },
    {
      id: 'payment_date',
      label: '支払日',
      minWidth: 120,
      format: (value, row) => (
        <Typography variant="body2" color={row.payment_date ? 'text.primary' : 'text.secondary'}>
          {row.payment_date ? formatDate(row.payment_date) : '-'}
        </Typography>
      ),
    },
    {
      id: 'id' as keyof Invoice,
      label: '',
      minWidth: 120,
      format: (value, row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="PDF出力">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                handleExportPDF(row);
              }}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              handleMenuClick(e, row);
            }}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (error) {
    return (
      <PageContainer title="請求管理">
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={refresh}>
            再読み込み
          </Button>
        }>
          データの読み込みに失敗しました。
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title="請求管理"
      action={
        <IconButton onClick={refresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      }
    >
      {/* サマリカード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    総請求額
                  </Typography>
                  {summaryLoading ? (
                    <Skeleton variant="text" width={100} height={32} />
                  ) : (
                    <Typography variant="h5">
                      {formatCurrency(summary?.total_amount || 0)}
                    </Typography>
                  )}
                </Box>
                <AttachMoneyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    支払済み
                  </Typography>
                  {summaryLoading ? (
                    <Skeleton variant="text" width={100} height={32} />
                  ) : (
                    <>
                      <Typography variant="h5" color="success.main">
                        {formatCurrency(summary?.paid_amount || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {summary?.paid_count || 0}件
                      </Typography>
                    </>
                  )}
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    未払い
                  </Typography>
                  {summaryLoading ? (
                    <Skeleton variant="text" width={100} height={32} />
                  ) : (
                    <>
                      <Typography variant="h5" color="warning.main">
                        {formatCurrency(summary?.unpaid_amount || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(summary?.sent_count || 0) + (summary?.overdue_count || 0)}件
                      </Typography>
                    </>
                  )}
                </Box>
                <WarningIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    期限超過
                  </Typography>
                  {summaryLoading ? (
                    <Skeleton variant="text" width={100} height={32} />
                  ) : (
                    <>
                      <Typography variant="h5" color="error.main">
                        {formatCurrency(summary?.overdue_amount || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {summary?.overdue_count || 0}件
                      </Typography>
                    </>
                  )}
                </Box>
                <ErrorIcon sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* アラート */}
      {summary && summary.overdue_count > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          支払期限を過ぎている請求書が{summary.overdue_count}件あります。早急に確認してください。
        </Alert>
      )}

      {/* メインカード */}
      <Card>
        <CardContent>
          {/* ヘッダー部分 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
              <TextField
                size="small"
                placeholder="請求書番号、取引先名で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={statusFilter}
                  label="ステータス"
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="draft">下書き</MenuItem>
                  <MenuItem value="sent">送付済み</MenuItem>
                  <MenuItem value="paid">支払済み</MenuItem>
                  <MenuItem value="overdue">期限超過</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
            >
              請求書を作成
            </Button>
          </Box>

          {/* タブ */}
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label={`すべて (${filteredInvoices.length})`} />
            <Tab label={`下書き (${summary?.draft_count || 0})`} />
            <Tab label={`未払い (${(summary?.sent_count || 0) + (summary?.overdue_count || 0)})`} />
            <Tab label={`支払済み (${summary?.paid_count || 0})`} />
          </Tabs>

          {/* データテーブル */}
          <DataTable
            columns={columns}
            data={displayInvoices}
            keyField="id"
            loading={loading}
            emptyMessage="請求書がありません"
            onRowClick={(row) => router.push(`/admin/business/invoices/${row.id}`)}
          />
          
          {total > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              全{total}件中 {displayInvoices.length}件を表示
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* アクションメニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedInvoice && handleEdit(selectedInvoice)}>
          <EditIcon sx={{ mr: 1, fontSize: FONT_SIZE.LG }} />
          編集
        </MenuItem>
        {selectedInvoice?.status === 'draft' && (
          <MenuItem onClick={() => selectedInvoice && handleSend(selectedInvoice)}>
            <SendIcon sx={{ mr: 1, fontSize: FONT_SIZE.LG }} />
            送付する
          </MenuItem>
        )}
        {selectedInvoice?.status === 'sent' && (
          <MenuItem onClick={() => selectedInvoice && handleMarkAsPaid(selectedInvoice)}>
            <CheckCircleIcon sx={{ mr: 1, fontSize: FONT_SIZE.LG }} />
            支払済みにする
          </MenuItem>
        )}
        <MenuItem 
          onClick={() => {
            setDeleteDialogOpen(true);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
          disabled={selectedInvoice?.status !== 'draft'}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: FONT_SIZE.LG }} />
          削除
        </MenuItem>
      </Menu>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>請求書の削除</DialogTitle>
        <DialogContent>
          <Typography>
            請求書「{selectedInvoice?.invoice_number}」を削除してよろしいですか？
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            ※ 下書き状態の請求書のみ削除できます
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}