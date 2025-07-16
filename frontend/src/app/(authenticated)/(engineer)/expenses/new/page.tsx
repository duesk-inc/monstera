'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout/PageContainer';
import { ExpenseForm } from '@/components/features/expense';
import { useToast } from '@/components/common/Toast';
import type { ExpenseData } from '@/types/expense';

/**
 * 経費申請新規作成ページ
 * 新規の経費申請を作成するためのフォームを表示
 */
export default function NewExpensePage() {
  const router = useRouter();
  const { showSuccess } = useToast();

  /**
   * 作成成功時のハンドラー
   * 作成された経費申請の詳細画面に遷移
   */
  const handleSuccess = (expense: ExpenseData) => {
    showSuccess('経費申請を作成しました');
    router.push(`/expenses/${expense.id}`);
  };

  /**
   * キャンセル時のハンドラー
   * 一覧画面に戻る
   */
  const handleCancel = () => {
    router.push('/expenses');
  };

  return (
    <PageContainer maxWidth="lg">
      {/* パンくずリスト */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => router.push('/expenses')}
          sx={{
            textDecoration: 'none',
            color: 'text.primary',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          経費申請一覧
        </Link>
        <Typography color="text.primary">新規作成</Typography>
      </Breadcrumbs>

      {/* ページヘッダー */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="bold">
          経費申請の新規作成
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/expenses')}
          sx={{ ml: 2 }}
        >
          一覧に戻る
        </Button>
      </Box>

      {/* フォームカード */}
      <Card>
        <CardContent>
          <ExpenseForm
            mode="create"
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}