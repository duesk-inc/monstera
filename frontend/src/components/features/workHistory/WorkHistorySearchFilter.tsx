import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Collapse,
  Grid,
  Chip,
  Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useResponsive } from '../../../hooks/common/useResponsive';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { styled } from '@mui/material/styles';
import { useDebouncedCallback } from '../../../hooks/common/useDebouncedCallback';
import type { WorkHistoryListParams } from '../../../types/workHistory';

const FilterContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
  },
}));

const MainFilterRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
  flexWrap: 'wrap',
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(1),
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

const AdvancedFilterSection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const FilterChipsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(1),
}));

interface WorkHistorySearchFilterProps {
  searchParams: WorkHistoryListParams;
  onSearchParamsChange: (params: WorkHistoryListParams) => void;
  onRefresh: () => void;
  industries?: Array<{ id: number; name: string; displayName: string }>;
  isLoading?: boolean;
}

interface SearchState {
  searchQuery: string;
  selectedIndustry: string;
  selectedTechnologies: string[];
  startDateFrom: Date | null;
  startDateTo: Date | null;
  endDateFrom: Date | null;
  endDateTo: Date | null;
  isActive: string; // 'all' | 'active' | 'completed'
}

const INITIAL_SEARCH_STATE: SearchState = {
  searchQuery: '',
  selectedIndustry: '',
  selectedTechnologies: [],
  startDateFrom: null,
  startDateTo: null,
  endDateFrom: null,
  endDateTo: null,
  isActive: 'all',
};

// よく使われる技術の例（実際はAPIから取得）
const POPULAR_TECHNOLOGIES = [
  'Java', 'TypeScript', 'React', 'Python', 'JavaScript',
  'Spring Boot', 'Node.js', 'MySQL', 'PostgreSQL', 'AWS',
  'Docker', 'Git', 'Vue.js', 'Angular', 'C#',
];

