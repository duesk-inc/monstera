'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  MenuItem,
  Skeleton,
  Alert,
  Paper,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  QuestionAnswer as QuestionIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { PageContainer } from '../../../../components/common/layout/PageContainer';
import { PageHeader } from '../../../../components/common/layout/PageHeader';
import { EmptyState } from '../../../../components/common/layout/EmptyState';
import { CommonPagination } from '../../../../components/common/CommonPagination';
import { usePendingQuestions } from '../../../../hooks/proposal/useProposalQueries';
import { formatDateTime } from '../../../../types/proposal';
import type { PendingQuestionDTO } from '../../../../types/proposal';

/**
 * 営業担当者向けエンジニア提案管理ページ
 * 未回答の質問一覧を表示し、回答ページへ遷移する
 */
export default function SalesEngineerProposalsPage() {
  const router = useRouter();
  
  // フィルター・検索状態
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unanswered'>('unanswered');
  const [currentPage, setCurrentPage] = useState(1);
  
  // 未回答質問データを取得
  const {
    questions,
    total,
    totalPages,
    isLoading,
    isError,
    filters,
    setFilters,
    setPage,
    refetch,
  } = usePendingQuestions({
    initialFilters: {
      onlyUnanswered: statusFilter === 'unanswered',
      searchTerm: searchTerm || undefined,
    },
    initialPage: currentPage,
  });

  // 検索処理
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    setFilters({ searchTerm: value || undefined });
    setCurrentPage(1);
    setPage(1);
  };

  // フィルター処理
  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'all' | 'unanswered';
    setStatusFilter(value);
    setFilters({ onlyUnanswered: value === 'unanswered' });
    setCurrentPage(1);
    setPage(1);
  };

  // ページ変更処理
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setPage(newPage);
  };

  // 詳細ページへ遷移
  const handleViewProposal = (proposalId: string) => {
    router.push(`/engineer-proposals/${proposalId}/questions`);
  };

  // ローディング状態のスケルトン
  const LoadingSkeleton = () => (
    <Grid container spacing={3}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Grid item xs={12} md={6} key={index}>
          <Card variant="outlined">
            <CardContent>
              <Skeleton variant="text" width="80%" height={28} />
              <Skeleton variant="text" width="60%" height={20} sx={{ mt: 2 }} />
              <Skeleton variant="text" width="40%" height={20} />
              <Box sx={{ mt: 2 }}>
                <Skeleton variant="rounded" width={100} height={36} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // 質問カードコンポーネント
  const QuestionCard = ({ question }: { question: PendingQuestionDTO }) => (
    <Card 
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 2,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* プロジェクト名 */}
        <Typography 
          variant="h6" 
          component="h3" 
          gutterBottom
          sx={{
            fontWeight: 600,
            lineHeight: 1.3,
            display: '-webkit-box',
            '-webkit-line-clamp': 2,
            '-webkit-box-orient': 'vertical',
            overflow: 'hidden',
          }}
        >
          {question.projectName}
        </Typography>

        {/* 質問数とステータス */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip
            icon={<QuestionIcon sx={{ fontSize: 16 }} />}
            label={`未回答 ${question.pendingCount}件`}
            color="warning"
            size="small"
            sx={{ fontWeight: 'medium' }}
          />
          {question.totalCount > question.pendingCount && (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
              label={`回答済 ${question.totalCount - question.pendingCount}件`}
              color="success"
              size="small"
              variant="outlined"
            />
          )}
        </Stack>

        {/* 詳細情報 */}
        <Stack spacing={1}>
          {/* エンジニア */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              エンジニア:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {question.engineerName}
            </Typography>
          </Box>

          {/* クライアント */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              クライアント:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {question.clientName}
            </Typography>
          </Box>

          {/* 最新質問日時 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              最新質問:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatDateTime(question.latestQuestionAt)}
            </Typography>
          </Box>
        </Stack>
      </CardContent>

      <Box sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<VisibilityIcon />}
          onClick={() => handleViewProposal(question.proposalId)}
          size="small"
        >
          質問に回答する
        </Button>
      </Box>
    </Card>
  );

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="エンジニア提案への質問"
        subtitle="エンジニアからの質問に回答して、提案を進めましょう"
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">
                未回答の質問
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="warning.main">
                {total}件
              </Typography>
            </Box>
          </Box>
        }
      />

      {/* フィルター・検索バー */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="プロジェクト名、エンジニア名で検索..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearchTerm('');
                        setFilters({ searchTerm: undefined });
                      }}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              select
              size="small"
              label="表示"
              value={statusFilter}
              onChange={handleFilterChange}
            >
              <MenuItem value="unanswered">未回答のみ</MenuItem>
              <MenuItem value="all">全て</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={refetch}
              disabled={isLoading}
            >
              更新
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* メインコンテンツ */}
      <Box>
        {isError && (
          <EmptyState
            type="error"
            message="データの取得に失敗しました"
            description="ネットワーク接続を確認してから再度お試しください"
            actions={
              <Button 
                variant="contained" 
                onClick={refetch}
              >
                再読み込み
              </Button>
            }
          />
        )}

        {isLoading && <LoadingSkeleton />}

        {!isLoading && !isError && questions.length === 0 && (
          <EmptyState
            type="search"
            message={statusFilter === 'unanswered' ? "未回答の質問はありません" : "質問が見つかりません"}
            description={
              searchTerm
                ? "検索条件を変更してお試しください"
                : "エンジニアからの質問をお待ちください"
            }
            actions={
              searchTerm && (
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({});
                  }}
                >
                  検索をクリア
                </Button>
              )
            }
          />
        )}

        {!isLoading && !isError && questions.length > 0 && (
          <>
            {/* 質問カード一覧 */}
            <Grid container spacing={3}>
              {questions.map((question) => (
                <Grid item xs={12} md={6} key={question.proposalId}>
                  <QuestionCard question={question} />
                </Grid>
              ))}
            </Grid>

            {/* ページネーション */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CommonPagination
                  page={currentPage}
                  totalPages={totalPages}
                  onChange={handlePageChange}
                  disabled={isLoading}
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </PageContainer>
  );
}