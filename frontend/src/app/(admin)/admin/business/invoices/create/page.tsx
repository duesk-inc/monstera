'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Card, CardContent, Typography, Button, TextField, Divider, Autocomplete, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import Grid from '@mui/material/Grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { Breadcrumbs } from '@/components/common';
import { formatCurrency } from '@/utils/formatUtils';

// ダミーデータ
const dummyClients = [
  { id: 'c1', company_name: '株式会社ABC商事', payment_terms: 30 },
  { id: 'c2', company_name: 'テクノロジー株式会社', payment_terms: 45 },
  { id: 'c3', company_name: 'グローバル商事', payment_terms: 30 },
];

const dummyProjects = [
  { id: 'p1', project_name: 'ECサイト開発', client_id: 'c1' },
  { id: 'p2', project_name: '基幹システム保守', client_id: 'c1' },
  { id: 'p3', project_name: 'AI開発プロジェクト', client_id: 'c2' },
];

const dummyEngineers = [
  { id: 'u1', name: '山田太郎' },
  { id: 'u2', name: '鈴木花子' },
  { id: 'u3', name: '田中次郎' },
];

interface InvoiceDetail {
  id: string;
  project_id: string | null;
  user_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export default function CreateInvoice() {
  const router = useRouter();
  const today = new Date();
  const defaultDueDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const [formData, setFormData] = useState({
    client_id: '',
    invoice_number: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-001`,
    invoice_date: today,
    due_date: defaultDueDate,
    notes: '',
  });

  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [details, setDetails] = useState<InvoiceDetail[]>([
    {
      id: '1',
      project_id: null,
      user_id: null,
      description: '',
      quantity: 1,
      unit_price: 0,
      amount: 0,
    },
  ]);

  const handleClientChange = (value: any) => {
    setSelectedClient(value);
    if (value) {
      setFormData({
        ...formData,
        client_id: value.id,
        due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + value.payment_terms),
      });
    }
  };

  const handleAddDetail = () => {
    setDetails([
      ...details,
      {
        id: String(details.length + 1),
        project_id: null,
        user_id: null,
        description: '',
        quantity: 1,
        unit_price: 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveDetail = (id: string) => {
    setDetails(details.filter(detail => detail.id !== id));
  };

  const handleDetailChange = (id: string, field: keyof InvoiceDetail, value: any) => {
    setDetails(details.map(detail => {
      if (detail.id === id) {
        const updated = { ...detail, [field]: value };
        
        // 金額を自動計算
        if (field === 'quantity' || field === 'unit_price') {
          updated.amount = updated.quantity * updated.unit_price;
        }
        
        return updated;
      }
      return detail;
    }));
  };

  const calculateSubtotal = () => {
    return details.reduce((sum, detail) => sum + detail.amount, 0);
  };

  const calculateTax = () => {
    return Math.floor(calculateSubtotal() * 0.1);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSaveAsDraft = () => {
    // TODO: API呼び出し
    console.log('Save as draft:', {
      ...formData,
      details,
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      total_amount: calculateTotal(),
      status: 'draft',
    });
    router.push('/admin/business/invoices');
  };

  const handleSaveAndSend = () => {
    // TODO: API呼び出し
    console.log('Save and send:', {
      ...formData,
      details,
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      total_amount: calculateTotal(),
      status: 'sent',
    });
    router.push('/admin/business/invoices');
  };

  const isValid = () => {
    return (
      formData.client_id &&
      formData.invoice_number &&
      formData.invoice_date &&
      formData.due_date &&
      details.length > 0 &&
      details.every(detail => detail.description && detail.quantity > 0 && detail.unit_price > 0)
    );
  };

  return (
    <PageContainer 
      title="請求書作成"
      breadcrumbs={
        <Breadcrumbs 
          items={[
            { label: '管理者ダッシュボード', href: '/admin/dashboard' },
            { label: '請求管理', href: '/admin/business/invoices' },
            { label: '請求書作成' },
          ]}
        />
      }
    >
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/admin/business/invoices')}
          >
            一覧に戻る
          </Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSaveAsDraft}
              disabled={!isValid()}
            >
              下書き保存
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSaveAndSend}
              disabled={!isValid()}
            >
              保存して送付
            </Button>
          </Box>
        </Box>

        {/* 基本情報 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              基本情報
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Autocomplete
                  value={selectedClient}
                  onChange={(event, newValue) => handleClientChange(newValue)}
                  options={dummyClients}
                  getOptionLabel={(option) => option.company_name}
                  renderInput={(params) => (
                    <TextField {...params} label="取引先" required />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="請求書番号"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <DatePicker
                  label="請求日"
                  value={formData.invoice_date}
                  onChange={(newValue) => setFormData({ ...formData, invoice_date: newValue || new Date() })}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <DatePicker
                  label="支払期限"
                  value={formData.due_date}
                  onChange={(newValue) => setFormData({ ...formData, due_date: newValue || new Date() })}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 明細 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                明細
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddDetail}
              >
                明細を追加
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="25%">案件</TableCell>
                    <TableCell width="20%">担当者</TableCell>
                    <TableCell width="25%">説明</TableCell>
                    <TableCell width="10%" align="right">数量</TableCell>
                    <TableCell width="15%" align="right">単価</TableCell>
                    <TableCell width="15%" align="right">金額</TableCell>
                    <TableCell width="5%"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {details.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell>
                        <Autocomplete
                          size="small"
                          value={dummyProjects.find(p => p.id === detail.project_id) || null}
                          onChange={(event, newValue) => 
                            handleDetailChange(detail.id, 'project_id', newValue?.id || null)
                          }
                          options={selectedClient ? dummyProjects.filter(p => p.client_id === selectedClient.id) : []}
                          getOptionLabel={(option) => option.project_name}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="案件を選択" />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Autocomplete
                          size="small"
                          value={dummyEngineers.find(e => e.id === detail.user_id) || null}
                          onChange={(event, newValue) => 
                            handleDetailChange(detail.id, 'user_id', newValue?.id || null)
                          }
                          options={dummyEngineers}
                          getOptionLabel={(option) => option.name}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="担当者を選択" />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={detail.description}
                          onChange={(e) => handleDetailChange(detail.id, 'description', e.target.value)}
                          placeholder="作業内容など"
                          required
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={detail.quantity}
                          onChange={(e) => handleDetailChange(detail.id, 'quantity', parseFloat(e.target.value) || 0)}
                          inputProps={{ min: 0, step: 0.1 }}
                          sx={{ width: 80 }}
                          required
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={detail.unit_price}
                          onChange={(e) => handleDetailChange(detail.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                          }}
                          inputProps={{ min: 0 }}
                          sx={{ width: 120 }}
                          required
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatCurrency(detail.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveDetail(detail.id)}
                          disabled={details.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* 合計 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="備考"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>小計:</Typography>
                    <Typography>{formatCurrency(calculateSubtotal())}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>消費税 (10%):</Typography>
                    <Typography>{formatCurrency(calculateTax())}</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">合計:</Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(calculateTotal())}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </LocalizationProvider>
    </PageContainer>
  );
}