'use client';

import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Tab, Tabs, Chip, Avatar, List, ListItem, ListItemText, ListItemAvatar, Paper, LinearProgress, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Skeleton, Alert } from '@mui/material';
import Grid from '@mui/material/Grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import {
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Timer as TimerIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { formatCurrency } from '@/utils/formatUtils';
import { formatDate } from '@/utils/dateUtils';
import { 
  useSalesPipeline, 
  useExtensionTargets, 
  useSalesActivities,
  useSalesActivityForm
} from '@/hooks/admin/useSalesQuery';
import { SalesPipeline, ExtensionTarget, SalesActivity } from '@/types/admin/sales';
import { FONT_SIZE } from '@/constants/typography';

const stageLabels: Record<string, string> = {
  lead: 'リード',
  qualification: '見込み確認',
  proposal: '提案',
  negotiation: '交渉',
  closed_won: '成約',
  closed_lost: '失注',
};

const stageColors: Record<string, string> = {
  lead: '#9E9E9E',
  qualification: '#2196F3',
  proposal: '#FF9800',
  negotiation: '#4CAF50',
  closed_won: '#4CAF50',
  closed_lost: '#F44336',
};

const activityTypeLabels: Record<string, string> = {
  visit: '訪問',
  call: '電話',
  email: 'メール',
  meeting: '会議',
  proposal: '提案',
  contract: '契約',
  other: 'その他',
};

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
      id={`sales-tabpanel-${index}`}
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

