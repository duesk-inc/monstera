'use client';

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as FlatIcon,
} from '@mui/icons-material';
import { useExpenseSummaryUtils } from '@/hooks/useExpenseSummary';

interface MonthlyData {
  month: number;
  monthName: string;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  usageRate: number;
}

interface ExpenseMonthlyChartProps {
  year: number;
  monthlyData: MonthlyData[];
  yearlyLimit: number;
  monthlyLimit: number;
  isLoading?: boolean;
}

/**
 * 経費申請の月別推移を表示するチャートコンポーネント
 */
export default function ExpenseMonthlyChart({
  year,
  monthlyData,
  yearlyLimit,
  monthlyLimit,
  isLoading = false,
}: ExpenseMonthlyChartProps) {
  const { formatCurrency, formatUsageRate, getUsageColor } = useExpenseSummaryUtils();

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} />
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {Array.from({ length: 12 }).map((_, index) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
                <Skeleton variant="rectangular" height={120} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  // 前月比較の計算
  const calculateTrend = (currentMonth: number, data: MonthlyData[]) => {
    if (currentMonth <= 1) return 'flat';
    
    const current = data.find(d => d.month === currentMonth)?.totalAmount || 0;
    const previous = data.find(d => d.month === currentMonth - 1)?.totalAmount || 0;
    
    if (current > previous * 1.1) return 'up';
    if (current < previous * 0.9) return 'down';
    return 'flat';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon fontSize="small" color="error" />;
      case 'down':
        return <TrendingDownIcon fontSize="small" color="success" />;
      default:
        return <FlatIcon fontSize="small" color="action" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'error';
      case 'down':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {year}年 月別推移
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          年間上限: {formatCurrency(yearlyLimit)} / 月間上限: {formatCurrency(monthlyLimit)}
        </Typography>

        <Grid container spacing={2}>
          {monthlyData.map((data) => {
            const usageColor = getUsageColor(data.usageRate);
            const trend = calculateTrend(data.month, monthlyData);
            const isOverLimit = data.totalAmount > monthlyLimit;
            
            return (
              <Grid item xs={6} sm={4} md={3} lg={2} key={data.month}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* 月とトレンド */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {data.monthName}
                      </Typography>
                      {data.month > 1 && getTrendIcon(trend)}
                    </Stack>

                    {/* 合計金額 */}
                    <Typography 
                      variant="h6" 
                      fontWeight="bold" 
                      color={isOverLimit ? 'error.main' : 'text.primary'}
                      sx={{ mb: 1 }}
                    >
                      {formatCurrency(data.totalAmount)}
                    </Typography>

                    {/* 使用率 */}
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        使用率
                      </Typography>
                      <Typography 
                        variant="body2" 
                        fontWeight="medium"
                        color={`${usageColor}.main`}
                      >
                        {formatUsageRate(data.usageRate)}
                      </Typography>
                    </Box>

                    {/* ステータスチップ */}
                    <Stack spacing={0.5}>
                      {isOverLimit && (
                        <Chip label="上限超過" color="error" size="small" />
                      )}
                      {!isOverLimit && data.usageRate >= 80 && (
                        <Chip label="上限接近" color="warning" size="small" />
                      )}
                      {trend !== 'flat' && (
                        <Chip 
                          label={trend === 'up' ? '増加傾向' : '減少傾向'} 
                          color={getTrendColor(trend) as any}
                          size="small" 
                        />
                      )}
                    </Stack>

                    {/* 内訳 */}
                    <Box sx={{ mt: 1 }}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="success.main">
                            承認
                          </Typography>
                          <Typography variant="caption" fontWeight="medium">
                            {formatCurrency(data.approvedAmount)}
                          </Typography>
                        </Stack>
                        
                        {data.pendingAmount > 0 && (
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="warning.main">
                              待機
                            </Typography>
                            <Typography variant="caption" fontWeight="medium">
                              {formatCurrency(data.pendingAmount)}
                            </Typography>
                          </Stack>
                        )}
                        
                        {data.rejectedAmount > 0 && (
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="error.main">
                              却下
                            </Typography>
                            <Typography variant="caption" fontWeight="medium">
                              {formatCurrency(data.rejectedAmount)}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* サマリー */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            {year}年間サマリー
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                総申請額
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {formatCurrency(monthlyData.reduce((sum, data) => sum + data.totalAmount, 0))}
              </Typography>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                承認総額
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="success.main">
                {formatCurrency(monthlyData.reduce((sum, data) => sum + data.approvedAmount, 0))}
              </Typography>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                年間使用率
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {formatUsageRate((monthlyData.reduce((sum, data) => sum + data.totalAmount, 0) / yearlyLimit) * 100)}
              </Typography>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                月平均
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {formatCurrency(monthlyData.reduce((sum, data) => sum + data.totalAmount, 0) / 12)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}