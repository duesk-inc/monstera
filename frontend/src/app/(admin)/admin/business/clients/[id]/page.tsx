'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Card, CardContent, Typography, Button, Tabs, Tab, Chip, Divider, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Paper, Avatar } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Assignment as AssignmentIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { StatusChip, Breadcrumbs } from '@/components/common';
import { formatCurrency } from '@/utils/formatUtils';
import { formatDate } from '@/utils/dateUtils';
import { FONT_SIZE } from '@/constants/typography';

// ダミーデータ
const dummyClient = {
  id: 'c1',
  company_name: '株式会社ABC商事',
  company_name_kana: 'カブシキガイシャエービーシーショウジ',
  billing_type: 'monthly',
  payment_terms: 30,
  contact_person: '山田太郎',
  contact_email: 'yamada@abc-corp.co.jp',
  contact_phone: '03-1234-5678',
  address: '東京都千代田区丸の内1-1-1',
  notes: '毎月第3営業日に請求書送付',
  created_at: new Date('2023-01-15'),
  updated_at: new Date('2024-01-20'),
};

const dummyProjects = [
  {
    id: 'p1',
    project_name: 'ECサイト開発',
    project_code: 'ABC-001',
    status: 'active',
    start_date: new Date('2023-04-01'),
    end_date: new Date('2024-03-31'),
    monthly_rate: 800000,
    contract_type: 'ses',
    assigned_count: 2,
  },
  {
    id: 'p2',
    project_name: '基幹システム保守',
    project_code: 'ABC-002',
    status: 'active',
    start_date: new Date('2023-07-01'),
    end_date: null,
    monthly_rate: 600000,
    contract_type: 'ses',
    assigned_count: 1,
  },
];

const dummyInvoices = [
  {
    id: 'inv1',
    invoice_number: '2024-01-001',
    invoice_date: new Date('2024-01-15'),
    due_date: new Date('2024-02-15'),
    status: 'paid',
    total_amount: 1980000,
    payment_date: new Date('2024-02-10'),
  },
  {
    id: 'inv2',
    invoice_number: '2023-12-001',
    invoice_date: new Date('2023-12-15'),
    due_date: new Date('2024-01-15'),
    status: 'paid',
    total_amount: 1980000,
    payment_date: new Date('2024-01-12'),
  },
];

const dummySalesActivities = [
  {
    id: 'sa1',
    activity_type: 'meeting',
    activity_date: new Date('2024-01-10'),
    title: '契約更新打ち合わせ',
    user_name: '営業太郎',
  },
  {
    id: 'sa2',
    activity_type: 'email',
    activity_date: new Date('2024-01-05'),
    title: '請求書送付',
    user_name: '営業太郎',
  },
];

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
      id={`client-tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const billingTypeLabels: Record<string, string> = {
  monthly: '月額固定',
  hourly: '時間単価',
  fixed: '案件固定',
};

const projectStatusLabels: Record<string, string> = {
  active: '稼働中',
  completed: '完了',
  pending: '準備中',
};

const invoiceStatusColors: Record<string, any> = {
  draft: 'default',
  sent: 'warning',
  paid: 'success',
  overdue: 'error',
  cancelled: 'default',
};

const activityTypeIcons: Record<string, any> = {
  visit: PersonIcon,
  call: PhoneIcon,
  email: EmailIcon,
  meeting: PersonIcon,
};

export default function ClientDetail() {
  const params = useParams();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEdit = () => {
    // TODO: 編集画面への遷移
    console.log('Edit client');
  };

  return (
    <PageContainer 
      title={dummyClient.company_name}
      breadcrumbs={
        <Breadcrumbs 
          items={[
            { label: '管理者ダッシュボード', href: '/admin/dashboard' },
            { label: '取引先管理', href: '/admin/business/clients' },
            { label: dummyClient.company_name },
          ]}
        />
      }
    >
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/business/clients')}
        >
          一覧に戻る
        </Button>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={handleEdit}
        >
          編集
        </Button>
      </Box>

      {/* 基本情報カード */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                  <BusinessIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {dummyClient.company_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dummyClient.company_name_kana}
                  </Typography>
                </Box>
                <Chip
                  label={billingTypeLabels[dummyClient.billing_type]}
                  color="primary"
                  sx={{ ml: 'auto' }}
                />
              </Box>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                担当者情報
              </Typography>
              <List dense>
                <ListItem>
                  <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary={dummyClient.contact_person} />
                </ListItem>
                <ListItem>
                  <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary={dummyClient.contact_email} />
                </ListItem>
                <ListItem>
                  <PhoneIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary={dummyClient.contact_phone} />
                </ListItem>
                <ListItem>
                  <LocationIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary={dummyClient.address} />
                </ListItem>
              </List>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                契約情報
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="支払条件"
                    secondary={`${dummyClient.payment_terms}日`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="登録日"
                    secondary={formatDate(dummyClient.created_at)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="最終更新日"
                    secondary={formatDate(dummyClient.updated_at)}
                  />
                </ListItem>
              </List>
            </Grid>

            {dummyClient.notes && (
              <Grid size={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  備考
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">
                    {dummyClient.notes}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* タブ */}
      <Card>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="案件一覧" />
          <Tab label="請求履歴" />
          <Tab label="営業活動" />
        </Tabs>

        <CardContent>
          {/* 案件一覧 */}
          <TabPanel value={tabValue} index={0}>
            <List>
              {dummyProjects.map((project) => (
                <ListItem
                  key={project.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <AssignmentIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {project.project_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({project.project_code})
                        </Typography>
                        <StatusChip
                          status={project.status as any}
                          label={projectStatusLabels[project.status]}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          期間: {formatDate(project.start_date)} 〜 {project.end_date ? formatDate(project.end_date) : '継続中'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          月額: {formatCurrency(project.monthly_rate)} | アサイン: {project.assigned_count}名
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton>
                      <EditIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button variant="outlined" startIcon={<AssignmentIcon />}>
                新規案件を追加
              </Button>
            </Box>
          </TabPanel>

          {/* 請求履歴 */}
          <TabPanel value={tabValue} index={1}>
            <List>
              {dummyInvoices.map((invoice) => (
                <ListItem
                  key={invoice.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ReceiptIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          請求書番号: {invoice.invoice_number}
                        </Typography>
                        <Chip
                          label={invoice.status === 'paid' ? '支払済' : '未払い'}
                          size="small"
                          color={invoiceStatusColors[invoice.status]}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          請求日: {formatDate(invoice.invoice_date)} | 支払期限: {formatDate(invoice.due_date)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          金額: {formatCurrency(invoice.total_amount)}
                          {invoice.payment_date && ` | 支払日: ${formatDate(invoice.payment_date)}`}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button size="small">
                      詳細
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </TabPanel>

          {/* 営業活動 */}
          <TabPanel value={tabValue} index={2}>
            <List>
              {dummySalesActivities.map((activity) => {
                const Icon = activityTypeIcons[activity.activity_type] || TrendingUpIcon;
                return (
                  <ListItem
                    key={activity.id}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <Icon sx={{ mr: 2, color: 'text.secondary' }} />
                    <ListItemText
                      primary={activity.title}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            <CalendarIcon sx={{ fontSize: FONT_SIZE.SM, mr: 0.5, verticalAlign: 'middle' }} />
                            {formatDate(activity.activity_date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <PersonIcon sx={{ fontSize: FONT_SIZE.SM, mr: 0.5, verticalAlign: 'middle' }} />
                            {activity.user_name}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button variant="outlined" startIcon={<TrendingUpIcon />}>
                営業活動を記録
              </Button>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>
    </PageContainer>
  );
}