'use client';

import React, { useMemo } from 'react';
import { PageContainer } from '@/components/common/layout/PageContainer';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { ExpenseList } from '@/components/features/expense';
import { useExpenses } from '@/hooks/expense/useExpenses';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import { subYears, format } from 'date-fns';

/**
 * 経費申請一覧ページ
 * 経費申請の一覧表示、フィルタリング、検索機能を提供
 */
export default function ExpensesPage() {
  // 直近1年間の日付範囲を計算
  const today = new Date();
  const oneYearAgo = subYears(today, 1);
  const dateRange = {
    start: format(oneYearAgo, 'yyyy-MM-dd'),
    end: format(today, 'yyyy-MM-dd'),
  };
  
  // データ取得（直近1年間のデータを取得）
  const { 
    expenses, 
    isLoading, 
    error,
  } = useExpenses({
    autoFetch: true,
    initialFilters: {
      dateRange,
    },
  });

  // ExpenseHistoryItem形式への変換
  const historyData = useMemo(() => {
    return expenses.map(expense => ({
      id: expense.id,
      date: expense.date,
      status: expense.status,
      category: expense.category,
      amount: expense.amount,
      processedAt: expense.approvedAt || expense.rejectedAt || null,
      rejectionReason: expense.rejectionReason,
    }));
  }, [expenses]);

  if (error) {
    return (
      <PageContainer maxWidth="lg">
        <PageHeader
          title="経費申請一覧"
          subtitle="エラーが発生しました"
        />
        <Alert severity="error" sx={{ mt: 2 }}>
          データの取得中にエラーが発生しました。後ほど再度お試しください。
        </Alert>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer maxWidth="lg">
        <PageHeader
          title="経費申請一覧"
          subtitle="経費申請の作成・管理を行います"
        />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="経費申請一覧"
        subtitle="経費申請の作成・管理を行います"
      />
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          直近1年間の申請履歴を表示しています
        </Typography>
      </Box>
      <ExpenseList 
        historyData={historyData}
      />
    </PageContainer>
  );
}