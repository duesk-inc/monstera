'use client';

import React from 'react';
import { PageContainer } from '@/components/common/layout/PageContainer';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { ExpenseList } from '@/components/features/expense';

/**
 * 経費申請一覧ページ
 * 経費申請の一覧表示、フィルタリング、検索機能を提供
 */
export default function ExpensesPage() {
  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="経費申請一覧"
        subtitle="経費申請の作成・管理を行います"
      />
      <ExpenseList />
    </PageContainer>
  );
}