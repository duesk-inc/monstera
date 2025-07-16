'use client';

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Assignment,
  Event,
  Schedule,
  TrendingUp,
  Warning,
  Notifications,
  Person,
  Business,
  Email,
  Sync
} from '@mui/icons-material';

import { SalesLayout } from '../layout/SalesLayout';
import { MetricCard } from './MetricCard';
import { SPACING } from '@/constants/dimensions';
import { SALES_UI } from '@/constants/sales';
import type { SalesDashboardData } from '@/types/sales';

interface SalesDashboardProps {
  data?: SalesDashboardData;
  isLoading?: boolean;
  onRefresh?: () => void;
}

/**
 * 営業ダッシュボードメインコンポーネント
 */
export const SalesDashboard: React.FC<SalesDashboardProps> = ({
  data,
  isLoading = false,
  onRefresh
}) => {
  const theme = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');

  // モックデータ（実際の実装では props.data を使用）
  const mockData: SalesDashboardData = data || {
    totalProposals: 45,
    activeProposals: 12,
    upcomingInterviews: 8,
    pendingExtensions: 3,
    todayDeadlines: 2,
    weeklyTrends: {
      proposals: 15,
      interviews: 8,
      acceptances: 3
    },
    statusDistribution: {
      '提案中': 12,
      '面談中': 8,
      '採用': 15,
      '不採用': 10
    },
    recentActivities: [
      {
        id: '1',
        type: 'proposal',
        description: '田中エンジニアの新規提案を作成しました',
        timestamp: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        type: 'interview',
        description: 'ABC株式会社との面談を予定しました',
        timestamp: '2024-01-15T09:15:00Z'
      },
      {
        id: '3',
        type: 'extension',
        description: '佐藤エンジニアの契約延長確認を完了しました',
        timestamp: '2024-01-14T16:45:00Z'
      }
    ]
  };

  const handleMetricClick = (type: string) => {
    // 詳細画面への遷移処理
    console.log(`Navigate to ${type} details`);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'proposal':
        return <Assignment />;
      case 'interview':
        return <Event />;
      case 'extension':
        return <Schedule />;
      default:
        return <Notifications />;
    }
  };

  return (
    <SalesLayout
      title="営業ダッシュボード"
      actions={
        <Box sx={{ display: 'flex', gap: SPACING.sm }}>
          <Button
            variant="outlined"
            onClick={onRefresh}
            disabled={isLoading}
          >
            更新
          </Button>
        </Box>
      }
    >
      {/* アラート表示 */}
      {mockData.todayDeadlines > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: SPACING.lg }}
          icon={<Warning />}
        >
          本日期限の提案が {mockData.todayDeadlines} 件あります。至急対応をお願いします。
        </Alert>
      )}

      {/* メトリックカード */}
      <Grid container spacing={SPACING.md} sx={{ mb: SPACING.lg }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="総提案数"
            value={mockData.totalProposals}
            unit="件"
            icon={<Assignment />}
            color={SALES_UI.colors.primary}
            trend={{
              value: 12,
              isPositive: true,
              period: '前月比'
            }}
            isLoading={isLoading}
            onClick={() => handleMetricClick('proposals')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="アクティブ提案"
            value={mockData.activeProposals}
            unit="件"
            icon={<TrendingUp />}
            color={SALES_UI.colors.success}
            isLoading={isLoading}
            onClick={() => handleMetricClick('active-proposals')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="今後の面談"
            value={mockData.upcomingInterviews}
            unit="件"
            icon={<Event />}
            color={SALES_UI.colors.info}
            isLoading={isLoading}
            onClick={() => handleMetricClick('interviews')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="延長確認待ち"
            value={mockData.pendingExtensions}
            unit="件"
            icon={<Schedule />}
            color={SALES_UI.colors.warning}
            isLoading={isLoading}
            onClick={() => handleMetricClick('extensions')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={SPACING.lg}>
        {/* ステータス分布 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                提案ステータス分布
              </Typography>
              <Box sx={{ mt: SPACING.md }}>
                {Object.entries(mockData.statusDistribution).map(([status, count]) => (
                  <Box 
                    key={status}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: SPACING.sm
                    }}
                  >
                    <Typography variant="body2">{status}</Typography>
                    <Chip 
                      label={`${count}件`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 最近の活動 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                最近の活動
              </Typography>
              <List sx={{ mt: SPACING.sm }}>
                {mockData.recentActivities.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                        {getActivityIcon(activity.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.description}
                        secondary={formatTimestamp(activity.timestamp)}
                        primaryTypographyProps={{
                          variant: 'body2'
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          color: 'textSecondary'
                        }}
                      />
                    </ListItem>
                    {index < mockData.recentActivities.length - 1 && (
                      <Divider component="li" />
                    )}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 今週のトレンド */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                今週のトレンド
              </Typography>
              <Grid container spacing={SPACING.lg} sx={{ mt: SPACING.sm }}>
                <Grid item xs={12} sm={4}>
                  <Paper 
                    sx={{ 
                      p: SPACING.md, 
                      textAlign: 'center',
                      backgroundColor: theme.palette.primary.light + '20'
                    }}
                  >
                    <Typography variant="h4" color="primary" gutterBottom>
                      {mockData.weeklyTrends.proposals}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      新規提案
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Paper 
                    sx={{ 
                      p: SPACING.md, 
                      textAlign: 'center',
                      backgroundColor: theme.palette.info.light + '20'
                    }}
                  >
                    <Typography variant="h4" color="info.main" gutterBottom>
                      {mockData.weeklyTrends.interviews}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      面談実施
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Paper 
                    sx={{ 
                      p: SPACING.md, 
                      textAlign: 'center',
                      backgroundColor: theme.palette.success.light + '20'
                    }}
                  >
                    <Typography variant="h4" color="success.main" gutterBottom>
                      {mockData.weeklyTrends.acceptances}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      採用決定
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </SalesLayout>
  );
};