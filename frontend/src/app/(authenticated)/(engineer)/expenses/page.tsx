'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/common/layout/PageContainer';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { ExpenseList } from '@/components/features/expense';
import { useExpenses } from '@/hooks/expense/useExpenses';
import { Box, CircularProgress, Alert, Typography, Chip, Stack } from '@mui/material';
import { subYears, format } from 'date-fns';
import ActionButton from '@/components/common/ActionButton';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { EXPENSE_STATUS_LABELS } from '@/constants/expense';
import type { ExpenseStatusType } from '@/types/expense';

/**
 * 経費申請一覧ページ
 * 経費申請の一覧表示、フィルタリング、検索機能を提供
 */
export default function ExpensesPage() {
  const router = useRouter();
  
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
    filters,
    setFilters,
  } = useExpenses({
    autoFetch: true,
    initialFilters: {
      dateRange,
      status: [], // 初期状態では全てのステータスを表示
    },
  });

  // ステータスフィルターのトグル処理
  const handleStatusToggle = (status: ExpenseStatusType) => {
    const currentStatuses = filters.status || [];
    let newStatuses: ExpenseStatusType[];
    
    if (currentStatuses.includes(status)) {
      // 既に選択されている場合は解除
      newStatuses = currentStatuses.filter(s => s !== status);
    } else {
      // 選択されていない場合は追加
      newStatuses = [...currentStatuses, status];
    }
    
    setFilters({ status: newStatuses });
  };

  // 「下書きのみ」フィルターの切り替え
  const handleDraftOnlyToggle = () => {
    if (filters.status?.length === 1 && filters.status[0] === 'draft') {
      // 既に下書きのみの場合は全て表示
      setFilters({ status: [] });
    } else {
      // 下書きのみを表示
      setFilters({ status: ['draft'] });
    }
  };

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
          actions={
            <ActionButton
              buttonType="primary"
              icon={<AddIcon />}
              onClick={() => router.push('/expenses/new')}
            >
              新規作成
            </ActionButton>
          }
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
          actions={
            <ActionButton
              buttonType="primary"
              icon={<AddIcon />}
              onClick={() => router.push('/expenses/new')}
            >
              新規作成
            </ActionButton>
          }
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
        actions={
          <ActionButton
            buttonType="primary"
            icon={<AddIcon />}
            onClick={() => router.push('/expenses/new')}
          >
            新規作成
          </ActionButton>
        }
      />
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          直近1年間の申請履歴を表示しています
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
          <Chip
            label="下書きのみ"
            onClick={handleDraftOnlyToggle}
            color={filters.status?.length === 1 && filters.status[0] === 'draft' ? 'primary' : 'default'}
            variant={filters.status?.length === 1 && filters.status[0] === 'draft' ? 'filled' : 'outlined'}
            icon={<EditIcon />}
          />
          <Chip
            label="すべて"
            onClick={() => setFilters({ status: [] })}
            color={!filters.status || filters.status.length === 0 ? 'primary' : 'default'}
            variant={!filters.status || filters.status.length === 0 ? 'filled' : 'outlined'}
          />
          <Box sx={{ borderLeft: 1, borderColor: 'divider', height: 32, mx: 1 }} />
          {Object.entries(EXPENSE_STATUS_LABELS).map(([key, label]) => {
            const statusKey = key as ExpenseStatusType;
            const isSelected = filters.status?.includes(statusKey);
            return (
              <Chip
                key={key}
                label={label}
                onClick={() => handleStatusToggle(statusKey)}
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                size="small"
              />
            );
          })}
        </Stack>
      </Box>
      <ExpenseList 
        historyData={historyData}
      />
    </PageContainer>
  );
}