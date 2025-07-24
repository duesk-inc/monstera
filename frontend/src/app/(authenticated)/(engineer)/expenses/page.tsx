'use client';

import React, { useState, useMemo } from 'react';
import { PageContainer } from '@/components/common/layout/PageContainer';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { ExpenseList } from '@/components/features/expense';
import { useExpenses } from '@/hooks/expense/useExpenses';
import { Box, CircularProgress, Alert } from '@mui/material';

/**
 * 経費申請一覧ページ
 * 経費申請の一覧表示、フィルタリング、検索機能を提供
 */
export default function ExpensesPage() {
  const [fiscalYear, setFiscalYear] = useState('2023');
  
  // データ取得
  const { expenses, isLoading, error } = useExpenses({
    autoFetch: true,
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

  const handleFiscalYearChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiscalYear(event.target.value);
  };

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
      <ExpenseList 
        fiscalYear={fiscalYear}
        onFiscalYearChange={handleFiscalYearChange}
        historyData={historyData}
      />
    </PageContainer>
  );
}