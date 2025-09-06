'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress,
  createFilterOptions,
} from '@mui/material';
import { VerifiedUser as VerifiedIcon } from '@mui/icons-material';
import { fetchCommonCertifications } from '@/lib/api/profile';
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';

interface CommonCertification {
  id: string;
  name: string;
  category?: string;
  isCommon: boolean;
  displayOrder: number;
}

interface CertificationInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  /** プロフィールが保存済みかどうか（一時保存または更新済み） */
  isSaved?: boolean;
  /** 既に選択されている資格名のリスト（重複チェック用） */
  existingCertifications?: string[];
  /** 現在編集中のインデックス（自分自身を除外するため） */
  currentIndex?: number;
}

/**
 * 資格入力コンポーネント
 * よく使う資格の選択とカスタム入力の両方に対応
 */
export const CertificationInput: React.FC<CertificationInputProps> = ({
  value,
  onChange,
  onBlur,
  error,
  helperText,
  disabled,
  required,
  isSaved = false,
  existingCertifications = [],
  currentIndex,
}) => {
  const [commonCertifications, setCommonCertifications] = useState<CommonCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState(value || '');

  // よく使う資格を取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchCommonCertifications();
        console.log('よく使う資格一覧:', data); // デバッグ用
        setCommonCertifications(data);
        DebugLogger.info(
          { category: 'UI', operation: 'LoadCommonCertifications' },
          'よく使う資格一覧取得完了',
          { count: data.length, data }
        );
      } catch (error) {
        console.error('資格一覧取得エラー:', error); // デバッグ用
        DebugLogger.error(
          { category: DEBUG_CATEGORIES.UI, operation: DEBUG_OPERATIONS.READ },
          'よく使う資格一覧取得エラー',
          error
        );
        // エラーがあっても続行（カスタム入力は可能）
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 入力値が変更されたら親コンポーネントに通知
  useEffect(() => {
    if (inputValue !== value) {
      onChange(inputValue);
    }
  }, [inputValue, onChange, value]);

  // カテゴリごとにグループ化
  const groupedOptions = useMemo(() => {
    const groups: { [key: string]: CommonCertification[] } = {};
    
    commonCertifications.forEach((cert) => {
      const category = cert.category || 'その他';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(cert);
    });

    return groups;
  }, [commonCertifications]);

  // カスタム入力かどうかを判定
  const isCustomInput = useMemo(() => {
    if (!inputValue) return false;
    return !commonCertifications.some(cert => cert.name === inputValue);
  }, [inputValue, commonCertifications]);
  
  // マスタ資格の重複チェック
  const isDuplicate = useMemo(() => {
    if (!inputValue || isCustomInput) return false;
    
    // 自分自身は除外して重複チェック
    const otherCertifications = existingCertifications.filter((_, index) => index !== currentIndex);
    
    // マスタ資格かつ既に選択されているかチェック
    const isCommonCert = commonCertifications.some(cert => cert.name === inputValue);
    if (isCommonCert) {
      return otherCertifications.includes(inputValue);
    }
    
    return false;
  }, [inputValue, isCustomInput, existingCertifications, currentIndex, commonCertifications]);

  // 部分一致検索を有効にするフィルターオプション
  const filterOptions = createFilterOptions<CommonCertification | string>({
    matchFrom: 'any', // 部分一致を有効にする
    stringify: (option) => {
      if (typeof option === 'string') {
        return option;
      }
      return option.name;
    },
    limit: 50, // パフォーマンスのため表示件数を制限
  });

  return (
    <Autocomplete<string | CommonCertification, false, false, true>
      value={commonCertifications.find(cert => cert.name === value) || value}
      onChange={(_, newValue) => {
        if (typeof newValue === 'string') {
          onChange(newValue);
        } else if (newValue && typeof newValue === 'object') {
          onChange(newValue.name);
        } else {
          onChange('');
        }
      }}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
      }}
      options={commonCertifications as Array<string | CommonCertification>}
      filterOptions={(options, state) => {
        console.log('フィルタリング:', {
          inputValue: state.inputValue,
          optionsCount: options.length,
          filteredOptions: filterOptions(options, state)
        });
        return filterOptions(options, state);
      }}
      groupBy={(option) => (typeof option === 'string' ? 'その他' : option.category || 'その他')}
      getOptionLabel={(option) => {
        if (typeof option === 'string') {
          return option;
        }
        return option.name;
      }}
      isOptionEqualToValue={(option, value) => {
        const optName = typeof option === 'string' ? option : option.name;
        const valName = typeof value === 'string' ? value : value.name;
        return optName === valName;
      }}
      freeSolo
      loading={loading}
      disabled={disabled}
      onBlur={onBlur}
      renderOption={(props, option) => (
        <li {...props}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {typeof option === 'string' ? option : option.name}
            </Typography>
            {typeof option !== 'string' && option.isCommon && (
              <VerifiedIcon 
                sx={{ 
                  fontSize: 16, 
                  color: 'primary.main',
                  opacity: 0.7
                }} 
              />
            )}
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="資格名"
          required={required}
          error={error || isDuplicate}
          helperText={
            loading ? '資格一覧を読み込み中...' :
            isDuplicate ? '既に選択されている資格です' :
            isCustomInput && !isSaved ? '新しい資格として登録されます' :
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
      renderGroup={(params) => (
        <Box key={params.key}>
          <Box
            sx={{
              position: 'sticky',
              top: -8,
              padding: '8px 16px',
              backgroundColor: 'background.paper',
              borderBottom: 1,
              borderColor: 'divider',
              zIndex: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              {params.group}
            </Typography>
          </Box>
          <Box>{params.children}</Box>
        </Box>
      )}
      sx={{
        '& .MuiAutocomplete-groupLabel': {
          backgroundColor: 'grey.100',
          fontWeight: 'bold',
        },
      }}
    />
  );
};

export default CertificationInput;
