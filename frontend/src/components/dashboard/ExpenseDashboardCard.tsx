'use client';

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  LinearProgress,
  Alert,
  Button,
  Skeleton,
  Stack,
  Chip,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useCurrentExpenseSummary, useExpenseSummaryUtils } from '@/hooks/useExpenseSummary';
import { ContentCard } from '@/components/common';

/**
 * ダッシュボード用経費申請集計カード
 */
export default function ExpenseDashboardCard() {
  const router = useRouter();
  const {
    data: summary,
    isLoading,
    error,
  } = useCurrentExpenseSummary();

  const {
    formatCurrency,
    formatUsageRate,
    getUsageColor,
    isOverLimit,
    isNearLimit,
    getBalanceStatus,
  } = useExpenseSummaryUtils();

  // 残額分析のヘルパー関数
  const getRemainingAnalysis = () => {
    if (!summary) return null;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // 今月の残日数を計算
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = now.getDate();
    const remainingDaysInMonth = daysInMonth - currentDay;
    
    // 今年の残日数を計算
    const endOfYear = new Date(currentYear, 11, 31);
    const remainingDaysInYear = Math.ceil((endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // 月次推奨使用ペース
    const monthlyRecommendedDaily = remainingDaysInMonth > 0 
      ? summary.monthly.remaining / remainingDaysInMonth 
      : 0;
    
    // 年次推奨使用ペース
    const yearlyRecommendedDaily = remainingDaysInYear > 0 
      ? summary.yearly.remaining / remainingDaysInYear 
      : 0;
    
    return {
      remainingDaysInMonth,
      remainingDaysInYear,
      monthlyRecommendedDaily,
      yearlyRecommendedDaily,
      monthlyBalanceStatus: getBalanceStatus(summary.monthly.remaining, summary.monthly.limit),
      yearlyBalanceStatus: getBalanceStatus(summary.yearly.remaining, summary.yearly.limit),
    };
  };

  const remainingAnalysis = getRemainingAnalysis();

  if (error) {
    return (
      <ContentCard>
        <Alert severity="error">
          経費申請データの取得に失敗しました
        </Alert>
      </ContentCard>
    );
  }

  if (isLoading) {
    return (
      <ContentCard>
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <WalletIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              経費申請状況
            </Typography>
          </Stack>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Skeleton variant="rectangular" height={120} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Skeleton variant="rectangular" height={120} />
          </Grid>
        </Grid>
      </ContentCard>
    );
  }

  if (!summary) {
    return (
      <ContentCard>
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <WalletIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              経費申請状況
            </Typography>
          </Stack>
        </Box>
        <Typography color="text.secondary">
          経費申請データがありません
        </Typography>
      </ContentCard>
    );
  }

  const monthlyUsageColor = getUsageColor(summary.monthly.usageRate);
  const yearlyUsageColor = getUsageColor(summary.yearly.usageRate);
  const isMonthlyOver = isOverLimit(summary.monthly.totalAmount, summary.monthly.limit);
  const isYearlyOver = isOverLimit(summary.yearly.totalAmount, summary.yearly.limit);
  const isMonthlyNear = isNearLimit(summary.monthly.totalAmount, summary.monthly.limit);
  const isYearlyNear = isNearLimit(summary.yearly.totalAmount, summary.yearly.limit);

  return (
    <ContentCard>
      {/* ヘッダー */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <WalletIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              経費申請状況
            </Typography>
          </Stack>
        </Stack>
      </Box>

      {/* 警告メッセージ */}
      {(isMonthlyOver || isYearlyOver) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {isMonthlyOver && isYearlyOver
            ? '月次・年次ともに上限を超過しています'
            : isMonthlyOver
            ? '月次上限を超過しています'
            : '年次上限を超過しています'}
        </Alert>
      )}

      {!isMonthlyOver && !isYearlyOver && (isMonthlyNear || isYearlyNear) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {isMonthlyNear && isYearlyNear
            ? '月次・年次ともに上限に近づいています'
            : isMonthlyNear
            ? '月次上限に近づいています'
            : '年次上限に近づいています'}
        </Alert>
      )}

      {/* 残額ハイライト */}
      {summary && remainingAnalysis && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            残額状況
          </Typography>
          <Grid container spacing={2}>
            {/* 月次残額 */}
            <Grid item xs={12} sm={6}>
              <Card 
                variant="outlined" 
                sx={{ 
                  borderColor: `${remainingAnalysis.monthlyBalanceStatus.color}.main`,
                  bgcolor: `${remainingAnalysis.monthlyBalanceStatus.color}.light`,
                  '&:hover': { bgcolor: `${remainingAnalysis.monthlyBalanceStatus.color}.100` }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <WalletIcon color={remainingAnalysis.monthlyBalanceStatus.color as any} />
                    <Typography variant="subtitle2" color="text.secondary">
                      今月の残額
                    </Typography>
                  </Stack>
                  
                  <Typography 
                    variant="h4" 
                    fontWeight="bold" 
                    color={`${remainingAnalysis.monthlyBalanceStatus.color}.main`}
                    sx={{ mb: 1 }}
                  >
                    {formatCurrency(summary.monthly.remaining)}
                  </Typography>
                  
                  <Chip 
                    label={remainingAnalysis.monthlyBalanceStatus.status}
                    color={remainingAnalysis.monthlyBalanceStatus.color as any}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  
                  {remainingAnalysis.remainingDaysInMonth > 0 && (
                    <Box>
                      <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          あと{remainingAnalysis.remainingDaysInMonth}日
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5}>
                        <SpeedIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          推奨日額: {formatCurrency(remainingAnalysis.monthlyRecommendedDaily)}
                        </Typography>
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* 年次残額 */}
            <Grid item xs={12} sm={6}>
              <Card 
                variant="outlined" 
                sx={{ 
                  borderColor: `${remainingAnalysis.yearlyBalanceStatus.color}.main`,
                  bgcolor: `${remainingAnalysis.yearlyBalanceStatus.color}.light`,
                  '&:hover': { bgcolor: `${remainingAnalysis.yearlyBalanceStatus.color}.100` }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <TrendingUpIcon color={remainingAnalysis.yearlyBalanceStatus.color as any} />
                    <Typography variant="subtitle2" color="text.secondary">
                      今年の残額
                    </Typography>
                  </Stack>
                  
                  <Typography 
                    variant="h4" 
                    fontWeight="bold" 
                    color={`${remainingAnalysis.yearlyBalanceStatus.color}.main`}
                    sx={{ mb: 1 }}
                  >
                    {formatCurrency(summary.yearly.remaining)}
                  </Typography>
                  
                  <Chip 
                    label={remainingAnalysis.yearlyBalanceStatus.status}
                    color={remainingAnalysis.yearlyBalanceStatus.color as any}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  
                  {remainingAnalysis.remainingDaysInYear > 0 && (
                    <Box>
                      <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          あと{remainingAnalysis.remainingDaysInYear}日
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5}>
                        <SpeedIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          推奨日額: {formatCurrency(remainingAnalysis.yearlyRecommendedDaily)}
                        </Typography>
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* 集計カード */}
      <Grid container spacing={2}>
        {/* 月次集計 */}
        <Grid item xs={12} sm={6}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  今月の申請額
                </Typography>
                {isMonthlyOver && (
                  <Chip icon={<WarningIcon />} label="超過" color="error" size="small" />
                )}
                {!isMonthlyOver && isMonthlyNear && (
                  <Chip icon={<WarningIcon />} label="注意" color="warning" size="small" />
                )}
              </Stack>

              <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                {formatCurrency(summary.monthly.totalAmount)}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                上限: {formatCurrency(summary.monthly.limit)}
              </Typography>

              <LinearProgress
                variant="determinate"
                value={Math.min(summary.monthly.usageRate, 100)}
                color={monthlyUsageColor}
                sx={{ height: 6, borderRadius: 3, mb: 1 }}
              />

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {formatUsageRate(summary.monthly.usageRate)} 使用
                </Typography>
                <Typography variant="caption" fontWeight="medium" color={`${monthlyUsageColor}.main`}>
                  使用可能: {formatCurrency(summary.monthly.remaining)}
                </Typography>
              </Stack>

              {/* 承認状況 */}
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" spacing={2}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                      }}
                    />
                    <Typography variant="caption">
                      承認 {formatCurrency(summary.monthly.approvedAmount)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'warning.main',
                      }}
                    />
                    <Typography variant="caption">
                      待機 {formatCurrency(summary.monthly.pendingAmount)}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 年次集計 */}
        <Grid item xs={12} sm={6}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  今年の申請額
                </Typography>
                {isYearlyOver && (
                  <Chip icon={<WarningIcon />} label="超過" color="error" size="small" />
                )}
                {!isYearlyOver && isYearlyNear && (
                  <Chip icon={<WarningIcon />} label="注意" color="warning" size="small" />
                )}
              </Stack>

              <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                {formatCurrency(summary.yearly.totalAmount)}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                上限: {formatCurrency(summary.yearly.limit)}
              </Typography>

              <LinearProgress
                variant="determinate"
                value={Math.min(summary.yearly.usageRate, 100)}
                color={yearlyUsageColor}
                sx={{ height: 6, borderRadius: 3, mb: 1 }}
              />

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {formatUsageRate(summary.yearly.usageRate)} 使用
                </Typography>
                <Typography variant="caption" fontWeight="medium" color={`${yearlyUsageColor}.main`}>
                  使用可能: {formatCurrency(summary.yearly.remaining)}
                </Typography>
              </Stack>

              {/* 承認状況 */}
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" spacing={2}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                      }}
                    />
                    <Typography variant="caption">
                      承認 {formatCurrency(summary.yearly.approvedAmount)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'warning.main',
                      }}
                    />
                    <Typography variant="caption">
                      待機 {formatCurrency(summary.yearly.pendingAmount)}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* アクションボタン */}
      <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'center' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/expenses/new')}
          disabled={isMonthlyOver || isYearlyOver}
        >
          新規申請
        </Button>
        <Button
          variant="outlined"
          onClick={() => router.push('/expenses')}
        >
          申請履歴
        </Button>
      </Box>

      {(isMonthlyOver || isYearlyOver) && (
        <Typography variant="caption" color="error" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          上限超過のため新規申請はできません
        </Typography>
      )}
    </ContentCard>
  );
}