export const WorkHistorySearchFilter: React.FC<WorkHistorySearchFilterProps> = ({
  searchParams,
  onSearchParamsChange,
  onRefresh,
  industries = [],
  isLoading = false,
}) => {
  const [searchState, setSearchState] = useState<SearchState>(INITIAL_SEARCH_STATE);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { isMobile } = useResponsive();

  // デバウンス付き検索実行
  const debouncedSearch = useDebouncedCallback(
    () => {
      const newParams: WorkHistoryListParams = {
        ...searchParams,
        page: 1, // 検索時は最初のページに戻る
      };

      // 検索クエリがある場合のみ追加
      // if (state.searchQuery.trim()) {
      //   newParams.search = state.searchQuery.trim();
      // }

      // 業種フィルター
      // if (state.selectedIndustry) {
      //   newParams.industry = [parseInt(state.selectedIndustry)];
      // }

      // 技術フィルター
      // if (state.selectedTechnologies.length > 0) {
      //   newParams.technologies = state.selectedTechnologies;
      // }

      // 日付フィルター
      // if (state.startDateFrom) {
      //   newParams.startDateFrom = state.startDateFrom.toISOString().split('T')[0];
      // }
      // if (state.startDateTo) {
      //   newParams.startDateTo = state.startDateTo.toISOString().split('T')[0];
      // }
      // if (state.endDateFrom) {
      //   newParams.endDateFrom = state.endDateFrom.toISOString().split('T')[0];
      // }
      // if (state.endDateTo) {
      //   newParams.endDateTo = state.endDateTo.toISOString().split('T')[0];
      // }

      // アクティブ状態フィルター
      // if (state.isActive !== 'all') {
      //   newParams.isActive = state.isActive === 'active';
      // }

      onSearchParamsChange(newParams);
    },
    500 // 500msデバウンス
  );

  // 検索状態の更新
  const updateSearchState = (updates: Partial<SearchState>) => {
    setSearchState(prev => {
      const newState = { ...prev, ...updates };
      debouncedSearch();
      return newState;
    });
  };

  // 検索クリア
  const handleClearSearch = () => {
    setSearchState(INITIAL_SEARCH_STATE);
    onSearchParamsChange({
      page: 1,
      limit: searchParams.limit,
      sortBy: searchParams.sortBy,
      sortOrder: searchParams.sortOrder,
    });
  };

  // ソート変更
  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('_');
    onSearchParamsChange({
      ...searchParams,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
    });
  };

  // 表示件数変更
  const handleLimitChange = (limit: number) => {
    onSearchParamsChange({
      ...searchParams,
      limit,
      page: 1,
    });
  };

  // アクティブなフィルター数の計算
  const activeFiltersCount = [
    searchState.searchQuery,
    searchState.selectedIndustry,
    searchState.selectedTechnologies.length > 0,
    searchState.startDateFrom,
    searchState.startDateTo,
    searchState.endDateFrom,
    searchState.endDateTo,
    searchState.isActive !== 'all',
  ].filter(Boolean).length;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <FilterContainer>
        {/* メイン検索行 */}
        <MainFilterRow>
          <TextField
            placeholder={isMobile ? "プロジェクト名で検索..." : "プロジェクト名、技術名、業務内容で検索..."}
            value={searchState.searchQuery}
            onChange={(e) => updateSearchState({ searchQuery: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: isMobile ? '1.25rem' : undefined }} />
                </InputAdornment>
              ),
            }}
            sx={{ 
              minWidth: isMobile ? 'auto' : 300, 
              flex: 1,
              width: isMobile ? '100%' : 'auto',
            }}
            disabled={isLoading}
            size={isMobile ? 'small' : 'medium'}
            fullWidth={isMobile}
          />

          <Box sx={{
            display: 'flex',
            gap: isMobile ? 1 : 2,
            width: isMobile ? '100%' : 'auto',
            flexDirection: isMobile ? 'row' : 'row',
          }}>
            <FormControl sx={{ 
              minWidth: isMobile ? 'auto' : 150,
              flex: isMobile ? 1 : 'none',
            }}>
              <InputLabel size={isMobile ? 'small' : 'normal'}>業種</InputLabel>
              <Select
                value={searchState.selectedIndustry}
                onChange={(e) => updateSearchState({ selectedIndustry: e.target.value })}
                label="業種"
                disabled={isLoading}
                size={isMobile ? 'small' : 'medium'}
              >
                <MenuItem value="">すべて</MenuItem>
                {industries.map((industry) => (
                  <MenuItem key={industry.id} value={industry.id.toString()}>
                    {industry.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ 
              minWidth: isMobile ? 'auto' : 120,
              flex: isMobile ? 1 : 'none',
            }}>
              <InputLabel size={isMobile ? 'small' : 'normal'}>状態</InputLabel>
              <Select
                value={searchState.isActive}
                onChange={(e) => updateSearchState({ isActive: e.target.value })}
                label="状態"
                disabled={isLoading}
                size={isMobile ? 'small' : 'medium'}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="active">進行中</MenuItem>
                <MenuItem value="completed">完了</MenuItem>
              </Select>
            </FormControl>

            <IconButton
              onClick={() => setShowAdvanced(!showAdvanced)}
              color={showAdvanced || activeFiltersCount > 0 ? 'primary' : 'default'}
              disabled={isLoading}
              size={isMobile ? 'medium' : 'large'}
              sx={{ position: 'relative' }}
            >
              <FilterIcon sx={{ fontSize: isMobile ? '1.25rem' : undefined }} />
              {activeFiltersCount > 0 && (
                <Chip
                  label={activeFiltersCount}
                  size="small"
                  color="primary"
                  sx={{ 
                    position: 'absolute', 
                    top: isMobile ? -4 : -8, 
                    right: isMobile ? -4 : -8, 
                    minWidth: isMobile ? 16 : 20, 
                    height: isMobile ? 16 : 20,
                    fontSize: isMobile ? '0.6rem' : '0.75rem',
                  }}
                />
              )}
            </IconButton>
          </Box>

          <IconButton onClick={onRefresh} disabled={isLoading}>
            <RefreshIcon />
          </IconButton>

          {activeFiltersCount > 0 && (
            <IconButton onClick={handleClearSearch} disabled={isLoading}>
              <ClearIcon />
            </IconButton>
          )}
        </MainFilterRow>

        {/* アクティブフィルターのチップ表示 */}
        {activeFiltersCount > 0 && (
          <FilterChipsContainer>
            {searchState.searchQuery && (
              <Chip
                label={`検索: ${searchState.searchQuery}`}
                onDelete={() => updateSearchState({ searchQuery: '' })}
                size="small"
              />
            )}
            {searchState.selectedIndustry && (
              <Chip
                label={`業種: ${industries.find(i => i.id.toString() === searchState.selectedIndustry)?.displayName}`}
                onDelete={() => updateSearchState({ selectedIndustry: '' })}
                size="small"
              />
            )}
            {searchState.selectedTechnologies.map((tech, index) => (
              <Chip
                key={`tech-${index}`}
                label={`技術: ${tech}`}
                onDelete={() => updateSearchState({
                  selectedTechnologies: searchState.selectedTechnologies.filter(t => t !== tech)
                })}
                size="small"
              />
            ))}
            {searchState.isActive !== 'all' && (
              <Chip
                label={`状態: ${searchState.isActive === 'active' ? '進行中' : '完了'}`}
                onDelete={() => updateSearchState({ isActive: 'all' })}
                size="small"
              />
            )}
          </FilterChipsContainer>
        )}

        {/* 詳細フィルター */}
        <Collapse in={showAdvanced}>
          <AdvancedFilterSection>
            <Grid container spacing={2}>
              {/* 技術選択 */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  options={POPULAR_TECHNOLOGIES}
                  value={searchState.selectedTechnologies}
                  onChange={(event, newValue) => updateSearchState({ selectedTechnologies: newValue })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="使用技術"
                      placeholder="技術を選択..."
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        key={`tag-${index}`}
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        size="small"
                      />
                    ))
                  }
                  disabled={isLoading}
                />
              </Grid>

              {/* 開始日範囲 */}
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="開始日（開始）"
                  value={searchState.startDateFrom}
                  onChange={(date) => updateSearchState({ startDateFrom: date })}
                  format="yyyy年MM月"
                  views={['year', 'month']}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'medium',
                    },
                  }}
                  disabled={isLoading}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <DatePicker
                  label="開始日（終了）"
                  value={searchState.startDateTo}
                  onChange={(date) => updateSearchState({ startDateTo: date })}
                  format="yyyy年MM月"
                  views={['year', 'month']}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'medium',
                    },
                  }}
                  disabled={isLoading}
                />
              </Grid>

              {/* ソート・表示設定 */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>ソート順</InputLabel>
                  <Select
                    value={`${searchParams.sortBy}_${searchParams.sortOrder}`}
                    onChange={(e) => handleSortChange(e.target.value)}
                    label="ソート順"
                    disabled={isLoading}
                  >
                    <MenuItem value="startDate_desc">開始日（新しい順）</MenuItem>
                    <MenuItem value="startDate_asc">開始日（古い順）</MenuItem>
                    <MenuItem value="projectName_asc">プロジェクト名（昇順）</MenuItem>
                    <MenuItem value="projectName_desc">プロジェクト名（降順）</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>表示件数</InputLabel>
                  <Select
                    value={searchParams.limit || 10}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                    label="表示件数"
                    disabled={isLoading}
                  >
                    <MenuItem value={5}>5件</MenuItem>
                    <MenuItem value={10}>10件</MenuItem>
                    <MenuItem value={20}>20件</MenuItem>
                    <MenuItem value={50}>50件</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  <Button
                    variant="outlined"
                    onClick={handleClearSearch}
                    disabled={isLoading || activeFiltersCount === 0}
                    fullWidth
                  >
                    フィルタークリア
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </AdvancedFilterSection>
        </Collapse>
      </FilterContainer>
    </LocalizationProvider>
  );
};

export default WorkHistorySearchFilter;