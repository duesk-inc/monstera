'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDebouncedCallback } from '@/hooks/common/useDebouncedCallback';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  CircularProgress,
  createFilterOptions,
} from '@mui/material';
import { Build as TechIcon } from '@mui/icons-material';
import { fetchTechnologyCategories } from '@/lib/api/profile';
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';
import { AUTOCOMPLETE } from '@/constants/ui';
import { TECHNOLOGY_OPTIONS, TECHNOLOGY_CATEGORIES } from '@/data/technologies';

interface TechnologyCategory {
  id: string;
  name: string;
  displayName: string;
  sortOrder: number;
}

interface TechnologyInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  /** 技術カテゴリ名（programming_languages, servers_databases, tools） */
  categoryName: 'programming_languages' | 'servers_databases' | 'tools';
  /** 技術入力欄のラベル */
  label: string;
  /** プレースホルダーテキスト */
  placeholder?: string;
}

/**
 * 技術入力コンポーネント
 * マスタデータからの選択とカスタム入力の両方に対応
 */
export const TechnologyInput: React.FC<TechnologyInputProps> = ({
  value,
  onChange,
  onBlur,
  error,
  helperText,
  disabled,
  required,
  categoryName,
  label,
  placeholder,
}) => {
  const [technologyCategories, setTechnologyCategories] = useState<TechnologyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');

  // 入力通知をデバウンスして上位への通知頻度を抑制
  const debouncedNotifyChange = useDebouncedCallback((val: string) => {
    onChange(val);
  }, 300);

  // 技術カテゴリーマスタを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchTechnologyCategories();
        setTechnologyCategories(data);
        DebugLogger.info(
          { category: 'UI', operation: 'LoadTechnologyCategories' },
          '技術カテゴリー一覧取得完了',
          { count: data.length, data }
        );
      } catch (error) {
        DebugLogger.error(
          { category: DEBUG_CATEGORIES.UI, operation: DEBUG_OPERATIONS.READ },
          '技術カテゴリー一覧取得エラー',
          error
        );
        // エラーがあっても続行（カスタム入力は可能）
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // valueが変更されたらinputValueも同期（初期値設定とリセット時のため）
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // 該当カテゴリーの技術リストを取得
  const technologyOptions = useMemo<string[]>(() => {
    // TODO: 実際の実装では、選択された技術項目のマスタデータをAPIから取得する
    // 現在はマスターデータから取得
    const src = TECHNOLOGY_OPTIONS[categoryName as keyof typeof TECHNOLOGY_OPTIONS] || [];
    return [...src];
  }, [categoryName]);

  // カスタム入力かどうかを判定
  const isCustomInput = useMemo(() => {
    if (!inputValue) return false;
    return !technologyOptions.includes(inputValue);
  }, [inputValue, technologyOptions]);

  // 部分一致検索を有効にするフィルターオプション
  const filterOptions = createFilterOptions<string>({
    matchFrom: 'any', // 部分一致を有効にする
    limit: AUTOCOMPLETE.DISPLAY_LIMIT,
  });

  return (
    <Autocomplete<string, false, false, true>
      value={value}
      onChange={(_, newValue) => {
        onChange(newValue || '');
      }}
      inputValue={inputValue}
      onInputChange={(_, newInputValue, reason) => {
        setInputValue(newInputValue);
        if (reason === 'input') {
          onChange(newInputValue);
        }
      }}
      options={[...technologyOptions]}
      filterOptions={(opts, st) => filterOptions(opts, st)}
      getOptionLabel={(option) => option}
      isOptionEqualToValue={(option, value) => option === value}
      freeSolo
      loading={loading}
      disabled={disabled}
      onBlur={onBlur}
      renderOption={(props, option) => (
        <li {...props}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {option}
            </Typography>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error}
          helperText={
            loading ? '技術一覧を読み込み中...' :
            isCustomInput ? '新しい技術として入力されます' :
            helperText
          }
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress color="inherit" size={20} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      sx={{
        '& .MuiAutocomplete-option': {
          padding: '8px 16px',
        },
      }}
    />
  );
};

export default TechnologyInput;
