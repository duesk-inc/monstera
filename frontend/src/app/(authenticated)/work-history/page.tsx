'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Fab,
  Pagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useResponsive } from '../../../hooks/common/useResponsive';
import { useWorkHistoryList, useWorkHistory, useWorkHistoryMasterData } from '../../../hooks/workHistory';
import { useWorkHistoryPDF } from '../../../hooks/workHistory/useWorkHistoryPDF';
import { WorkHistoryCard } from '../../../components/features/workHistory/WorkHistoryCard';
import { WorkHistoryListHeader } from '../../../components/features/workHistory/WorkHistoryListHeader';
import { WorkHistorySearchFilter } from '../../../components/features/workHistory/WorkHistorySearchFilter';
import { WorkHistoryStats } from '../../../components/features/workHistory/WorkHistoryStats';
import { WorkHistoryStateManager } from '../../../components/features/workHistory/WorkHistoryStateManager';
import { Breadcrumbs } from '../../../components/common/Breadcrumbs';
import type { WorkHistoryListParams } from '../../../types/workHistory';

const PageContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
}));

const FloatingAddButton = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(3),
  right: theme.spacing(3),
  zIndex: 1000,
  [theme.breakpoints.down('sm')]: {
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    width: 48,
    height: 48,
  },
}));


const WorkHistoryPage: React.FC = () => {
  const { isMobile, containerMaxWidth, listItemsPerPage } = useResponsive();
  
  // 検索・フィルター状態
  const [searchParams, setSearchParams] = useState<WorkHistoryListParams>({
    page: 1,
    limit: listItemsPerPage, // レスポンシブ対応
    sortBy: 'startDate',
    sortOrder: 'desc',
  });

  // データ取得
  const { data: workHistoryData, isLoading, error, refetch } = useWorkHistoryList({
    params: searchParams,
  });

  const { handleDelete } = useWorkHistory();
  const { industries } = useWorkHistoryMasterData();
  const { downloadPDF, isDownloading } = useWorkHistoryPDF();

  // 検索パラメータ更新
  const handleSearchParamsChange = (newParams: WorkHistoryListParams) => {
    setSearchParams(newParams);
  };

  // ページネーション
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setSearchParams(prev => ({ ...prev, page }));
  };

  // 職務経歴の削除
  const handleDeleteWorkHistory = async (id: string) => {
    if (window.confirm('この職務経歴を削除してもよろしいですか？')) {
      try {
        await handleDelete(id);
        refetch();
      } catch (error) {
        console.error('削除エラー:', error);
      }
    }
  };

  // 職務経歴の編集
  const handleEditWorkHistory = (workHistory: unknown) => {
    // TODO: 編集ダイアログを開く
    console.log('編集:', workHistory);
  };

  // 新規作成
  const handleCreateNew = () => {
    // TODO: 新規作成ダイアログを開く
    console.log('新規作成');
  };

  // PDF出力
  const handleExportPDF = async () => {
    await downloadPDF();
  };

  const workHistories = workHistoryData?.workHistories || [];
  const totalPages = workHistoryData?.total ? Math.ceil(workHistoryData.total / (searchParams.limit || listItemsPerPage)) : 0;

  // 検索・フィルターの状態を判定
  const hasActiveFilters = searchParams.industry || 
                           searchParams.technologies?.length > 0 || 
                           searchParams.startDateFrom || 
                           searchParams.startDateTo ||
                           searchParams.endDateFrom ||
                           searchParams.endDateTo ||
                           searchParams.isActive !== undefined;
  const hasSearchQuery = false; // 検索クエリの実装が完了したら更新

  if (error) {
    return (
      <PageContainer maxWidth={containerMaxWidth}>
        <WorkHistoryStateManager
          error={error}
          errorType="fetch"
          onErrorRetry={refetch}
        >
          <div />
        </WorkHistoryStateManager>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth={containerMaxWidth}>
      {/* ブレッドクラム */}
      <Breadcrumbs 
        items={[
          { label: 'ホーム', href: '/dashboard' },
          { label: '職務経歴' }
        ]}
        sx={{ mb: 2 }}
      />

      {/* ヘッダー */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h4" gutterBottom>
          職務経歴一覧
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="outlined"
            onClick={handleExportPDF}
            disabled={isDownloading}
          >
            PDF出力
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            disabled={isLoading}
          >
            新規作成
          </Button>
        </Box>
      </Box>

      {/* 統計情報 */}
      <WorkHistoryStats
        summary={workHistoryData?.summary}
        itExperience={workHistoryData?.itExperience}
        workHistories={workHistories}
        technologiesExperience={workHistoryData?.technologySkills}
        isLoading={isLoading}
      />

      {/* 検索・フィルター */}
      <WorkHistorySearchFilter
        searchParams={searchParams}
        onSearchParamsChange={handleSearchParamsChange}
        onRefresh={refetch}
        industries={industries}
        isLoading={isLoading}
      />

      {/* 職務経歴一覧 */}
      <WorkHistoryStateManager
        isLoading={isLoading}
        isEmpty={workHistories.length === 0}
        isFiltered={hasActiveFilters}
        hasSearchQuery={hasSearchQuery}
        loadingVariant="list"
        loadingItemCount={3}
        showLoadingHeader={false}
        emptyPrimaryAction={{
          label: '新規作成',
          onClick: handleCreateNew,
          icon: <AddIcon />,
        }}
      >
        <Box>
          {workHistories.map((workHistory) => (
            <WorkHistoryCard
              key={workHistory.id}
              workHistory={workHistory}
              onEdit={handleEditWorkHistory}
              onDelete={handleDeleteWorkHistory}
              showActions={true}
              compact={isMobile} // モバイルではコンパクト表示
            />
          ))}
          
          {/* ページネーション */}
          {totalPages > 1 && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mt: isMobile ? 2 : 3,
              px: isMobile ? 1 : 0,
            }}>
              <Pagination
                count={totalPages}
                page={searchParams.page || 1}
                onChange={handlePageChange}
                color="primary"
                size={isMobile ? 'medium' : 'large'}
                siblingCount={isMobile ? 0 : 1} // モバイルでは省スペース
                boundaryCount={1}
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontSize: isMobile ? '0.875rem' : undefined,
                    minWidth: isMobile ? 32 : undefined,
                    height: isMobile ? 32 : undefined,
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </WorkHistoryStateManager>

      {/* フローティング追加ボタン */}
      <FloatingAddButton
        color="primary"
        aria-label="新規作成"
        onClick={handleCreateNew}
        size={isMobile ? 'medium' : 'large'}
      >
        <AddIcon sx={{ fontSize: isMobile ? '1.25rem' : undefined }} />
      </FloatingAddButton>
    </PageContainer>
  );
};

export default WorkHistoryPage;