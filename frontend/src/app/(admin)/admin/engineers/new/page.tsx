'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { Breadcrumbs } from '@/components/common';
import { EngineerForm } from '@/components/admin/engineers/EngineerForm';
import { useCreateEngineer } from '@/hooks/admin/useEngineersQuery';
import { CreateEngineerInput, UpdateEngineerInput, CreateEngineerRequest } from '@/types/engineer';
import { useToast } from '@/components/common/Toast/ToastProvider';

export default function NewEngineer() {
  const router = useRouter();
  const { showSuccess } = useToast();
  const { createEngineer, isCreating } = useCreateEngineer();

  const handleSubmit = async (data: CreateEngineerInput | UpdateEngineerInput) => {
    try {
      const input = data as CreateEngineerInput;
      const req: CreateEngineerRequest = {
        email: input.email,
        password: input.password ?? input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        firstNameKana: input.firstNameKana,
        lastNameKana: input.lastNameKana,
        sei: input.sei,
        mei: input.mei,
        seiKana: undefined,
        meiKana: undefined,
        department: input.department,
        position: input.position,
        hireDate: input.hireDate,
        education: input.education,
        phoneNumber: input.phoneNumber,
        departmentId: undefined,
        managerId: undefined,
      };
      const result = await createEngineer(req);
      showSuccess('エンジニアを登録しました');
      // 詳細画面へリダイレクト
      router.push(`/admin/engineers/${result.id}`);
    } catch (error) {
      // エラーはuseCreateEngineer内で処理されるため、ここでは何もしない
      console.error('Failed to create engineer:', error);
    }
  };

  const handleCancel = () => {
    router.push('/admin/engineers');
  };

  return (
    <PageContainer 
      title="エンジニア新規登録"
      breadcrumbs={
        <Breadcrumbs 
          items={[
            { label: '管理者ダッシュボード', href: '/admin/dashboard' },
            { label: 'エンジニア管理', href: '/admin/engineers' },
            { label: '新規登録' },
          ]}
        />
      }
    >
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/engineers')}
        >
          一覧に戻る
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              基本情報
            </Typography>
            <Typography variant="body2" color="text.secondary">
              エンジニアの基本情報を入力してください。社員番号は自動採番されます。
            </Typography>
          </Box>

          <EngineerForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isCreating}
            submitButtonText="登録"
            submitButtonIcon={<SaveIcon />}
          />
        </CardContent>
      </Card>

      {/* 登録時の注意事項 */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          ※ 初期パスワードはメールアドレスと同じものが設定されます。初回ログイン時に変更を促してください。
        </Typography>
      </Alert>
    </PageContainer>
  );
}
