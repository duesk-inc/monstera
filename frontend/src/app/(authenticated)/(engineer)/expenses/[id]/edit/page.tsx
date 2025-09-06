'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
  Typography,
  Alert,
  Skeleton,
  CircularProgress,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout/PageContainer';
import { ExpenseForm } from '@/components/features/expense';
import { useExpenseDetail } from '@/hooks/expense/useExpenseDetail';
import { useToast } from '@/components/common/Toast';
import type { ExpenseData } from '@/types/expense';

/**
 * 経費申請編集ページ
 * 既存の経費申請を編集するためのフォームを表示
 */
export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();
  const { showSuccess } = useToast();
  const expenseId = params.id as string;

  // 経費詳細データ取得
  const { expense, isLoading, isError, error, canEdit } = useExpenseDetail({ expenseId });

  // 編集権限がない場合は詳細画面にリダイレクト
  useEffect(() => {
    if (!isLoading && expense && !canEdit) {
      router.push(`/expenses/${expenseId}`);
    }
  }, [isLoading, expense, canEdit, router, expenseId]);

  /**
   * 更新成功時のハンドラー
   * 更新された経費申請の詳細画面に遷移
   */
  const handleSuccess = (updatedExpense: ExpenseData) => {
    showSuccess('経費申請を更新しました');
    router.push(`/expenses/${updatedExpense.id}`);
  };

  /**
   * キャンセル時のハンドラー
   * 詳細画面に戻る
   */
  const handleCancel = () => {
    router.push(`/expenses/${expenseId}`);
  };

  /**
   * 戻るボタンハンドラー
   * 詳細画面に戻る
   */
  const handleBack = () => {
    router.push(`/expenses/${expenseId}`);
  };

  // ローディング中の表示
  if (isLoading) {
    return (
      <PageContainer maxWidth="lg">
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // データが存在しない場合 or 取得エラー
  if (isError || !expense) {
    const status = (error as any)?.response?.status;
    const code = (error as any)?.enhanced?.code || (error as any)?.code;
    if (status === 404 || code === 'not_found' || code === 'NOT_FOUND') {
      notFound();
    }
    return (
      <PageContainer maxWidth="lg">
        <Card>
          <CardContent>
            <Alert severity="error">
              経費申請データの取得に失敗しました
            </Alert>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => router.push('/expenses')}
              >
                一覧に戻る
              </Button>
            </Box>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // 編集権限がない場合（念のため）
  if (!canEdit) {
    return (
      <PageContainer maxWidth="lg">
        <Card>
          <CardContent>
            <Alert severity="warning">
              この経費申請は編集できません。ステータスが「下書き」の場合のみ編集可能です。
            </Alert>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
              >
                詳細に戻る
              </Button>
            </Box>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

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
        <Link
          component="button"
          variant="body1"
          onClick={() => router.push(`/expenses/${expenseId}`)}
          sx={{
            textDecoration: 'none',
            color: 'text.primary',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          詳細
        </Link>
        <Typography color="text.primary">編集</Typography>
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
          経費申請の編集
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ ml: 2 }}
        >
          詳細に戻る
        </Button>
      </Box>

      {/* 編集フォームカード */}
      <Card>
        <CardContent>
          <ExpenseForm
            expense={expense}
            mode="edit"
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>

      {/* 編集時の注意事項 */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          ※ 下書きステータスの経費申請のみ編集可能です
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          ※ 提出済みの申請を修正する場合は、一度取り消してから再度編集してください
        </Typography>
      </Alert>
    </PageContainer>
  );
}
