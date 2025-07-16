'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Divider,
  Alert,
  Skeleton,
  Button,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useExpenseSummary, useExpenseSummaryUtils } from '@/hooks/useExpenseSummary';
import ExpenseSummaryCard from '@/components/expense/ExpenseSummaryCard';

/**
 * プロフィール画面用経費申請集計セクション
 */
export default function ExpenseProfileSection() {
  const router = useRouter();
  const {
    selectedYear,
    setSelectedYear,
    generateYearOptions,
    formatCurrency,
    formatUsageRate,
    getUsageColor,
  } = useExpenseSummaryUtils();

  // 選択年の集計データを取得
  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = useExpenseSummary({
    year: selectedYear,
  });

  const yearOptions = generateYearOptions();

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    refetch();
  };

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            経費申請データの取得に失敗しました
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* ヘッダー */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={1}>
              <AssessmentIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                経費申請履歴
              </Typography>
            </Stack>
            <Button
              size="small"
              startIcon={<TimelineIcon />}
              onClick={() => router.push('/expenses/summary')}
            >
              詳細分析
            </Button>
          </Stack>
        </Box>

        {/* 年度選択 */}
        <Box sx={{ mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>年度</InputLabel>
            <Select
              value={selectedYear}
              label="年度"
              onChange={(e) => handleYearChange(Number(e.target.value))}
            >
              {yearOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {isLoading ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          </Grid>
        ) : summary ? (
          <>
            {/* 集計カード */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <ExpenseSummaryCard
                  title="年次集計"
                  summary={summary.yearly}
                  showProgress={true}
                  showBreakdown={true}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <ExpenseSummaryCard
                  title="当月集計"
                  summary={summary.monthly}
                  showProgress={true}
                  showBreakdown={true}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* 使用状況サマリー */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                使用状況サマリー
              </Typography>
              
              <Grid container spacing={2}>
                {/* 年次使用率 */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        年次使用率
                      </Typography>
                      <Typography 
                        variant="h6" 
                        fontWeight="bold" 
                        color={`${getUsageColor(summary.yearly.usageRate)}.main`}
                      >
                        {formatUsageRate(summary.yearly.usageRate)}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {summary.yearly.usageRate >= 100 ? (
                          <TrendingUpIcon color="error" fontSize="small" />
                        ) : summary.yearly.usageRate >= 80 ? (
                          <TrendingUpIcon color="warning" fontSize="small" />
                        ) : (
                          <TrendingDownIcon color="success" fontSize="small" />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 月次使用率 */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        月次使用率
                      </Typography>
                      <Typography 
                        variant="h6" 
                        fontWeight="bold" 
                        color={`${getUsageColor(summary.monthly.usageRate)}.main`}
                      >
                        {formatUsageRate(summary.monthly.usageRate)}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {summary.monthly.usageRate >= 100 ? (
                          <TrendingUpIcon color="error" fontSize="small" />
                        ) : summary.monthly.usageRate >= 80 ? (
                          <TrendingUpIcon color="warning" fontSize="small" />
                        ) : (
                          <TrendingDownIcon color="success" fontSize="small" />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 承認率 */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        承認率
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="success.main">
                        {summary.yearly.totalAmount > 0 
                          ? formatUsageRate((summary.yearly.approvedAmount / summary.yearly.totalAmount) * 100)
                          : '0%'
                        }
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        年次ベース
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 承認待ち件数 */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        承認待ち金額
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="warning.main">
                        {formatCurrency(summary.yearly.pendingAmount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        年次累計
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* 利用傾向 */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                利用傾向
              </Typography>
              
              <Stack spacing={2}>
                {/* 年次利用傾向 */}
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      年次利用傾向:
                    </Typography>
                    {summary.yearly.usageRate >= 100 ? (
                      <Chip label="上限超過" color="error" size="small" />
                    ) : summary.yearly.usageRate >= 80 ? (
                      <Chip label="高使用" color="warning" size="small" />
                    ) : summary.yearly.usageRate >= 50 ? (
                      <Chip label="標準使用" color="info" size="small" />
                    ) : (
                      <Chip label="低使用" color="success" size="small" />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    年間上限 {formatCurrency(summary.yearly.limit)} のうち {formatCurrency(summary.yearly.totalAmount)} を使用
                  </Typography>
                </Box>

                {/* 月次利用傾向 */}
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      月次利用傾向:
                    </Typography>
                    {summary.monthly.usageRate >= 100 ? (
                      <Chip label="上限超過" color="error" size="small" />
                    ) : summary.monthly.usageRate >= 80 ? (
                      <Chip label="高使用" color="warning" size="small" />
                    ) : summary.monthly.usageRate >= 50 ? (
                      <Chip label="標準使用" color="info" size="small" />
                    ) : (
                      <Chip label="低使用" color="success" size="small" />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    月間上限 {formatCurrency(summary.monthly.limit)} のうち {formatCurrency(summary.monthly.totalAmount)} を使用
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </>
        ) : (
          <Typography color="text.secondary" textAlign="center">
            {selectedYear}年の経費申請データがありません
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}