'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  Divider,
  Skeleton,
} from '@mui/material';
import { Grid as MuiGrid } from '@mui/material';
const Grid: any = MuiGrid;
import {
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  HelpOutline as QuestionIcon,
  TrendingUp as TrendingUpIcon,
  BusinessCenter as BusinessIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useOptimizedProposals } from '../../../../hooks/proposal/useOptimizedProposals';
import { useProposalErrorHandling } from '../../../../hooks/proposal/useProposalErrorHandling';
import { useProposalPermissions } from '../../../../hooks/proposal/useProposalPermissions';
import { PageContainer } from '../../../../components/common/layout/PageContainer';
import { PageHeader } from '../../../../components/common/layout/PageHeader';
import { FilterBar } from '../../../../components/common/layout/FilterBar';
import { EmptyState } from '../../../../components/common/layout/EmptyState';
import { CommonPagination } from '../../../../components/common/CommonPagination';
// import { StatusChip } from '../../../../components/common/StatusChip';
import type { ProposalItemDTO, ProposalStatus } from '../../../../types/proposal';
import { 
  getProposalStatusLabel, 
  getProposalStatusColor,
  formatPriceRange,
  formatDate,
} from '../../../../types/proposal';

/**
 * 提案一覧ページ
 * エンジニア向けの提案情報確認・ステータス更新機能を提供
 */
