// @ts-nocheck
'use client';

import React from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { Box, Typography, Button, Breadcrumbs, Link, Alert, Skeleton } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { PageContainer } from '../../../../../../components/common/layout/PageContainer';
import { ProposalQuestionList } from '../../../../../../components/features/proposal';
import { 
  useProposalDetail,
  useQuestions,
  useRespondQuestion,
} from '../../../../../../hooks/proposal/useProposalQueries';

/**
 * 営業担当者向け質問回答ページ
 * 提案に対する質問への回答機能を提供
 */
export default function SalesEngineerProposalQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;

  // 提案詳細データを取得
  const { 
    data: proposal, 
    isLoading: proposalLoading, 
    isError: proposalError,
  } = useProposalDetail(proposalId);

  // 質問一覧データを取得
  const { 
    questions, 
    isLoading: questionsLoading,
    refetch: refetchQuestions,
  } = useQuestions({
    proposalId,
    enabled: !!proposalId,
  });

  // 質問回答
  const respondQuestion = useRespondQuestion({
    onSuccess: () => {
      refetchQuestions();
    },
  });

  // 戻るボタン
  const handleBack = () => {
    router.push('/engineer-proposals');
  };

  // ローディング状態
  if (proposalLoading) {
    return (
      <PageContainer maxWidth="lg">
        <Box sx={{ mb: 2 }}>
          <Skeleton variant="text" width={300} height={32} />
        </Box>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" width="100%" height={400} />
      </PageContainer>
    );
  }

  // エラー状態
  if (proposalError || !proposal) {
    const status = (proposalError as any)?.response?.status;
    const code = (proposalError as any)?.enhanced?.code || (proposalError as any)?.code;
    if (status === 404 || code === 'not_found' || code === 'NOT_FOUND') {
      notFound();
    }
    return (
      <PageContainer maxWidth="lg">
        <Alert severity="error">
          提案情報の取得に失敗しました。
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            戻る
          </Button>
        </Box>
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
          onClick={() => router.push('/engineer-proposals')}
          sx={{
            textDecoration: 'none',
            color: 'text.primary',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          エンジニア提案管理
        </Link>
        <Typography color="text.primary">質問回答</Typography>
      </Breadcrumbs>

      {/* ページヘッダー */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 1 }}>
            質問への回答
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {proposal.project.projectName}
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          一覧に戻る
        </Button>
      </Box>

      {/* 質問一覧 */}
      <ProposalQuestionList
        questions={questions}
        isLoading={questionsLoading}
        isSalesView={true}
        onRespondQuestion={async (id, text) => {
          await respondQuestion.mutateAsync({ id, responseText: text });
        }}
        onRefresh={refetchQuestions}
        title="エンジニアからの質問"
        emptyMessage="エンジニアからの質問はまだありません"
      />
    </PageContainer>
  );
}
