'use client';

import React from 'react';
import { Box, Card, CardContent, Typography, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, Chip, Button, Divider, Skeleton, Alert } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Assignment as AssignmentIcon,
  AccessTime as AccessTimeIcon,
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowForwardIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { StatusCard } from '@/components/common/cards';
import { UnsubmittedAlert } from '@/components/features/notification';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/admin/useDashboardQuery';
import { deepMergeWithDefaults } from '@/utils/deepMerge';
import { FONT_SIZE } from '@/constants/typography';
import { useDashboardStats } from '@/hooks/admin/useWeeklyReportSummary';
import StatsSummaryCard from '@/components/admin/dashboard/StatsSummaryCard';
import WeeklyReportChart from '@/components/admin/dashboard/WeeklyReportChart';
import PeriodSelector from '@/components/admin/dashboard/PeriodSelector';
// import LowMoodAlert from '@/components/admin/dashboard/LowMoodAlert'; // Mood機能削除により無効化

export default function AdminDashboard() {
  const router = useRouter();
  const { data: dashboardData, loading, error, refresh } = useDashboard();
  const { stats, loading: statsLoading, error: statsError, refresh: refreshStats, selectedPeriod, setSelectedPeriod } = useDashboardStats();
  
  // デフォルト値を設定（より深いレベルでの防御的プログラミング）
  const defaultData = {
    pending_approvals: {
      weekly_reports: 0,
      attendance_requests: 0,
      leave_requests: 0
    },
    follow_up_needed: {
      engineers: 0,
      critical: 0
    },
    recent_updates: [],
    engineer_status: {
      total: 0,
      active: 0,
      on_leave: 0,
      inactive: 0
    },
    weekly_report_summary: {
      total_engineers: 0,
      submitted: 0,
      pending: 0,
      not_submitted: 0
    },
    alerts: [],
    statistics: {
      active_engineers: 0,
      utilization_rate: 0
    }
  };

  // データが存在しない、または不完全な場合にデフォルト値を使用
  const safeData = deepMergeWithDefaults(dashboardData, defaultData);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <PageContainer title="管理者ダッシュボード" maxWidth="xl">
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
        <Box sx={{ mt: 4 }}>
          <Skeleton variant="rectangular" height={400} />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="管理者ダッシュボード" maxWidth="xl">
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
      title="管理者ダッシュボード"
      maxWidth="xl"
      action={
        <IconButton onClick={refresh} color="primary">
          <RefreshIcon />
        </IconButton>
      }
    >
      {/* 未提出者アラート */}
      <UnsubmittedAlert />
      
      {/* 低ムードユーザーアラート - Mood機能削除により無効化 */}
      {/* {stats?.current?.moodStats?.lowMoodUsers && (
        <LowMoodAlert 
          lowMoodUsers={stats.current.moodStats.lowMoodUsers} 
          onUserClick={(userId) => {
            if (userId === 'all') {
              router.push('/admin/engineers/follow-up');
            } else {
              router.push(`/admin/engineers/${userId}`);
            }
          }}
        />
      )} */}
      
      {/* 期間選択 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PeriodSelector 
          selectedPeriod={selectedPeriod} 
          onPeriodChange={setSelectedPeriod}
        />
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => { refresh(); refreshStats(); }}
          startIcon={<RefreshIcon />}
        >
          更新
        </Button>
      </Box>

      {/* 週報統計カード */}
      {stats?.current && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsSummaryCard
              title="提出率"
              value={stats.current?.submissionStats?.submissionRate || 0}
              unit="%"
              icon={<AssignmentIcon />}
              color="success"
              trend={stats.hasComparison && stats.current?.submissionStats?.submissionRate !== undefined ? {
                trend: stats.current.submissionStats.submissionRate >= (stats.previous?.submissionStats?.submissionRate || 0) ? 'up' : 'down',
                change: stats.current.submissionStats.submissionRate - (stats.previous?.submissionStats?.submissionRate || 0),
                changeRate: ((stats.current.submissionStats.submissionRate - (stats.previous?.submissionStats?.submissionRate || 0)) / (stats.previous?.submissionStats?.submissionRate || 1)) * 100
              } : undefined}
              onClick={() => router.push('/admin/engineers/weekly-reports')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsSummaryCard
              title="平均稼働時間"
              value={stats.current?.workHourStats?.averageWorkHours || 0}
              unit="時間"
              icon={<AccessTimeIcon />}
              color="info"
              trend={stats.hasComparison && stats.current?.workHourStats?.averageWorkHours !== undefined ? {
                trend: stats.current.workHourStats.averageWorkHours >= (stats.previous?.workHourStats?.averageWorkHours || 0) ? 'up' : 'down',
                change: stats.current.workHourStats.averageWorkHours - (stats.previous?.workHourStats?.averageWorkHours || 0),
                changeRate: ((stats.current.workHourStats.averageWorkHours - (stats.previous?.workHourStats?.averageWorkHours || 0)) / (stats.previous?.workHourStats?.averageWorkHours || 1)) * 100
              } : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsSummaryCard
              title="対象エンジニア"
              value={stats.current?.totalUsers || 0}
              unit="名"
              icon={<PeopleIcon />}
              color="primary"
              trend={stats.hasComparison && stats.current?.totalUsers !== undefined ? {
                trend: stats.current.totalUsers >= (stats.previous?.totalUsers || 0) ? 'up' : 'down',
                change: stats.current.totalUsers - (stats.previous?.totalUsers || 0),
                changeRate: ((stats.current.totalUsers - (stats.previous?.totalUsers || 0)) / (stats.previous?.totalUsers || 1)) * 100
              } : undefined}
            />
          </Grid>
        </Grid>
      )}

      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatusCard
            title="承認待ち週報"
            value={safeData.pending_approvals.weekly_reports}
            icon={<AssignmentIcon />}
            color="warning"
            onClick={() => router.push('/admin/engineers/weekly-reports?status=pending')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatusCard
            title="承認待ち勤怠"
            value={safeData.pending_approvals.attendance_requests}
            icon={<AccessTimeIcon />}
            color="info"
            onClick={() => router.push('/admin/engineers/attendance')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatusCard
            title="要フォロー"
            value={safeData.alerts?.filter(a => a.type === 'follow_up').length || 0}
            icon={<WarningIcon />}
            color="warning"
            onClick={() => router.push('/admin/engineers/follow-up')}
          />
        </Grid>
      </Grid>

      {/* アラートと週報統計チャート */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 週報統計チャート */}
        {stats?.current && (
          <Grid size={{ xs: 12, lg: 8 }}>
            <WeeklyReportChart
              submissionStats={stats.current?.submissionStats || {
                submittedCount: 0,
                draftCount: 0,
                overdueCount: 0,
                submissionRate: 0,
                onTimeRate: 0
              }}
              departmentStats={stats.current?.departmentStats || []}
            />
          </Grid>
        )}

        {/* アラート */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  要対応アラート
                </Typography>
                <Button 
                  size="small" 
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => router.push('/admin/engineers/follow-up')}
                >
                  すべて見る
                </Button>
              </Box>
              <List disablePadding>
                {(safeData.alerts || []).map((alert, index) => (
                  <React.Fragment key={alert.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={alert.title}
                        secondary={alert.message}
                      />
                      <ListItemSecondaryAction>
                        <Chip 
                          label={
                            alert.severity === 'critical' ? '高' : 
                            alert.severity === 'warning' ? '中' : '低'
                          }
                          size="small"
                          color={getSeverityColor(alert.severity) as any}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < (safeData.alerts?.length || 0) - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
}