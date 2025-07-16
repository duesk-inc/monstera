import React from 'react';
import {
  Box,
  Pagination,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  SelectChangeEvent,
  SxProps,
  Theme,
} from '@mui/material';

export interface CommonPaginationProps {
  /** 現在のページ番号 (1ベース) */
  page: number;
  /** 総ページ数 */
  totalPages: number;
  /** 総アイテム数 */
  totalCount: number;
  /** 1ページあたりの表示件数 */
  pageSize: number;
  /** ページ変更時のコールバック */
  onPageChange: (page: number) => void;
  /** ページサイズ変更時のコールバック */
  onPageSizeChange?: (pageSize: number) => void;
  /** ページサイズの選択肢 */
  pageSizeOptions?: number[];
  /** ページサイズセレクターを表示するかどうか */
  showPageSizeSelector?: boolean;
  /** 総件数表示を表示するかどうか */
  showTotalCount?: boolean;
  /** ローディング状態 */
  loading?: boolean;
  /** 無効化状態 */
  disabled?: boolean;
  /** ページネーションのサイズ */
  size?: 'small' | 'medium' | 'large';
  /** ページネーションの色 */
  color?: 'primary' | 'secondary' | 'standard';
  /** ページネーションの形状 */
  variant?: 'text' | 'outlined';
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}

/**
 * 統一ページネーションコンポーネント
 * 
 * 機能:
 * - MUI Paginationベースの統一されたページネーション
 * - ページサイズ選択機能
 * - 総件数表示
 * - アクセシビリティ対応
 * - レスポンシブ対応
 * - 既存実装との完全互換性
 */
export const CommonPagination: React.FC<CommonPaginationProps> = ({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = false,
  showTotalCount = true,
  loading = false,
  disabled = false,
  size = 'medium',
  color = 'primary',
  variant = 'text',
  sx,
  'data-testid': testId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // ページ変更ハンドラー
  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    if (!disabled && !loading) {
      onPageChange(newPage);
    }
  };

  // ページサイズ変更ハンドラー
  const handlePageSizeChange = (event: SelectChangeEvent<number>) => {
    if (!disabled && !loading && onPageSizeChange) {
      const newPageSize = Number(event.target.value);
      onPageSizeChange(newPageSize);
    }
  };

  // 現在の表示範囲を計算
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  // ページネーションが不要な場合は何も表示しない
  if (totalPages <= 1 && !showTotalCount) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        py: 2,
        ...sx,
      }}
      data-testid={testId}
    >
      {/* 総件数表示 */}
      {showTotalCount && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
          <Typography variant="body2" color="text.secondary">
            {totalCount > 0 ? (
              <>
                {startIndex}〜{endIndex}件 / 全{totalCount.toLocaleString()}件
              </>
            ) : (
              '0件'
            )}
          </Typography>
        </Box>
      )}

      {/* ページネーション本体 */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            disabled={disabled || loading}
            size={isMobile ? 'small' : size}
            color={color}
            variant={variant}
            showFirstButton
            showLastButton
            siblingCount={isMobile ? 0 : 1}
            boundaryCount={isMobile ? 1 : 2}
            aria-label="ページネーション"
          />
        </Box>
      )}

      {/* ページサイズセレクター */}
      {showPageSizeSelector && onPageSizeChange && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="page-size-select-label">表示件数</InputLabel>
            <Select
              labelId="page-size-select-label"
              id="page-size-select"
              value={pageSize}
              label="表示件数"
              onChange={handlePageSizeChange}
              disabled={disabled || loading}
            >
              {pageSizeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}件
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
    </Box>
  );
};

export default CommonPagination; 