import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Collapse,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  TuneIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { WorkHistorySearchParams } from '../../../types/workHistory';
import { useAriaAttributes, useKeyboardNavigation } from '../../../hooks/accessibility/useAccessibility';
import { useLiveRegion } from '../../../hooks/accessibility/useFocusManagement';

const FilterContainer = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(2),
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
}));

const SearchField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    '&:focus-within': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
    },
  },
}));

const FilterChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.25),
  '&:focus': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
}));

const ActiveFiltersContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  padding: theme.spacing(1),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.grey[200]}`,
}));

interface AccessibleWorkHistoryFilterProps {
  searchParams: WorkHistorySearchParams;
  onSearchParamsChange: (params: WorkHistorySearchParams) => void;
  industries?: string[];
  technologies?: string[];
  totalCount?: number;
  filteredCount?: number;
  isLoading?: boolean;
}

export const AccessibleWorkHistoryFilter: React.FC<AccessibleWorkHistoryFilterProps> = ({
  searchParams,
  onSearchParamsChange,
  industries = [],
  technologies = [],
  totalCount = 0,
  filteredCount = 0,
  isLoading = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.search || '');
  const [tempFilters, setTempFilters] = useState<WorkHistorySearchParams>(searchParams);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  
  const { getFormFieldAttributes, getButtonAttributes } = useAriaAttributes();
  const { handleActionKeys, handleEscapeKey } = useKeyboardNavigation();
  const { announce } = useLiveRegion();

  // アクティブなフィルターの数を計算
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (searchParams.search) count++;
    if (searchParams.industry) count++;
    if (searchParams.technologies?.length) count++;
    if (searchParams.startDateFrom) count++;
    if (searchParams.startDateTo) count++;
    if (searchParams.endDateFrom) count++;
    if (searchParams.endDateTo) count++;
    if (searchParams.isActive !== undefined) count++;
    return count;
  }, [searchParams]);

  // 検索フィールドの変更
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    
    // デバウンス処理
    const timeoutId = setTimeout(() => {
      onSearchParamsChange({ ...searchParams, search: value || undefined });
      if (value) {
        announce(`"${value}"で検索しています`, 'polite');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchParams, onSearchParamsChange, announce]);

  // 検索クリア
  const handleSearchClear = useCallback(() => {
    setSearchValue('');
    onSearchParamsChange({ ...searchParams, search: undefined });
    announce('検索条件をクリアしました', 'polite');
    searchInputRef.current?.focus();
  }, [searchParams, onSearchParamsChange, announce]);

  // フィルター変更
  const handleFilterChange = useCallback((key: keyof WorkHistorySearchParams, value: any) => {
    const newParams = { ...searchParams, [key]: value };
    setTempFilters(newParams);
    onSearchParamsChange(newParams);
    
    // フィルター適用のアナウンス
    if (value && value !== '') {
      announce(`${getFilterLabel(key)}フィルターを適用しました`, 'polite');
    } else {
      announce(`${getFilterLabel(key)}フィルターを解除しました`, 'polite');
    }
  }, [searchParams, onSearchParamsChange, announce]);

  // フィルターのラベル取得
  const getFilterLabel = (key: keyof WorkHistorySearchParams): string => {
    switch (key) {
      case 'industry': return '業界';
      case 'technologies': return '技術';
      case 'startDateFrom': return '開始日（以降）';
      case 'startDateTo': return '開始日（以前）';
      case 'endDateFrom': return '終了日（以降）';
      case 'endDateTo': return '終了日（以前）';
      case 'isActive': return 'ステータス';
      default: return 'フィルター';
    }
  };

  // 全フィルタークリア
  const handleClearAllFilters = useCallback(() => {
    const clearedParams: WorkHistorySearchParams = {
      page: 1,
      limit: searchParams.limit,
      sortBy: searchParams.sortBy,
      sortOrder: searchParams.sortOrder,
    };
    
    setSearchValue('');
    setTempFilters(clearedParams);
    onSearchParamsChange(clearedParams);
    announce(`すべてのフィルターをクリアしました。${totalCount}件すべてを表示します`, 'assertive');
    
    // 検索フィールドにフォーカス
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, [searchParams.limit, searchParams.sortBy, searchParams.sortOrder, onSearchParamsChange, totalCount, announce]);

  // アコーディオン開閉
  const handleAccordionToggle = useCallback(() => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    announce(
      newExpanded ? '詳細フィルターを展開しました' : '詳細フィルターを折りたたみました',
      'polite'
    );
  }, [expanded, announce]);

  // キーボードイベント処理
  const handleFilterKeyDown = useCallback((event: React.KeyboardEvent) => {
    handleEscapeKey(event, () => {
      if (expanded) {
        setExpanded(false);
        announce('詳細フィルターを折りたたみました', 'polite');
      }
    });
  }, [handleEscapeKey, expanded, announce]);

  // フィルター結果の通知
  useEffect(() => {
    if (!isLoading && activeFiltersCount > 0) {
      const timeout = setTimeout(() => {
        announce(
          `フィルター適用済み: ${totalCount}件中${filteredCount}件を表示中`,
          'polite'
        );
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading, activeFiltersCount, totalCount, filteredCount, announce]);

  return (
    <FilterContainer ref={filterContainerRef} onKeyDown={handleFilterKeyDown}>
      {/* 検索フィールド */}
      <Box p={2}>
        <SearchField
          fullWidth
          placeholder="プロジェクト名、会社名、技術で検索"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchValue && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleSearchClear}
                  {...getButtonAttributes('検索条件をクリア')}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
            ref: searchInputRef,
          }}
          {...getFormFieldAttributes('search', false, false, undefined, 'プロジェクト名、会社名、技術で検索できます')}
        />

        {/* フィルター統計 */}
        {activeFiltersCount > 0 && (
          <ActiveFiltersContainer>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {activeFiltersCount}個のフィルター適用中 • {totalCount}件中{filteredCount}件を表示
              </Typography>
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearAllFilters}
                {...getButtonAttributes('すべてのフィルターをクリア')}
              >
                すべてクリア
              </Button>
            </Stack>
            
            {/* アクティブフィルターの表示 */}
            <Box mt={1}>
              {searchParams.search && (
                <FilterChip
                  label={`検索: ${searchParams.search}`}
                  onDelete={() => handleFilterChange('search', undefined)}
                  deleteIcon={<CloseIcon />}
                  size="small"
                  tabIndex={0}
                />
              )}
              {searchParams.industry && (
                <FilterChip
                  label={`業界: ${searchParams.industry}`}
                  onDelete={() => handleFilterChange('industry', undefined)}
                  deleteIcon={<CloseIcon />}
                  size="small"
                  tabIndex={0}
                />
              )}
              {searchParams.technologies?.map((tech) => (
                <FilterChip
                  key={tech}
                  label={`技術: ${tech}`}
                  onDelete={() => {
                    const newTechs = searchParams.technologies?.filter(t => t !== tech);
                    handleFilterChange('technologies', newTechs?.length ? newTechs : undefined);
                  }}
                  deleteIcon={<CloseIcon />}
                  size="small"
                  tabIndex={0}
                />
              ))}
              {searchParams.isActive !== undefined && (
                <FilterChip
                  label={`ステータス: ${searchParams.isActive ? '進行中' : '完了'}`}
                  onDelete={() => handleFilterChange('isActive', undefined)}
                  deleteIcon={<CloseIcon />}
                  size="small"
                  tabIndex={0}
                />
              )}
            </Box>
          </ActiveFiltersContainer>
        )}
      </Box>

      {/* 詳細フィルター */}
      <Accordion 
        expanded={expanded} 
        onChange={handleAccordionToggle}
        disableGutters
        elevation={0}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="advanced-filters-content"
          id="advanced-filters-header"
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <TuneIcon color="action" />
            <Typography>詳細フィルター</Typography>
            {activeFiltersCount > 0 && (
              <Chip 
                label={activeFiltersCount} 
                size="small" 
                color="primary" 
                variant="filled"
                aria-label={`${activeFiltersCount}個のフィルターが適用中`}
              />
            )}
          </Stack>
        </AccordionSummary>

        <AccordionDetails id="advanced-filters-content">
          <Stack spacing={3}>
            {/* 業界フィルター */}
            <FormControl fullWidth>
              <InputLabel id="industry-filter-label">業界</InputLabel>
              <Select
                labelId="industry-filter-label"
                value={searchParams.industry || ''}
                onChange={(e) => handleFilterChange('industry', e.target.value || undefined)}
                label="業界"
                {...getFormFieldAttributes('industry-filter', false)}
              >
                <MenuItem value="">すべて</MenuItem>
                {industries.map((industry) => (
                  <MenuItem key={industry} value={industry}>
                    {industry}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 技術フィルター */}
            <FormControl fullWidth>
              <InputLabel id="technologies-filter-label">技術</InputLabel>
              <Select
                labelId="technologies-filter-label"
                multiple
                value={searchParams.technologies || []}
                onChange={(e) => {
                  const value = e.target.value as string[];
                  handleFilterChange('technologies', value.length ? value : undefined);
                }}
                input={<OutlinedInput label="技術" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                {...getFormFieldAttributes('technologies-filter', false)}
              >
                {technologies.map((tech) => (
                  <MenuItem key={tech} value={tech}>
                    <Checkbox checked={(searchParams.technologies || []).indexOf(tech) > -1} />
                    {tech}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider />

            {/* 期間フィルター */}
            <Typography variant="subtitle2" color="text.secondary">
              開始日
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                type="date"
                label="開始日（以降）"
                value={searchParams.startDateFrom || ''}
                onChange={(e) => handleFilterChange('startDateFrom', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
                {...getFormFieldAttributes('start-date-from', false)}
              />
              <TextField
                type="date"
                label="開始日（以前）"
                value={searchParams.startDateTo || ''}
                onChange={(e) => handleFilterChange('startDateTo', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
                {...getFormFieldAttributes('start-date-to', false)}
              />
            </Stack>

            <Typography variant="subtitle2" color="text.secondary">
              終了日
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                type="date"
                label="終了日（以降）"
                value={searchParams.endDateFrom || ''}
                onChange={(e) => handleFilterChange('endDateFrom', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
                {...getFormFieldAttributes('end-date-from', false)}
              />
              <TextField
                type="date"
                label="終了日（以前）"
                value={searchParams.endDateTo || ''}
                onChange={(e) => handleFilterChange('endDateTo', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
                {...getFormFieldAttributes('end-date-to', false)}
              />
            </Stack>

            <Divider />

            {/* ステータスフィルター */}
            <FormGroup>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                プロジェクトステータス
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={searchParams.isActive === true}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleFilterChange('isActive', true);
                      } else if (searchParams.isActive === true) {
                        handleFilterChange('isActive', undefined);
                      }
                    }}
                  />
                }
                label="進行中のプロジェクトのみ"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={searchParams.isActive === false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleFilterChange('isActive', false);
                      } else if (searchParams.isActive === false) {
                        handleFilterChange('isActive', undefined);
                      }
                    }}
                  />
                }
                label="完了したプロジェクトのみ"
              />
            </FormGroup>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* フィルター結果の要約（スクリーンリーダー用） */}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {activeFiltersCount > 0 
          ? `${activeFiltersCount}個のフィルターが適用されています。${totalCount}件中${filteredCount}件が表示されています。`
          : `フィルターは適用されていません。${totalCount}件すべてが表示されています。`
        }
      </Typography>
    </FilterContainer>
  );
};