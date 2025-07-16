'use client';

import React from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField, 
  IconButton,
  SxProps, 
  Theme,
  SelectChangeEvent 
} from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';

export interface FilterOption {
  /** オプションの値 */
  value: string | number;
  /** オプションのラベル */
  label: string;
  /** オプションが無効かどうか */
  disabled?: boolean;
}

export interface FilterBarProps {
  /** 検索フィールドの値 */
  searchValue?: string;
  /** 検索フィールドの変更ハンドラー */
  onSearchChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** 検索フィールドのプレースホルダー */
  searchPlaceholder?: string;
  /** フィルターの値 */
  filterValue?: string | number;
  /** フィルターの変更ハンドラー */
  onFilterChange?: (event: SelectChangeEvent<string | number>) => void;
  /** フィルターのラベル */
  filterLabel?: string;
  /** フィルターのオプション */
  filterOptions?: FilterOption[];
  /** リフレッシュボタンのハンドラー */
  onRefresh?: () => void;
  /** リフレッシュボタンが無効かどうか */
  refreshDisabled?: boolean;
  /** 追加のアクション要素 */
  actions?: React.ReactNode;
  /** レイアウト方向 */
  direction?: 'row' | 'column';
  /** 追加のスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}

/**
 * フィルター・検索バーコンポーネント
 * 統一されたフィルタリング・検索機能を提供
 * 
 * @param searchValue - 検索フィールドの値
 * @param onSearchChange - 検索フィールドの変更ハンドラー
 * @param searchPlaceholder - 検索フィールドのプレースホルダー
 * @param filterValue - フィルターの値
 * @param onFilterChange - フィルターの変更ハンドラー
 * @param filterLabel - フィルターのラベル
 * @param filterOptions - フィルターのオプション
 * @param onRefresh - リフレッシュボタンのハンドラー
 * @param refreshDisabled - リフレッシュボタンが無効かどうか
 * @param actions - 追加のアクション要素
 * @param direction - レイアウト方向（デフォルト: 'row'）
 * @param sx - 追加のスタイル
 * @param data-testid - テストID
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = '検索...',
  filterValue,
  onFilterChange,
  filterLabel = 'フィルター',
  filterOptions = [],
  onRefresh,
  refreshDisabled = false,
  actions,
  direction = 'row',
  sx,
  'data-testid': testId,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: direction === 'column' ? 'column' : { xs: 'column', sm: 'row' },
        alignItems: direction === 'column' ? 'stretch' : { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 2,
        ...sx,
      }}
      data-testid={testId}
    >
      {/* 左側：検索・フィルター */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          flex: 1,
        }}
      >
        {/* 検索フィールド */}
        {onSearchChange && (
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={searchValue || ''}
            onChange={onSearchChange}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
            sx={{ 
              minWidth: { xs: 'auto', sm: 200 },
              // テーマのSELECT_HEIGHTと統一（36px）
              '& .MuiOutlinedInput-root': {
                height: '36px',
              }
            }}
          />
        )}

        {/* フィルター */}
        {onFilterChange && filterOptions.length > 0 && (
          <FormControl 
            size="small" 
            sx={{ 
              minWidth: 150,
              // テーマのSELECT_HEIGHTと統一（36px）
              '& .MuiOutlinedInput-root': {
                height: '36px',
              }
            }}
          >
            <InputLabel>{filterLabel}</InputLabel>
            <Select
              value={filterValue || ''}
              label={filterLabel}
              onChange={onFilterChange}
              data-testid="department-filter"
            >
              {filterOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* 右側：アクション */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexShrink: 0,
        }}
      >
        {/* リフレッシュボタン */}
        {onRefresh && (
          <IconButton
            onClick={onRefresh}
            disabled={refreshDisabled}
            size="small"
            data-testid="refresh-button"
          >
            <RefreshIcon />
          </IconButton>
        )}

        {/* 追加のアクション */}
        {actions}
      </Box>
    </Box>
  );
};

export default FilterBar; 