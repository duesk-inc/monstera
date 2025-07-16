'use client';

import React from 'react';
import { Container, Typography, Box, Alert } from '@mui/material';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { PageHeader } from '@/components/common/layout/PageHeader';

const AdminWorkHistoryPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Breadcrumbs 
        items={[
          { label: '管理者ダッシュボード', href: '/admin/dashboard' },
          { label: 'エンジニア管理' },
          { label: '職務経歴管理' }
        ]}
        sx={{ mb: 2 }}
      />

      <PageHeader
        title="職務経歴管理"
        subtitle="エンジニアの職務経歴を管理・確認できます"
      />

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          この機能は現在開発中です。エンジニアの職務経歴の一括管理、承認、エクスポート機能などが利用可能になる予定です。
        </Alert>
      </Box>
    </Container>
  );
};

export default AdminWorkHistoryPage;