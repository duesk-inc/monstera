'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Backdrop,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { DebugLogger } from '@/lib/debug/logger';
import { useExpenseSubmit } from '@/hooks/expense/useExpenseSubmit';
import { CommonTabPanel, type HistoryItem } from '@/components/common';
import { 
  PageContainer, 
  PageHeader, 
  TabContainer,
  type TabItem 
} from '@/components/common/layout';
import { ExpenseApplicationForm } from '@/components/features/expense/ExpenseApplicationForm';
import { ExpenseHistoryView } from '@/components/features/expense/ExpenseHistoryView';
import type { ExpenseFormData } from '@/types/expense';

// ページ固有のフォームデータ型定義
interface LocalExpenseFormData {
  category: string;
  amount: number;
  date: Date | null;
  reason: string;
  receiptImage: File | null;
  notes: string;
}

// 経費申請履歴項目の型定義 (HistoryItemを拡張)
interface ExpenseHistoryItem extends HistoryItem {
  category: string;
  amount: number;
  processedAt?: Date | string | null;
  rejectionReason?: string;
}

// 仮の経費申請履歴データ
const MOCK_EXPENSE_HISTORY: ExpenseHistoryItem[] = [
  {
    id: 1,
    date: new Date('2023-09-15'),
    category: 'transportation',
    amount: 3200,
    status: 'approved',
    processedAt: new Date('2023-09-18'),
  },
  {
    id: 2,
    date: new Date('2023-10-05'),
    category: 'supplies',
    amount: 12500,
    status: 'pending',
    processedAt: null,
  },
  {
    id: 3,
    date: new Date('2023-10-12'),
    category: 'other',
    amount: 5000,
    status: 'rejected',
    processedAt: null,
    rejectionReason: '領収書が不鮮明です。再提出してください。',
  },
  {
    id: 4,
    date: new Date('2023-07-21'),
    category: 'transportation',
    amount: 5600,
    status: 'approved',
    processedAt: new Date('2023-07-25'),
  },
];

// ローディング用コンポーネント
function ExpensePageLoading() {
  return (
    <PageContainer>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    </PageContainer>
  );
}

// ExpensePageContentコンポーネント
function ExpensePageContent() {
  const searchParams = useSearchParams();
  
  // タブ状態管理
  const [tabIndex, setTabIndex] = useState(0);
  
  // URLパラメータによるタブ制御（通知からの遷移時）
  useEffect(() => {
    const fromParam = searchParams.get('from');
    if (fromParam === 'notification') {
      // 通知からの遷移時は申請履歴タブを表示
      setTabIndex(1);
    }
  }, [searchParams]);
  
  // 年度フィルター（履歴用）
  const [fiscalYear, setFiscalYear] = useState('2023');
  
  // フォーム状態管理
  const formMethods = useForm<LocalExpenseFormData>({
    defaultValues: {
      category: 'transportation',
      amount: 0,
      date: new Date(),
      reason: '',
      receiptImage: null,
      notes: '',
    },
  });
  
  // スナックバー状態管理
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });
  
  // 経費申請フック
  const { createExpense } = useExpenseSubmit();
  
  // 添付ファイル管理
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  // タブ切り替え処理
  const handleTabChange = (_: React.SyntheticEvent, newValue: string | number) => {
    setTabIndex(newValue as number);
  };
  
  // ファイルエラーハンドラー
  const handleFileError = (message: string) => {
    setSnackbar({
      open: true,
      message,
      severity: 'error',
    });
  };
  
  // フォーム送信処理
  const handleSubmit = async (data: LocalExpenseFormData) => {
    try {
      // ローカルフォームデータを API用のフォーマットに変換
      const expenseData: ExpenseFormData = {
        categoryId: data.category, // カテゴリIDマッピングが必要な場合は調整
        amount: data.amount,
        description: data.reason,
        expenseDate: data.date?.toISOString().split('T')[0] || '', // YYYY-MM-DD形式
      };
      
      // 経費申請を作成
      await createExpense(expenseData);
      
      setSnackbar({
        open: true,
        message: '経費申請を送信しました',
        severity: 'success',
      });
      
      // フォームリセット
      formMethods.reset();
      setReceiptFile(null);
      
    } catch (error) {
      DebugLogger.apiError({
        category: '経費',
        operation: '申請送信'
      }, {
        error
      });
      setSnackbar({
        open: true,
        message: 'エラーが発生しました。再度お試しください。',
        severity: 'error',
      });
    }
  };
  
  // フォームリセット処理
  const handleReset = () => {
    formMethods.reset();
    setReceiptFile(null);
  };
  
  // スナックバー閉じる処理
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  // 年度フィルター変更処理
  const handleFiscalYearChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiscalYear(event.target.value);
  };
  
  // 履歴データのフィルタリング
  const filteredHistory = MOCK_EXPENSE_HISTORY.filter(item => {
    const itemYear = new Date(item.date).getFullYear();
    return itemYear.toString() === fiscalYear;
  });

  // タブ設定
  const tabs: TabItem[] = [
    { label: '新規申請', value: 0 },
    { label: '申請履歴', value: 1 },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="経費申請"
        subtitle="交通費や備品購入費などの経費を申請できます"
      />
      <TabContainer
        tabs={tabs}
        value={tabIndex}
        onChange={handleTabChange}
        data-testid="expense-tabs"
      >
        <CommonTabPanel value={tabIndex} index={0}>
          <ExpenseApplicationForm
            formMethods={formMethods}
            receiptFile={receiptFile}
            onReceiptFileChange={setReceiptFile}
            onFileError={handleFileError}
            onSubmit={handleSubmit}
            onReset={handleReset}
            isSubmitting={formMethods.formState.isSubmitting}
          />
        </CommonTabPanel>

        <CommonTabPanel value={tabIndex} index={1}>
          <ExpenseHistoryView
            fiscalYear={fiscalYear}
            onFiscalYearChange={handleFiscalYearChange}
            historyData={filteredHistory}
          />
        </CommonTabPanel>
      </TabContainer>

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ローディングオーバーレイ */}
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={formMethods.formState.isSubmitting}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </PageContainer>
  );
}

export default function ExpensePage() {
  return (
    <Suspense fallback={<ExpensePageLoading />}>
      <ExpensePageContent />
    </Suspense>
  );
} 