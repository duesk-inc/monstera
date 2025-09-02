'use client';

import React, { useState } from 'react';
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
import { useExpenseDetail } from '@/hooks/expense/useExpenseDetail';
import type { ExpenseData } from '@/types/expense';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteExpense } from '@/lib/api/expense';
import { useToast } from '@/components/common/Toast';

/**
 * 経費申請詳細ページ
 * 特定の経費申請の詳細情報を表示
 */
export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params.id as string;

  // 経費詳細データ取得
  const { expense, isLoading, isError, error, canEdit, canDelete } = useExpenseDetail({ expenseId });
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await deleteExpense(expenseId);
    },
    onSuccess: async () => {
      showSuccess('経費申請を削除しました');
      // 一覧キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      router.push('/expenses');
    },
    onError: (e: any) => {
      const msg = e?.message || '削除に失敗しました';
      showError(msg);
    },
  });

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

  // ローディング／エラー表示
  if (isLoading) {
    return (
      <PageContainer maxWidth="lg">
        <Card>
          <CardContent>
            読み込み中...
          </CardContent>
        </Card>
      </PageContainer>
    );
  }
  if (isError || !expense) {
    return (
      <PageContainer maxWidth="lg">
        <Card>
          <CardContent>
            <Typography color="error">データの取得に失敗しました。</Typography>
            <Button sx={{ mt: 2 }} variant="outlined" onClick={() => router.push('/expenses')}>一覧に戻る</Button>
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

      {/* 詳細表示カード（簡易表示） */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' }, rowGap: 1.5, columnGap: 2 }}>
            <Typography color="text.secondary">申請ID</Typography>
            <Typography>{expense.id}</Typography>
            <Typography color="text.secondary">日付</Typography>
            <Typography>{expense.expenseDate || expense.date}</Typography>
            <Typography color="text.secondary">ステータス</Typography>
            <Typography>{expense.status}</Typography>
            <Typography color="text.secondary">カテゴリ</Typography>
            <Typography>{expense.category}</Typography>
            <Typography color="text.secondary">金額</Typography>
            <Typography>{expense.amount?.toLocaleString()} 円</Typography>
            <Typography color="text.secondary">内容</Typography>
            <Typography>{expense.description}</Typography>
            {expense.receiptUrl && (
              <>
                <Typography color="text.secondary">領収書</Typography>
                <Typography>
                  <Link href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">領収書を開く</Link>
                </Typography>
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
            <Button variant="outlined" onClick={handleBack}>一覧に戻る</Button>
            {canDelete && (
              <Button variant="outlined" color="error" onClick={() => setDeleteOpen(true)}>削除</Button>
            )}
            {canEdit && (
              <Button variant="contained" onClick={() => handleEdit(expense as ExpenseData)}>編集</Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        title="経費申請を削除しますか？"
        message="この操作は取り消せません。下書きまたは却下の申請のみ削除できます。"
        confirmText="削除する"
        cancelText="キャンセル"
        severity="error"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
        loading={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
