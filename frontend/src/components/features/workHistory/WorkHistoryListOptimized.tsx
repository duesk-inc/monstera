import React, { useState, useCallback, useMemo, useTransition, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Button,
  CircularProgress,
  Fade,
  Alert,
  Chip,
  SelectChangeEvent,
  IconButton,
} from '@mui/material';
import {
  ViewList as ListIcon,
  ViewModule as GridIcon,
  Speed as SpeedIcon,
  Accessibility as AccessibilityIcon,
} from '@mui/icons-material';
import { VirtualizedWorkHistoryList } from './VirtualizedWorkHistoryList';
import { WorkHistoryGrid } from './WorkHistoryGrid';
import { WorkHistoryPagination } from './WorkHistoryPagination';
import { AccessibleWorkHistoryList } from './AccessibleWorkHistoryList';
import { useWorkHistoryOptimized } from '@/hooks/workHistory/useWorkHistoryOptimized';
import { useWorkHistoryPagination } from '@/hooks/workHistory/useWorkHistoryPagination';
import { useWorkHistoryInfiniteScroll } from '@/hooks/workHistory/useWorkHistoryInfiniteScroll';
import { WorkHistoryItem, WorkHistorySearchParams } from '@/types/workHistory';
import { useAccessibility, useAriaAttributes } from '@/hooks/accessibility/useAccessibility';
import { useLiveRegion } from '@/hooks/accessibility/useFocusManagement';

type ViewMode = 'list' | 'grid';
type LoadMode = 'pagination' | 'infinite' | 'virtualized';
type AccessibilityMode = 'standard' | 'enhanced';

interface WorkHistoryListOptimizedProps {
  searchParams?: WorkHistorySearchParams;
  onEdit?: (workHistory: WorkHistoryItem) => void;
  onDelete?: (workHistory: WorkHistoryItem) => void;
  onView?: (workHistory: WorkHistoryItem) => void;
}

