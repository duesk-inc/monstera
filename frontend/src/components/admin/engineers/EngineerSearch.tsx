import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  InputAdornment,
  Chip,
  Stack,
  SelectChangeEvent,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { 
  EngineerStatus,
  GetEngineersParams,
  EngineerSortField,
  SortOrder 
} from '@/types/engineer';
import { 
  ENGINEER_STATUS_LABELS,
  SORT_FIELD_LABELS,
  SORT_ORDER_LABELS
} from '@/constants/engineer';

interface EngineerSearchProps {
  params: GetEngineersParams;
  onParamsChange: (params: Partial<GetEngineersParams>) => void;
  onReset?: () => void;
  loading?: boolean;
  showAdvancedFilters?: boolean;
  departments?: Array<{ id: string; name: string }>;
  projects?: Array<{ id: string; name: string }>;
  skills?: Array<{ id: string; name: string }>;
}

export const EngineerSearch: React.FC<EngineerSearchProps> = ({
  params,
  onParamsChange,
  onReset,
  loading = false,
  showAdvancedFilters = false,
  departments = [],
  projects = [],
  skills = []
}) => {
  const [searchValue, setSearchValue] = React.useState(params.keyword || '');
  const [showFilters, setShowFilters] = React.useState(showAdvancedFilters);

  // 検索実行（デバウンス処理）
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== params.keyword) {
        onParamsChange({ keyword: searchValue, page: 1 });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
  };

  const handleSearchClear = () => {
    setSearchValue('');
    onParamsChange({ keyword: '', page: 1 });
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onParamsChange({ 
      engineerStatus: value ? value as EngineerStatus : undefined,
      page: 1 
    });
  };

  const handleDepartmentChange = (event: SelectChangeEvent<string>) => {
    onParamsChange({ 
      departmentId: event.target.value || undefined,
      page: 1 
    });
  };

  const handleProjectChange = (event: SelectChangeEvent<string>) => {
    onParamsChange({ 
      projectId: event.target.value || undefined,
      page: 1 
    });
  };

  const handleSkillsChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    onParamsChange({ 
      skillIds: typeof value === 'string' ? value.split(',') : value,
      page: 1 
    });
  };

  const handleSortFieldChange = (event: SelectChangeEvent<string>) => {
    onParamsChange({ 
      orderBy: event.target.value as EngineerSortField || undefined 
    });
  };

  const handleSortOrderChange = (event: SelectChangeEvent<string>) => {
    onParamsChange({ 
      order: event.target.value as SortOrder || undefined 
    });
  };

  const handleReset = () => {
    setSearchValue('');
    if (onReset) {
      onReset();
    } else {
      onParamsChange({
        keyword: '',
        engineerStatus: undefined,
        departmentId: undefined,
        projectId: undefined,
        skillIds: [],
        orderBy: undefined,
        order: undefined,
        page: 1
      });
    }
  };

  const hasActiveFilters = Boolean(
    params.keyword ||
    params.engineerStatus ||
    params.departmentId ||
    params.projectId ||
    (params.skillIds && params.skillIds.length > 0)
  );

  return (
    <Box>
      {/* 基本検索バー */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="名前、メールアドレス、社員番号で検索"
          value={searchValue}
          onChange={handleSearchChange}
          disabled={loading}
          sx={{ flex: 1, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchValue && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleSearchClear}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>ステータス</InputLabel>
          <Select
            value={params.engineerStatus || ''}
            label="ステータス"
            onChange={handleStatusChange}
            disabled={loading}
          >
            <MenuItem value="">すべて</MenuItem>
            {Object.entries(ENGINEER_STATUS_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {departments.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>部署</InputLabel>
            <Select
              value={params.departmentId || ''}
              label="部署"
              onChange={handleDepartmentChange}
              disabled={loading}
            >
              <MenuItem value="">すべて</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Tooltip title="詳細フィルター">
          <IconButton 
            onClick={() => setShowFilters(!showFilters)}
            color={showFilters ? 'primary' : 'default'}
          >
            <FilterIcon />
          </IconButton>
        </Tooltip>

        {hasActiveFilters && (
          <Button 
            variant="outlined" 
            size="small" 
            onClick={handleReset}
            disabled={loading}
          >
            リセット
          </Button>
        )}
      </Stack>

      {/* 詳細フィルター */}
      {showFilters && (
        <Box sx={{ 
          p: 2, 
          mb: 2, 
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1
        }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              {projects.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>プロジェクト</InputLabel>
                  <Select
                    value={params.projectId || ''}
                    label="プロジェクト"
                    onChange={handleProjectChange}
                    disabled={loading}
                  >
                    <MenuItem value="">すべて</MenuItem>
                    {projects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {skills.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 300 }}>
                  <InputLabel>スキル</InputLabel>
                  <Select
                    multiple
                    value={params.skillIds || []}
                    label="スキル"
                    onChange={handleSkillsChange}
                    disabled={loading}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const skill = skills.find(s => s.id === value);
                          return skill ? (
                            <Chip 
                              key={value} 
                              label={skill.name} 
                              size="small" 
                            />
                          ) : null;
                        })}
                      </Box>
                    )}
                  >
                    {skills.map((skill) => (
                      <MenuItem key={skill.id} value={skill.id}>
                        {skill.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>

            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>並び順</InputLabel>
                <Select
                  value={params.orderBy || ''}
                  label="並び順"
                  onChange={handleSortFieldChange}
                  disabled={loading}
                >
                  <MenuItem value="">デフォルト</MenuItem>
                  {Object.entries(SORT_FIELD_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>順序</InputLabel>
                <Select
                  value={params.order || ''}
                  label="順序"
                  onChange={handleSortOrderChange}
                  disabled={loading}
                >
                  <MenuItem value="">デフォルト</MenuItem>
                  {Object.entries(SORT_ORDER_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* アクティブフィルター表示 */}
      {hasActiveFilters && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {params.keyword && (
            <Chip
              label={`検索: ${params.keyword}`}
              size="small"
              onDelete={() => {
                setSearchValue('');
                onParamsChange({ keyword: '', page: 1 });
              }}
            />
          )}
          {params.engineerStatus && (
            <Chip
              label={`ステータス: ${ENGINEER_STATUS_LABELS[params.engineerStatus]}`}
              size="small"
              onDelete={() => onParamsChange({ engineerStatus: undefined, page: 1 })}
            />
          )}
          {params.departmentId && departments.length > 0 && (
            <Chip
              label={`部署: ${departments.find(d => d.id === params.departmentId)?.name}`}
              size="small"
              onDelete={() => onParamsChange({ departmentId: undefined, page: 1 })}
            />
          )}
          {params.projectId && projects.length > 0 && (
            <Chip
              label={`プロジェクト: ${projects.find(p => p.id === params.projectId)?.name}`}
              size="small"
              onDelete={() => onParamsChange({ projectId: undefined, page: 1 })}
            />
          )}
          {params.skillIds && params.skillIds.length > 0 && (
            <Chip
              label={`スキル: ${params.skillIds.length}件`}
              size="small"
              onDelete={() => onParamsChange({ skillIds: [], page: 1 })}
            />
          )}
        </Stack>
      )}
    </Box>
  );
};