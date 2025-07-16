'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  Skeleton,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Assignment as AssignmentIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { DataTable, DataTableColumn } from '@/components/common';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/utils/formatUtils';
import { formatDate } from '@/utils/dateUtils';
import { useClients, useClientForm } from '@/hooks/admin/useClientsQuery';
import { Client, ClientCreateRequest, ClientUpdateRequest } from '@/types/admin/client';
import { FONT_SIZE } from '@/constants/typography';

const billingTypeLabels: Record<string, string> = {
  monthly: '月額固定',
  hourly: '時間単価',
  fixed: '案件固定',
};

interface ClientFormData {
  company_name: string;
  company_name_kana: string;
  billing_type: 'monthly' | 'hourly' | 'fixed';
  payment_terms: number;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  notes: string;
}

const initialFormData: ClientFormData = {
  company_name: '',
  company_name_kana: '',
  billing_type: 'monthly',
  payment_terms: 30,
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  notes: '',
};

export default function ClientManagement() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { clients, total, loading, error, params, updateParams, refresh } = useClients({
    search: searchQuery,
  });
  const { createClient, updateClient, deleteClient, submitting } = useClientForm();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleAdd = () => {
    setEditingClient(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      company_name: client.company_name,
      company_name_kana: client.company_name_kana,
      billing_type: client.billing_type,
      payment_terms: client.payment_terms,
      contact_person: client.contact_person,
      contact_email: client.contact_email,
      contact_phone: client.contact_phone,
      address: client.address,
      notes: client.notes,
    });
    setDialogOpen(true);
    setAnchorEl(null);
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    
    try {
      await deleteClient(selectedClient.id);
      setDeleteDialogOpen(false);
      setAnchorEl(null);
      refresh();
    } catch (error) {
      // エラーはフック内で処理される
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        await createClient(formData as ClientCreateRequest);
      }
      setDialogOpen(false);
      refresh();
    } catch (error) {
      // エラーはフック内で処理される
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    setAnchorEl(event.currentTarget);
    setSelectedClient(client);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    updateParams({ search: value });
  };

  const columns: DataTableColumn<Client>[] = [
    {
      id: 'company_name',
      label: '会社名',
      minWidth: 300,
      format: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {row.company_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.company_name_kana}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'contact_person' as keyof Client,
      label: '担当者',
      minWidth: 250,
      format: (value, row) => (
        <Box>
          <Typography variant="body2">
            {row.contact_person}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EmailIcon sx={{ fontSize: FONT_SIZE.SM }} />
              {row.contact_email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'billing_type',
      label: '請求形態',
      minWidth: 120,
      format: (value, row) => (
        <Chip 
          label={billingTypeLabels[row.billing_type]}
          size="small"
          color={row.billing_type === 'monthly' ? 'primary' : 'default'}
        />
      ),
    },
    {
      id: 'payment_terms',
      label: '支払条件',
      minWidth: 100,
      format: (value, row) => (
        <Typography variant="body2">
          {row.payment_terms}日
        </Typography>
      ),
    },
    {
      id: 'created_at',
      label: '登録日',
      minWidth: 120,
      format: (value, row) => (
        <Typography variant="body2">
          {formatDate(row.created_at)}
        </Typography>
      ),
    },
    {
      id: 'id' as keyof Client,
      label: '',
      minWidth: 80,
      format: (value, row) => (
        <IconButton 
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleMenuClick(e, row);
          }}
        >
          <MoreVertIcon />
        </IconButton>
      ),
    },
  ];

  if (error) {
    return (
      <PageContainer title="取引先管理">
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
      title="取引先管理"
      action={
        <IconButton onClick={refresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      }
    >
      <Card>
        <CardContent>
          {/* ヘッダー部分 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
              <TextField
                size="small"
                placeholder="会社名、担当者名で検索"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                sx={{ width: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
            >
              取引先を追加
            </Button>
          </Box>

          {/* データテーブル */}
          <DataTable
            columns={columns}
            data={clients}
            keyField="id"
            loading={loading}
            emptyMessage="取引先が登録されていません"
            onRowClick={(row) => router.push(`/admin/business/clients/${row.id}`)}
          />
          
          {total > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              全{total}件中 {clients.length}件を表示
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 編集・追加ダイアログ */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingClient ? '取引先編集' : '取引先追加'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="会社名"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="会社名（カナ）"
                value={formData.company_name_kana}
                onChange={(e) => setFormData({ ...formData, company_name_kana: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="請求形態"
                value={formData.billing_type}
                onChange={(e) => setFormData({ ...formData, billing_type: e.target.value as any })}
                required
              >
                <MenuItem value="monthly">月額固定</MenuItem>
                <MenuItem value="hourly">時間単価</MenuItem>
                <MenuItem value="fixed">案件固定</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="支払条件（日）"
                type="number"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 0 })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="担当者名"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="担当者メール"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="電話番号"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="住所"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="備考"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.company_name || !formData.company_name_kana || submitting}
          >
            {submitting ? '処理中...' : (editingClient ? '更新' : '追加')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* アクションメニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedClient && handleEdit(selectedClient)}>
          <EditIcon sx={{ mr: 1, fontSize: FONT_SIZE.LG }} />
          編集
        </MenuItem>
        <MenuItem 
          onClick={() => {
            setDeleteDialogOpen(true);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
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
        <DialogTitle>取引先の削除</DialogTitle>
        <DialogContent>
          <Typography>
            「{selectedClient?.company_name}」を削除してよろしいですか？
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