export default function SalesPipelinePage() {
  const { pipeline, loading: pipelineLoading, error: pipelineError, refresh: refreshPipeline } = useSalesPipeline();
  const { targets, loading: targetsLoading, error: targetsError, refresh: refreshTargets } = useExtensionTargets();
  const { activities, loading: activitiesLoading, error: activitiesError, refresh: refreshActivities } = useSalesActivities({
    status: 'planned',
    limit: 10,
  });
  const { createActivity, submitting } = useSalesActivityForm();

  const [tabValue, setTabValue] = useState(0);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<SalesPipeline | null>(null);
  const [activityForm, setActivityForm] = useState({
    activity_type: 'meeting' as any,
    activity_date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    next_action_date: '',
    next_action_title: '',
    status: 'planned' as any,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAddActivity = (project: SalesPipeline) => {
    setSelectedProject(project);
    setActivityDialogOpen(true);
  };

  const handleSaveActivity = async () => {
    if (!selectedProject) return;

    try {
      await createActivity({
        client_id: selectedProject.client_id,
        project_id: selectedProject.id,
        ...activityForm,
      });
      setActivityDialogOpen(false);
      setActivityForm({
        activity_type: 'meeting',
        activity_date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        next_action_date: '',
        next_action_title: '',
        status: 'planned',
      });
      refreshActivities();
    } catch (error) {
      // エラーはフック内で処理される
    }
  };

  const refresh = () => {
    refreshPipeline();
    refreshTargets();
    refreshActivities();
  };

  // パイプラインサマリの計算
  const pipelineSummary = {
    total_value: pipeline.reduce((sum, p) => sum + p.expected_value, 0),
    weighted_value: pipeline.reduce((sum, p) => sum + (p.expected_value * p.probability / 100), 0),
    total_deals: pipeline.length,
    stages: {
      lead: pipeline.filter(p => p.stage === 'lead').length,
      qualification: pipeline.filter(p => p.stage === 'qualification').length,
      proposal: pipeline.filter(p => p.stage === 'proposal').length,
      negotiation: pipeline.filter(p => p.stage === 'negotiation').length,
    },
  };

  if (pipelineError || targetsError || activitiesError) {
    return (
      <PageContainer title="営業パイプライン">
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
      title="営業パイプライン"
      action={
        <IconButton onClick={refresh} disabled={pipelineLoading}>
          <RefreshIcon />
        </IconButton>
      }
    >
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
        {/* サマリカード */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      パイプライン総額
                    </Typography>
                    {pipelineLoading ? (
                      <Skeleton variant="text" width={100} height={32} />
                    ) : (
                      <Typography variant="h5">
                        {formatCurrency(pipelineSummary.total_value)}
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
                      期待値（加重）
                    </Typography>
                    {pipelineLoading ? (
                      <Skeleton variant="text" width={100} height={32} />
                    ) : (
                      <Typography variant="h5" color="success.main">
                        {formatCurrency(pipelineSummary.weighted_value)}
                      </Typography>
                    )}
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main' }} />
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
                      商談数
                    </Typography>
                    {pipelineLoading ? (
                      <Skeleton variant="text" width={100} height={32} />
                    ) : (
                      <Typography variant="h5">
                        {pipelineSummary.total_deals}件
                      </Typography>
                    )}
                  </Box>
                  <AssignmentIcon sx={{ fontSize: 40, color: 'info.main' }} />
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
                      契約延長対象
                    </Typography>
                    {targetsLoading ? (
                      <Skeleton variant="text" width={100} height={32} />
                    ) : (
                      <Typography variant="h5" color="warning.main">
                        {targets.length}件
                      </Typography>
                    )}
                  </Box>
                  <TimerIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* メインコンテンツ */}
        <Card>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="パイプライン" />
            <Tab label="契約延長確認" />
            <Tab label="今後の活動" />
          </Tabs>

          <CardContent>
            {/* パイプライン */}
            <TabPanel value={tabValue} index={0}>
              {pipelineLoading ? (
                <Box>
                  <Skeleton variant="rectangular" height={100} sx={{ mb: 3 }} />
                  <Skeleton variant="rectangular" height={200} />
                </Box>
              ) : (
                <>
                  {/* ステージ別サマリ */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {Object.entries(stageLabels).slice(0, 4).map(([stage, label]) => {
                      const count = pipelineSummary.stages[stage as keyof typeof pipelineSummary.stages] || 0;
                      const percentage = pipelineSummary.total_deals > 0 ? (count / pipelineSummary.total_deals) * 100 : 0;
                      
                      return (
                        <Grid xs={12} sm={6} md={3} key={stage}>
                          <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="subtitle2" color="text.secondary">
                              {label}
                            </Typography>
                            <Typography variant="h4" sx={{ color: stageColors[stage] }}>
                              {count}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={percentage}
                              sx={{ 
                                mt: 1,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: stageColors[stage],
                                },
                              }}
                            />
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>

                  {/* 案件リスト */}
                  <List>
                    {pipeline.map((deal) => (
                      <ListItem
                        key={deal.id}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 2,
                          p: 2,
                        }}
                      >
                        <Grid container spacing={2} alignItems="center">
                          <Grid size={{ xs: 12, md: 5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: stageColors[deal.stage] }}>
                                <BusinessIcon />
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {deal.project_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {deal.client_name}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                  <Chip
                                    label={stageLabels[deal.stage]}
                                    size="small"
                                    sx={{ 
                                      backgroundColor: stageColors[deal.stage],
                                      color: 'white',
                                    }}
                                  />
                                  <Chip
                                    label={`${deal.probability}%`}
                                    size="small"
                                    variant="outlined"
                                  />
                                </Box>
                              </Box>
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                期待値
                              </Typography>
                              <Typography variant="h6" color="primary">
                                {formatCurrency(deal.expected_value)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                (加重: {formatCurrency(deal.expected_value * deal.probability / 100)})
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 12, md: 2 }}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                予定日
                              </Typography>
                              <Typography variant="body2">
                                {deal.expected_date ? formatDate(deal.expected_date) : '-'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                最終活動: {deal.last_activity ? formatDate(deal.last_activity) : '-'}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 12, md: 2 }}>
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                              <Tooltip title="活動を記録">
                                <IconButton onClick={() => handleAddActivity(deal)}>
                                  <AddIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="編集">
                                <IconButton>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Grid>
                          <Grid size={12}>
                            <Paper sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                次のアクション
                              </Typography>
                              <Typography variant="body2">
                                {deal.next_action || '未設定'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                担当: {deal.owner}
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </ListItem>
                    ))}
                    {pipeline.length === 0 && (
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        パイプラインに案件がありません
                      </Typography>
                    )}
                  </List>
                </>
              )}
            </TabPanel>

            {/* 契約延長確認 */}
            <TabPanel value={tabValue} index={1}>
              {targetsLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <List>
                  {targets.map((target) => (
                    <ListItem
                      key={target.project_id}
                      sx={{
                        border: 1,
                        borderColor: target.days_remaining < 30 ? 'error.main' : 'divider',
                        borderRadius: 1,
                        mb: 2,
                        p: 2,
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {target.project_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {target.client_name}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                              <Typography variant="body2">
                                <PersonIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                {target.assigned_users.join(', ')}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              契約終了日
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {target.end_date ? formatDate(target.end_date) : '-'}
                            </Typography>
                            <Chip
                              label={`残り${target.days_remaining}日`}
                              size="small"
                              color={target.days_remaining < 30 ? 'error' : 'warning'}
                            />
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              最終連絡
                            </Typography>
                            <Typography variant="body2">
                              {target.last_contact ? formatDate(target.last_contact) : '未連絡'}
                            </Typography>
                            {!target.last_contact && (
                              <Chip
                                icon={<WarningIcon />}
                                label="要連絡"
                                size="small"
                                color="error"
                              />
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                    </ListItem>
                  ))}
                  {targets.length === 0 && (
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      契約延長確認対象の案件がありません
                    </Typography>
                  )}
                </List>
              )}
            </TabPanel>

            {/* 今後の活動 */}
            <TabPanel value={tabValue} index={2}>
              {activitiesLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <List>
                  {activities.map((activity) => (
                    <ListItem
                      key={activity.id}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar>
                          {activity.activity_type === 'meeting' && <PersonIcon />}
                          {activity.activity_type === 'visit' && <BusinessIcon />}
                          {activity.activity_type === 'email' && <EmailIcon />}
                          {activity.activity_type === 'call' && <PhoneIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              {activity.title}
                            </Typography>
                            <Chip
                              label={activityTypeLabels[activity.activity_type]}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {activity.client_name} - {activity.project_name || '全般'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                <CalendarIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                {formatDate(activity.activity_date)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                {activity.user_name}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                  {activities.length === 0 && (
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      予定されている活動がありません
                    </Typography>
                  )}
                </List>
              )}
            </TabPanel>
          </CardContent>
        </Card>

        {/* 活動記録ダイアログ */}
        <Dialog
          open={activityDialogOpen}
          onClose={() => setActivityDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>営業活動を記録</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  案件: {selectedProject?.project_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  取引先: {selectedProject?.client_name}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>活動タイプ</InputLabel>
                  <Select
                    value={activityForm.activity_type}
                    label="活動タイプ"
                    onChange={(e) => setActivityForm({ ...activityForm, activity_type: e.target.value as any })}
                  >
                    {Object.entries(activityTypeLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="活動日"
                  value={activityForm.activity_date}
                  onChange={(e) => setActivityForm({ ...activityForm, activity_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="タイトル"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="詳細"
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActivityDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveActivity}
              disabled={!activityForm.title || submitting}
            >
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogActions>
        </Dialog>
      </LocalizationProvider>
    </PageContainer>
  );
}