export default function ProposalsPage() {
  const router = useRouter();
  
  // 権限チェック
  const { 
    canViewProposals, 
    isEngineer, 
    canAccessProposal,
    canRespondToProposals,
    canManageProposals 
  } = useProposalPermissions();

  // 権限がない場合は早期リターン
  if (!canViewProposals) {
    return (
      <PageContainer maxWidth="lg">
        <EmptyState
          type="error"
          message="アクセス権限がありません"
          description="提案情報を閲覧する権限がありません。システム管理者にお問い合わせください。"
        />
      </PageContainer>
    );
  }
  
  // フィルター・検索状態
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // 提案一覧データを取得（最適化版）
  const {
    proposals,
    total,
    totalPages,
    isLoading,
    isError,
    filters,
    setFilters,
    setPage,
    refetch,
    prefetchProposalDetail,
    performanceInfo,
    cleanupCache,
  } = useOptimizedProposals({
    initialFilters: {
      status: statusFilter === 'all' ? undefined : statusFilter,
      searchTerm: searchTerm || undefined,
    },
    initialPage: currentPage,
    autoFetch: true,
    enablePrefetch: true,
    enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
    enableAutoOptimization: true,
  });

  // フィルターオプション
  const statusOptions = [
    { value: 'all', label: '全て' },
    { value: 'proposed', label: '提案中' },
    { value: 'proceed', label: '選考へ進む' },
    { value: 'declined', label: '見送り' },
  ];

  // 検索処理
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    setFilters({ searchTerm: value || undefined });
    setCurrentPage(1);
    setPage(1);
  };

  // ステータスフィルター処理
  const handleStatusFilterChange = (event: any) => {
    const value = event.target.value as ProposalStatus | 'all';
    setStatusFilter(value);
    setFilters({ status: value === 'all' ? undefined : value });
    setCurrentPage(1);
    setPage(1);
  };

  // ページ変更処理
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setPage(newPage);
  };

  // リフレッシュ処理
  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
    setFilters({});
    setPage(1);
    refetch();
  };

  // 提案詳細ページへ遷移（プリフェッチ付き）
  const handleViewDetail = (proposalId: string) => {
    // 遷移前に詳細データをプリフェッチ
    prefetchProposalDetail(proposalId);
    router.push(`/proposals/${proposalId}`);
  };

  // ローディング状態のスケルトン
  const LoadingSkeleton = () => (
    <Grid container spacing={3}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Grid item xs={12} md={6} lg={4} key={index}>
          <Card variant="outlined">
            <CardContent>
              <Skeleton variant="text" width="80%" height={32} />
              <Stack direction="row" spacing={1} sx={{ my: 2 }}>
                <Skeleton variant="rounded" width={80} height={24} />
                <Skeleton variant="rounded" width={100} height={24} />
              </Stack>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="70%" />
            </CardContent>
            <CardActions>
              <Skeleton variant="rounded" width={100} height={36} />
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // 提案カードコンポーネント
  const ProposalCard = ({ proposal }: { proposal: ProposalItemDTO }) => (
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
            minHeight: 56, // 2行分の高さを確保
            display: '-webkit-box',
            '-webkit-line-clamp': 2,
            '-webkit-box-orient': 'vertical',
            overflow: 'hidden',
          }}
        >
          {proposal.projectName}
        </Typography>

        {/* ステータスと未回答質問数 */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip
            label={getProposalStatusLabel(proposal.status)}
            color={getProposalStatusColor(proposal.status) as any}
            size="small"
            sx={{ fontWeight: 'medium' }}
          />
          {proposal.pendingQuestionsCount > 0 && (
            <Chip
              icon={<QuestionIcon sx={{ fontSize: 16 }} />}
              label={`未回答質問 ${proposal.pendingQuestionsCount}件`}
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* 詳細情報 */}
        <Stack spacing={1.5}>
          {/* 想定単価 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              想定単価:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatPriceRange(proposal.minPrice, proposal.maxPrice)}
            </Typography>
          </Box>

          {/* 勤務地 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              勤務地:
            </Typography>
            <Typography 
              variant="body2" 
              fontWeight="medium"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {proposal.workLocation}
            </Typography>
          </Box>

          {/* スキル要件 */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <BusinessIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.2 }} />
            <Typography variant="body2" color="text.secondary">
              スキル:
            </Typography>
            <Typography 
              variant="body2" 
              fontWeight="medium"
              sx={{
                display: '-webkit-box',
                '-webkit-line-clamp': 2,
                '-webkit-box-orient': 'vertical',
                overflow: 'hidden',
                flex: 1,
                lineHeight: 1.4,
              }}
            >
              {proposal.requiredSkills}
            </Typography>
          </Box>

          {/* 提案日時 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              提案日:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatDate(proposal.createdAt)}
            </Typography>
          </Box>

          {/* 回答日時（回答済みの場合） */}
          {proposal.respondedAt && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
              <Typography variant="body2" color="text.secondary">
                回答日:
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatDate(proposal.respondedAt)}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
          {canAccessProposal((proposal as any).userId) ? (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => handleViewDetail(proposal.id)}
            size="small"
          >
            詳細を確認
          </Button>
        ) : (
          <Button
            fullWidth
            variant="outlined"
            disabled
            size="small"
          >
            アクセス権限なし
          </Button>
        )}
      </CardActions>
    </Card>
  );

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="提案情報"
        subtitle="あなたに提案された案件の確認と回答を行います"
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">
                総提案数
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {total}件
              </Typography>
            </Box>
            {/* 開発環境でパフォーマンス情報を表示 */}
            {process.env.NODE_ENV === 'development' && performanceInfo?.cacheSize && (
              <Box sx={{ textAlign: 'right', opacity: 0.7 }}>
                <Typography variant="caption" color="text.secondary">
                  キャッシュ: {performanceInfo.cacheSize.totalQueries}件
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  メモリ: {performanceInfo.cacheSize.estimatedSizeMB.toFixed(2)}MB
                </Typography>
              </Box>
            )}
          </Box>
        }
      />

      {/* フィルター・検索バー */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder="プロジェクト名・スキルで検索..."
        filterValue={statusFilter}
        onFilterChange={handleStatusFilterChange}
        filterLabel="ステータス"
        filterOptions={statusOptions}
        onRefresh={handleRefresh}
        refreshDisabled={isLoading}
      />

      {/* メインコンテンツ */}
      <Box sx={{ mt: 3 }}>
        {isError && (
          <EmptyState
            type="error"
            message="データの取得に失敗しました"
            description="ネットワーク接続を確認してから再度お試しください"
            actions={
              <Button 
                variant="contained" 
                onClick={refetch}
                startIcon={<VisibilityIcon />}
              >
                再読み込み
              </Button>
            }
          />
        )}

        {isLoading && <LoadingSkeleton />}

        {!isLoading && !isError && proposals.length === 0 && (
          <EmptyState
            type="search"
            message="提案が見つかりません"
            description={
              searchTerm || statusFilter !== 'all'
                ? "検索条件を変更してお試しください"
                : "まだ提案された案件はありません"
            }
            actions={
              (searchTerm || statusFilter !== 'all') && (
                <Button 
                  variant="outlined" 
                  onClick={handleRefresh}
                >
                  フィルターをクリア
                </Button>
              )
            }
          />
        )}

        {!isLoading && !isError && proposals.length > 0 && (
          <>
            {/* 提案カード一覧 */}
            <Grid container spacing={3}>
              {proposals.map((proposal) => (
                <Grid item xs={12} md={6} lg={4} key={proposal.id}>
                  <ProposalCard proposal={proposal} />
                </Grid>
              ))}
            </Grid>

            {/* ページネーション */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CommonPagination
                  page={currentPage}
                  totalPages={totalPages}
                  totalCount={total}
                  pageSize={10}
                  onPageChange={handlePageChange}
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
