import React from 'react';
import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import { PageContainer, PageHeader, ContentCard } from '@/components/common/layout';
import ActionButton from '@/components/common/ActionButton';

export default function NotFoundPage() {
  return (
    <PageContainer maxWidth="md">
      <PageHeader
        title="対象が見つかりません"
        subtitle="お探しのページは存在しないか、移動または削除されました。"
      />
      <ContentCard>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h4" gutterBottom>
            404 Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            URLをご確認の上、以下のボタンから移動してください。
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <ActionButton component={Link} href="/dashboard" buttonType="primary">
              ダッシュボードへ戻る
            </ActionButton>
            <ActionButton component={Link} href="/project" buttonType="secondary">
              案件一覧へ戻る
            </ActionButton>
            <ActionButton component={Link} href="/" buttonType="ghost">
              ホーム
            </ActionButton>
          </Box>
        </Box>
      </ContentCard>
    </PageContainer>
  );
}

