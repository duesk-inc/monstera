'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Alert,
  Skeleton,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { Breadcrumbs } from '@/components/common';
import { EngineerForm } from '@/components/admin/engineers/EngineerForm';
import { useEngineerDetail, useUpdateEngineer } from '@/hooks/admin/useEngineersQuery';
import { UpdateEngineerInput } from '@/types/engineer';
import { useToast } from '@/components/common/Toast/ToastProvider';
import { ENGINEER_STATUS_LABELS } from '@/constants/engineer';

export default function EditEngineer() {
  const params = useParams();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  
  const engineerId = params.id as string;
  const { engineer, loading, error, refresh } = useEngineerDetail(engineerId);
  const { updateEngineer, isUpdating } = useUpdateEngineer();

  const handleSubmit = async (data: UpdateEngineerInput) => {
    try {
      await updateEngineer(engineerId, data);
      showSuccess('エンジニア情報を更新しました');
      // 詳細画面へリダイレクト
      router.push(`/admin/engineers/${engineerId}`);
    } catch (error) {
      // エラーはuseUpdateEngineer内で処理されるため、ここでは何もしない
      console.error('Failed to update engineer:', error);
    }
  };

  const handleCancel = () => {
    router.push(`/admin/engineers/${engineerId}`);
  };

  if (error) {
    return (
      <PageContainer title="エンジニア編集">
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={refresh}>
            再読み込み
          </Button>
        }>
          データの読み込みに失敗しました。
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title={loading ? 'エンジニア編集' : engineer ? `${engineer.user.sei} ${engineer.user.mei} - 編集` : 'エンジニア編集'}
      breadcrumbs={
        <Breadcrumbs 
          items={[
            { label: '管理者ダッシュボード', href: '/admin/dashboard' },
            { label: 'エンジニア管理', href: '/admin/engineers' },
            { 
              label: loading ? '読み込み中...' : engineer ? `${engineer.user.sei} ${engineer.user.mei}` : '', 
              href: `/admin/engineers/${engineerId}` 
            },
            { label: '編集' },
          ]}
        />
      }
    >
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push(`/admin/engineers/${engineerId}`)}
        >
          詳細に戻る
        </Button>
        {engineer && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              社員番号: {engineer.user.employeeNumber}
            </Typography>
            <Chip
              label={ENGINEER_STATUS_LABELS[engineer.user.engineerStatus]}
              color={engineer.user.engineerStatus === 'active' ? 'success' : 'default'}
              size="small"
            />
          </Box>
        )}
      </Box>

      <Card>
        <CardContent>
          {loading ? (
            <>
              <Skeleton variant="text" width="200px" height={32} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={400} />
            </>
          ) : engineer ? (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  基本情報の編集
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  エンジニアの基本情報を編集します。メールアドレスと社員番号は変更できません。
                </Typography>
              </Box>

              <EngineerForm
                mode="edit"
                initialData={engineer}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isUpdating}
                submitButtonText="更新"
                submitButtonIcon={<SaveIcon />}
              />
            </>
          ) : (
            <Alert severity="info">
              エンジニア情報が見つかりません。
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 編集時の注意事項 */}
      {engineer && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body2">
            ※ ステータスの変更は履歴に記録されます。変更理由を明確にしてください。
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            ※ スキル情報やプロジェクト履歴の編集は、詳細画面の各タブから行ってください。
          </Typography>
        </Alert>
      )}
    </PageContainer>
  );
}