export const WorkHistoryListOptimized: React.FC<WorkHistoryListOptimizedProps> = ({
  searchParams = {},
  onEdit,
  onDelete,
  onView,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loadMode, setLoadMode] = useState<LoadMode>('pagination');
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>('standard');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isPending, startTransition] = useTransition();
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { isKeyboardUser } = useAccessibility();
  const { getListAttributes } = useAriaAttributes();
  const { announce } = useLiveRegion();

  // 通常のデータ取得（ページネーション・仮想化用）
  const {
    workHistories,
    isLoading,
    isError,
    error,
    refetch,
    memoizedData,
    performanceMetrics,
  } = useWorkHistoryOptimized({
    searchParams,
    enableCaching: true,
  });

  // ページネーション
  const pagination = useWorkHistoryPagination({
    data: workHistories,
    itemsPerPage,
    enableVirtualization: loadMode === 'virtualized',
    virtualizedThreshold: 100,
  });

  // 無限スクロール
  const infiniteScroll = useWorkHistoryInfiniteScroll({
    searchParams,
    itemsPerPage,
    enabled: loadMode === 'infinite',
  });

  // ビューモード変更
  const handleViewModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
      if (newMode !== null) {
        startTransition(() => {
          setViewMode(newMode);
        });
      }
    },
    []
  );

  // ロードモード変更
  const handleLoadModeChange = useCallback(
    (event: SelectChangeEvent<LoadMode>) => {
      startTransition(() => {
        setLoadMode(event.target.value as LoadMode);
      });
    },
    []
  );

  // アクセシビリティモード変更
  const handleAccessibilityModeChange = useCallback(() => {
    const newMode = accessibilityMode === 'standard' ? 'enhanced' : 'standard';
    setAccessibilityMode(newMode);
    announce(
      newMode === 'enhanced' 
        ? 'アクセシビリティ強化モードを有効にしました' 
        : '標準モードに戻しました',
      'polite'
    );
  }, [accessibilityMode, announce]);

  // 表示するデータの選択
  const displayData = useMemo(() => {
    switch (loadMode) {
      case 'infinite':
        return infiniteScroll.workHistories;
      case 'virtualized':
        return workHistories;
      case 'pagination':
      default:
        return pagination.paginatedData;
    }
  }, [loadMode, infiniteScroll.workHistories, workHistories, pagination.paginatedData]);

  // ローディング状態の判定
  const isDataLoading = loadMode === 'infinite' ? infiniteScroll.isLoading : isLoading;
  const hasError = loadMode === 'infinite' ? infiniteScroll.isError : isError;
  const errorMessage = loadMode === 'infinite' ? infiniteScroll.error : error;

  // パフォーマンス情報の表示
  const showPerformanceInfo = process.env.NODE_ENV === 'development';

  // アクセシビリティモード自動検出
  useEffect(() => {
    if (isKeyboardUser && accessibilityMode === 'standard') {
      setAccessibilityMode('enhanced');
      announce('キーボード操作を検出しました。アクセシビリティ強化モードを自動で有効にしました', 'polite');
    }
  }, [isKeyboardUser, accessibilityMode, announce]);

  return (
    <Container maxWidth="lg" ref={containerRef}>
      <Stack spacing={3}>
        {/* ヘッダー */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Typography variant="h5" component="h2">
            職務経歴一覧
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center">
            {/* ロードモード選択 */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>読み込み方式</InputLabel>
              <Select
                value={loadMode}
                onChange={handleLoadModeChange}
                label="読み込み方式"
              >
                <MenuItem value="pagination">ページネーション</MenuItem>
                <MenuItem value="infinite">無限スクロール</MenuItem>
                <MenuItem value="virtualized">仮想スクロール</MenuItem>
              </Select>
            </FormControl>

            {/* アクセシビリティモード切り替え */}
            <IconButton
              onClick={handleAccessibilityModeChange}
              color={accessibilityMode === 'enhanced' ? 'primary' : 'default'}
              aria-label={
                accessibilityMode === 'enhanced' 
                  ? 'アクセシビリティ強化モードを無効にする' 
                  : 'アクセシビリティ強化モードを有効にする'
              }
              title={
                accessibilityMode === 'enhanced' 
                  ? 'アクセシビリティ強化モード (有効)' 
                  : 'アクセシビリティ強化モード (無効)'
              }
            >
              <AccessibilityIcon />
            </IconButton>

            {/* ビューモード切り替え */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
              aria-label="表示モード選択"
            >
              <ToggleButton value="list" aria-label="リスト表示">
                <ListIcon />
              </ToggleButton>
              <ToggleButton value="grid" aria-label="グリッド表示">
                <GridIcon />
              </ToggleButton>
            </ToggleButtonGroup>

            {/* リフレッシュボタン */}
            <Button
              variant="outlined"
              onClick={() => {
                if (loadMode === 'infinite') {
                  infiniteScroll.refetch();
                } else {
                  refetch();
                }
              }}
              disabled={isDataLoading}
            >
              更新
            </Button>
          </Stack>
        </Box>

        {/* パフォーマンス情報（開発環境のみ） */}
        {showPerformanceInfo && (
          <Alert severity="info" icon={<SpeedIcon />}>
            <Stack direction="row" spacing={2}>
              <Chip
                label={`レンダリング回数: ${performanceMetrics.renderCount}`}
                size="small"
              />
              <Chip
                label={`平均レンダリング時間: ${performanceMetrics.averageRenderTime.toFixed(2)}ms`}
                size="small"
              />
              <Chip
                label={`データ数: ${displayData.length}件`}
                size="small"
              />
              <Chip
                label={loadMode === 'virtualized' ? '仮想化: ON' : '仮想化: OFF'}
                size="small"
                color={loadMode === 'virtualized' ? 'success' : 'default'}
              />
            </Stack>
          </Alert>
        )}

        {/* エラー表示 */}
        {hasError && (
          <Alert severity="error">
            {errorMessage?.message || 'データの取得に失敗しました'}
          </Alert>
        )}

        {/* コンテンツ */}
        <Fade in={!isPending} timeout={300}>
          <Box sx={{ position: 'relative', minHeight: 400 }} {...getListAttributes(displayData.length)}>
            {isDataLoading ? (
              <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                minHeight={400}
                role="status"
                aria-live="polite"
              >
                <CircularProgress aria-describedby="loading-text" />
                <Typography id="loading-text" sx={{ ml: 2 }}>
                  読み込み中...
                </Typography>
              </Box>
            ) : (
              <>
                {accessibilityMode === 'enhanced' ? (
                  <AccessibleWorkHistoryList
                    workHistories={displayData}
                    isLoading={isDataLoading}
                    error={hasError ? errorMessage : null}
                    totalCount={workHistories.length}
                    currentPage={1}
                    totalPages={1}
                    itemsPerPage={itemsPerPage}
                    searchParams={searchParams}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onView={onView}
                    onPageChange={(page) => {
                      // ページ変更処理
                    }}
                    onItemsPerPageChange={(items) => {
                      setItemsPerPage(items);
                    }}
                    onRefresh={() => {
                      if (loadMode === 'infinite') {
                        infiniteScroll.refetch();
                      } else {
                        refetch();
                      }
                    }}
                  />
                ) : viewMode === 'list' && loadMode === 'virtualized' ? (
                  <Box sx={{ height: 600 }}>
                    <VirtualizedWorkHistoryList
                      workHistories={displayData}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onView={onView}
                    />
                  </Box>
                ) : viewMode === 'grid' ? (
                  <WorkHistoryGrid
                    workHistories={displayData}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onView={onView}
                  />
                ) : (
                  <Stack spacing={2}>
                    {displayData.map((workHistory) => (
                      <Box key={workHistory.id}>
                        {/* 通常のリスト表示コンポーネント */}
                      </Box>
                    ))}
                  </Stack>
                )}

                {/* 無限スクロールのローディングインジケーター */}
                {loadMode === 'infinite' && (
                  <>
                    <Box
                      ref={infiniteScroll.loadMoreRef}
                      sx={{ height: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                      {infiniteScroll.isFetchingNextPage && <CircularProgress />}
                    </Box>
                    {!infiniteScroll.hasNextPage && displayData.length > 0 && (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                        すべての職務経歴を表示しました
                      </Typography>
                    )}
                  </>
                )}
              </>
            )}
          </Box>
        </Fade>

        {/* ページネーション */}
        {loadMode === 'pagination' && !isDataLoading && displayData.length > 0 && (
          <WorkHistoryPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.goToPage}
            itemsPerPage={pagination.itemsPerPage}
            onItemsPerPageChange={pagination.setItemsPerPage}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
          />
        )}
      </Stack>
    </Container>
  );
};