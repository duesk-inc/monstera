'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { ExpenseDetail } from '@/components/features/expense';
import type { ExpenseData } from '@/types/expense';

/**
 * 経費申請詳細ページ
 * 特定の経費申請の詳細情報を表示
 */
export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params.id as string;

  /**
   * 編集ボタンハンドラー
   * 編集画面に遷移
   */
  const handleEdit = (expense: ExpenseData) => {
    router.push(`/expenses/${expense.id}/edit`);
  };

  /**
   * 削除完了ハンドラー
   * 削除後は一覧画面に遷移
   */
  const handleDelete = () => {
    router.push('/expenses');
  };

  /**
   * 戻るボタンハンドラー
   * 一覧画面に戻る
   */
  const handleBack = () => {
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
        <Typography color="text.primary">詳細</Typography>
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
          経費申請詳細
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ ml: 2 }}
        >
          一覧に戻る
        </Button>
      </Box>

      {/* 詳細表示カード */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <ExpenseDetail
            expenseId={expenseId}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBack={handleBack}
            showActions={true}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}