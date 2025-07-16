import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  LinearProgress,
  Stack,
  Button,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import {
  ViewList as ListIcon,
  ViewModule as GridIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { AccessibleWorkHistoryCard } from './AccessibleWorkHistoryCard';
import { WorkHistoryItem, WorkHistoryListParams } from '../../../types/workHistory';
import { useAriaAttributes, useKeyboardNavigation } from '../../../hooks/accessibility/useAccessibility';
import { useFocusManagement, useLiveRegion } from '../../../hooks/accessibility/useFocusManagement';

interface AccessibleWorkHistoryListProps {
  workHistories: WorkHistoryItem[];
  isLoading?: boolean;
  error?: Error | null;
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  searchParams?: WorkHistoryListParams;
  onEdit?: (workHistory: WorkHistoryItem) => void;
  onDelete?: (workHistory: WorkHistoryItem) => void;
  onView?: (workHistory: WorkHistoryItem) => void;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  onRefresh?: () => void;
  onFilter?: () => void;
}

export const AccessibleWorkHistoryList: React.FC<AccessibleWorkHistoryListProps> = ({
  workHistories = [],
  isLoading = false,
  error,
  totalCount = 0,
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 10,
  searchParams,
  onEdit,
  onDelete,
  onView,
  onPageChange,
  onItemsPerPageChange,
  onRefresh,
  onFilter,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const { getListAttributes, getButtonAttributes, getStatusAttributes } = useAriaAttributes();
  const { handleArrowNavigation, handleActionKeys } = useKeyboardNavigation();
  const { focusFirstElement, restoreFocus, saveFocus } = useFocusManagement();
  const { announce } = useLiveRegion();

  // アクティブなフィルターの数を計算
  const activeFiltersCount = React.useMemo(() => {
    if (!searchParams) return 0;
    let count = 0;
    if (searchParams.industry) count++;
    if (searchParams.technologies?.length) count++;
    if (searchParams.startDateFrom) count++;
    if (searchParams.startDateTo) count++;
    if (searchParams.endDateFrom) count++;
    if (searchParams.endDateTo) count++;
    if (searchParams.isActive !== undefined) count++;
    return count;
  }, [searchParams]);

  // リストのキーボードナビゲーション
  const handleListKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (workHistories.length === 0) return;

    const moveToNext = () => {
      const newIndex = focusedIndex < workHistories.length - 1 ? focusedIndex + 1 : 0;
      setFocusedIndex(newIndex);
      const cardElement = listRef.current?.children[newIndex] as HTMLElement;
      const focusableElement = cardElement?.querySelector('[tabindex="0"]') as HTMLElement;
      focusableElement?.focus();
    };

    const moveToPrevious = () => {
      const newIndex = focusedIndex > 0 ? focusedIndex - 1 : workHistories.length - 1;
      setFocusedIndex(newIndex);
      const cardElement = listRef.current?.children[newIndex] as HTMLElement;
      const focusableElement = cardElement?.querySelector('[tabindex="0"]') as HTMLElement;
      focusableElement?.focus();
    };

    const moveToFirst = () => {
      setFocusedIndex(0);
      const cardElement = listRef.current?.children[0] as HTMLElement;
      const focusableElement = cardElement?.querySelector('[tabindex="0"]') as HTMLElement;
      focusableElement?.focus();
    };

    const moveToLast = () => {
      const lastIndex = workHistories.length - 1;
      setFocusedIndex(lastIndex);
      const cardElement = listRef.current?.children[lastIndex] as HTMLElement;
      const focusableElement = cardElement?.querySelector('[tabindex="0"]') as HTMLElement;
      focusableElement?.focus();
    };

    handleArrowNavigation(event, moveToNext, moveToPrevious, moveToFirst, moveToLast);
  }, [focusedIndex, workHistories.length, handleArrowNavigation]);

  // ページ変更時のアクセシビリティ処理
  const handlePageChangeWithA11y = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    saveFocus();
    onPageChange?.(page);
    announce(`ページ ${page} に移動しました`, 'polite');
    
    // ページが変更されたら最初の要素にフォーカス
    setTimeout(() => {
      focusFirstElement(listRef.current);
      setFocusedIndex(0);
    }, 100);
  }, [onPageChange, announce, saveFocus, focusFirstElement]);

  // アイテム数変更時の処理
  const handleItemsPerPageChangeWithA11y = useCallback((itemsPerPage: number) => {
    onItemsPerPageChange?.(itemsPerPage);
    announce(`1ページあたり ${itemsPerPage} 件に変更しました`, 'polite');
  }, [onItemsPerPageChange, announce]);

  // 更新時の処理
  const handleRefreshWithA11y = useCallback(() => {
    onRefresh?.();
    announce('データを更新しています', 'polite');
  }, [onRefresh, announce]);

  // フィルター開く時の処理
  const handleFilterWithA11y = useCallback(() => {
    onFilter?.();
    announce('フィルター設定を開きました', 'polite');
  }, [onFilter, announce]);

  // データ読み込み完了時のアナウンス
  useEffect(() => {
    if (!isLoading && workHistories.length > 0) {
      announce(`${workHistories.length} 件の職務経歴が表示されました`, 'polite');
    }
  }, [isLoading, workHistories.length, announce]);

  // エラー時のアナウンス
  useEffect(() => {
    if (error) {
      announce('データの読み込みでエラーが発生しました', 'assertive');
    }
  }, [error, announce]);

  // ARIA属性
  const listAttributes = getListAttributes(totalCount, currentPage, totalPages);

  // ローディング状態
  if (isLoading) {
    return (
      <Box {...getStatusAttributes('loading', 'データを読み込んでいます')}>
        <LinearProgress aria-describedby="loading-description" />
        <Typography id="loading-description" variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
          職務経歴データを読み込んでいます...
        </Typography>
      </Box>
    );
  }

  // エラー状態
  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={handleRefreshWithA11y}
            startIcon={<RefreshIcon />}
            {...getButtonAttributes('再読み込み')}
          >
            再試行
          </Button>
        }
        {...getStatusAttributes('error', 'データの読み込みでエラーが発生しました')}
      >
        データの取得に失敗しました。{error.message}
      </Alert>
    );
  }

  // 空の状態
  if (workHistories.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" gutterBottom>
          職務経歴がありません
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {activeFiltersCount > 0 
            ? 'フィルター条件に一致する職務経歴が見つかりませんでした。'
            : 'まだ職務経歴が登録されていません。新規作成から追加してください。'
          }
        </Typography>
        {activeFiltersCount > 0 && (
          <Button
            variant="outlined"
            onClick={handleFilterWithA11y}
            startIcon={<FilterIcon />}
            {...getButtonAttributes('フィルター設定を変更')}
          >
            フィルターを変更
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {/* ヘッダー情報 */}
      <Box mb={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h6" component="h2">
              職務経歴一覧
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalCount} 件中 {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} 件を表示
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            {/* アクティブフィルター表示 */}
            {activeFiltersCount > 0 && (
              <Chip
                label={`フィルター: ${activeFiltersCount}`}
                size="small"
                color="primary"
                variant="outlined"
                onClick={handleFilterWithA11y}
                aria-label={`${activeFiltersCount} 個のフィルターが適用されています。クリックして変更できます。`}
              />
            )}

            {/* 更新ボタン */}
            <Button
              variant="outlined"
              size="small"
              onClick={handleRefreshWithA11y}
              startIcon={<RefreshIcon />}
              {...getButtonAttributes('データを更新')}
            >
              更新
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* 職務経歴リスト */}
      <Box
        ref={listRef}
        onKeyDown={handleListKeyDown}
        {...listAttributes}
      >
        {workHistories.map((workHistory, index) => (
          <AccessibleWorkHistoryCard
            key={workHistory.id}
            workHistory={workHistory}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            index={index}
            totalItems={workHistories.length}
            showActions={true}
            compact={false}
          />
        ))}
      </Box>

      {/* ページネーション */}
      {totalPages > 1 && (
        <Box mt={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            {/* 表示件数選択 */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="items-per-page-label">表示件数</InputLabel>
              <Select
                labelId="items-per-page-label"
                value={itemsPerPage}
                label="表示件数"
                onChange={(e) => handleItemsPerPageChangeWithA11y(Number(e.target.value))}
                aria-describedby="items-per-page-description"
              >
                <MenuItem value={10}>10件</MenuItem>
                <MenuItem value={20}>20件</MenuItem>
                <MenuItem value={50}>50件</MenuItem>
              </Select>
              <Typography
                id="items-per-page-description"
                variant="caption"
                sx={{ mt: 0.5, display: 'block' }}
              >
                1ページあたりの表示件数を選択
              </Typography>
            </FormControl>

            {/* ページネーション */}
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChangeWithA11y}
              color="primary"
              showFirstButton
              showLastButton
              aria-label="職務経歴一覧のページナビゲーション"
              sx={{
                '& .MuiPaginationItem-root': {
                  '&:focus': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: '2px',
                  },
                },
              }}
            />
          </Stack>

          {/* ページ情報を隠しテキストで提供 */}
          <Typography
            id={`pagination-info-${currentPage}-${totalPages}`}
            variant="caption"
            sx={{
              position: 'absolute',
              left: '-10000px',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
            }}
          >
            {totalPages} ページ中 {currentPage} ページ目を表示中
          </Typography>
        </Box>
      )}
    </Box>
  );
};