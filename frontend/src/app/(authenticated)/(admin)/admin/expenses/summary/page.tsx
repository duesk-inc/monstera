'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Alert,
  Skeleton,
  Stack,
} from '@mui/material';
import { useCurrentExpenseSummary, useExpenseSummary, useExpenseSummaryUtils } from '@/hooks/useExpenseSummary';
import ExpenseSummaryCard from '@/components/expense/ExpenseSummaryCard';
import ExpenseMonthlyChart from '@/components/expense/ExpenseMonthlyChart';

// 月別データを生成するヘルパー関数
const generateMonthlyData = (summary: any, year: number, currentMonth: number) => {
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const isCurrentMonth = month === currentMonth;
    
    // 現在の月のデータは実際の値を使用、それ以外は仮想データ
    // 実際の実装では、月別のAPIエンドポイントから取得する
    const baseAmount = isCurrentMonth ? summary.monthly.totalAmount : Math.floor(Math.random() * summary.monthly.limit * 0.8);
    
    return {
      month,
      monthName: monthNames[index],
      totalAmount: baseAmount,
      approvedAmount: Math.floor(baseAmount * 0.7),
      pendingAmount: Math.floor(baseAmount * 0.2),
      rejectedAmount: Math.floor(baseAmount * 0.1),
      usageRate: (baseAmount / summary.monthly.limit) * 100,
    };
  });
};

/**
 * 経費申請集計画面
 */
export default function ExpenseSummaryPage() {
  const { 
    selectedYear, 
    setSelectedYear, 
    selectedMonth, 
    setSelectedMonth,
    generateYearOptions,
    generateMonthOptions,
  } = useExpenseSummaryUtils();

  // 現在の集計（デフォルト表示用）
  const {
    data: currentSummary,
    isLoading: isCurrentLoading,
    error: currentError,
  } = useCurrentExpenseSummary();

  // 指定年月の集計
  const {
    data: selectedSummary,
    isLoading: isSelectedLoading,
    error: selectedError,
    refetch,
  } = useExpenseSummary({
    year: selectedYear,
    month: selectedMonth,
  });

  const yearOptions = generateYearOptions();
  const monthOptions = generateMonthOptions();

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    refetch();
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    refetch();
  };

  if (currentError || selectedError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          経費申請集計の取得に失敗しました。ページを再読み込みしてください。
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        経費申請集計
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        月次・年次の経費申請状況を確認できます
      </Typography>

      {/* 現在の月次・年次集計 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          現在の状況
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            {isCurrentLoading ? (
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="40%" height={32} />
                  <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            ) : currentSummary ? (
              <ExpenseSummaryCard
                title="今月の集計"
                summary={currentSummary.monthly}
                showProgress={true}
                showBreakdown={true}
              />
            ) : null}
          </Grid>
          
          <Grid item xs={12} md={6}>
            {isCurrentLoading ? (
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="40%" height={32} />
                  <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            ) : currentSummary ? (
              <ExpenseSummaryCard
                title="今年の集計"
                summary={currentSummary.yearly}
                showProgress={true}
                showBreakdown={true}
              />
            ) : null}
          </Grid>
        </Grid>
      </Box>

      {/* 期間指定集計 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          期間指定集計
        </Typography>
        
        {/* フィルター */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
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
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>月</InputLabel>
            <Select
              value={selectedMonth}
              label="月"
              onChange={(e) => handleMonthChange(Number(e.target.value))}
            >
              {monthOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* 選択期間の集計 */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            {isSelectedLoading ? (
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="40%" height={32} />
                  <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            ) : selectedSummary ? (
              <ExpenseSummaryCard
                title={`${selectedYear}年${selectedMonth}月の集計`}
                summary={selectedSummary.monthly}
                showProgress={true}
                showBreakdown={true}
              />
            ) : null}
          </Grid>
          
          <Grid item xs={12} md={6}>
            {isSelectedLoading ? (
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="40%" height={32} />
                  <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            ) : selectedSummary ? (
              <ExpenseSummaryCard
                title={`${selectedYear}年の集計`}
                summary={selectedSummary.yearly}
                showProgress={true}
                showBreakdown={true}
              />
            ) : null}
          </Grid>
        </Grid>
      </Box>

      {/* 月別推移チャート */}
      {selectedSummary && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            月別推移
          </Typography>
          
          <ExpenseMonthlyChart
            year={selectedYear}
            monthlyData={generateMonthlyData(selectedSummary, selectedYear, selectedMonth)}
            yearlyLimit={selectedSummary.yearly.limit}
            monthlyLimit={selectedSummary.monthly.limit}
            isLoading={isSelectedLoading}
          />
        </Box>
      )}

      {/* 使用量警告 */}
      {(currentSummary?.monthly.usageRate >= 80 || currentSummary?.yearly.usageRate >= 80) && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body2">
            経費申請の使用量が上限の80%を超えています。計画的な申請をお願いします。
          </Typography>
        </Alert>
      )}

      {(currentSummary?.monthly.usageRate >= 100 || currentSummary?.yearly.usageRate >= 100) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">
            経費申請の上限を超過しています。新規申請ができません。
          </Typography>
        </Alert>
      )}
    </Box>
  );
}