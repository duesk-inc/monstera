import React, { useState, useCallback, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Code as CodeIcon,
  Storage as StorageIcon,
  Build as BuildIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useDebouncedCallback } from '../../../hooks/common/useDebouncedCallback';
import type { TechnologySuggestion } from '../../../types/workHistory';
import { AUTOCOMPLETE } from '../../../constants/ui';

const CategoryIcon: React.FC<{ category: string; size?: 'small' | 'medium' }> = ({ 
  category, 
  size = 'small' 
}) => {
  const iconProps = { fontSize: size };
  
  switch (category) {
    case 'programming_languages':
      return <CodeIcon {...iconProps} color="success" />;
    case 'servers_databases':
      return <StorageIcon {...iconProps} color="warning" />;
    case 'tools':
      return <BuildIcon {...iconProps} color="info" />;
    default:
      return <CodeIcon {...iconProps} />;
  }
};

const SuggestionItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 0),
}));

const PopularBadge = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: theme.palette.warning.main,
  fontSize: '0.75rem',
}));

interface TechnologyInputProps {
  value: string[];
  onChange: (values: string[]) => void;
  onSearch?: (query: string) => Promise<TechnologySuggestion[]>;
  category: 'programming_languages' | 'servers_databases' | 'tools';
  label: string;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  maxItems?: number;
  showIcon?: boolean;
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
  popularTechnologies?: string[];
}

export const TechnologyInput: React.FC<TechnologyInputProps> = ({
  value = [],
  onChange,
  onSearch,
  category,
  label,
  placeholder,
  error = false,
  helperText,
  required = false,
  disabled = false,
  maxItems = 20,
  showIcon = true,
  variant = 'outlined',
  size = 'medium',
  popularTechnologies = [],
}) => {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TechnologySuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // デバウンス処理付きの検索
  const debouncedSearch = useDebouncedCallback(
    useCallback(async (query: string) => {
      if (!onSearch || query.length < AUTOCOMPLETE.MIN_INPUT_LENGTH) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const results = await onSearch(query);
        setSuggestions(results || []);
      } catch (error) {
        console.error('技術候補取得エラー:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, [onSearch]),
    AUTOCOMPLETE.DEBOUNCE_MS
  );

  const handleInputChange = (event: React.SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue);
    debouncedSearch(newInputValue);
  };

  const handleChange = (event: React.SyntheticEvent, newValues: string[]) => {
    // 重複除去と最大件数制限
    const uniqueValues = Array.from(new Set(
      newValues
        .map(v => v.trim())
        .filter(v => v.length > 0)
    )).slice(0, maxItems);
    
    onChange(uniqueValues);
  };

  // オプションの生成
  const options = useMemo(() => {
    const allOptions = new Set<string>();
    
    // 人気技術を先頭に追加
    popularTechnologies.forEach(tech => allOptions.add(tech));
    
    // 検索結果を追加
    suggestions.forEach(suggestion => allOptions.add(suggestion.technologyName));
    
    // 入力値も選択肢に含める（新規追加を可能にする）
    if (inputValue.trim() && inputValue.trim().length >= AUTOCOMPLETE.MIN_INPUT_LENGTH) {
      allOptions.add(inputValue.trim());
    }
    
    // 既に選択済みのものは除外
    return Array.from(allOptions).filter(option => !value.includes(option));
  }, [suggestions, popularTechnologies, inputValue, value]);

  // 人気技術かどうかの判定
  const isPopularTechnology = useCallback((tech: string) => {
    return popularTechnologies.includes(tech);
  }, [popularTechnologies]);

  // 検索結果からの詳細情報取得
  const getSuggestionDetails = useCallback((tech: string) => {
    return suggestions.find(s => s.technologyName === tech);
  }, [suggestions]);

  return (
    <Autocomplete
      multiple
      freeSolo
      value={value}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={options}
      loading={loading}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      disabled={disabled}
      limitTags={5}
      disableCloseOnSelect
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          variant={variant}
          size={size}
          error={error}
          helperText={helperText}
          required={required}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                {showIcon && <CategoryIcon category={category} />}
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {loading && <CircularProgress color="inherit" size={20} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            key={index}
            label={option}
            {...getTagProps({ index })}
            size="small"
            variant="outlined"
            color="primary"
            icon={showIcon ? <CategoryIcon category={category} /> : undefined}
          />
        ))
      }
      renderOption={(props, option) => {
        const details = getSuggestionDetails(option);
        const isPopular = isPopularTechnology(option);
        
        return (
          <Box component="li" {...props}>
            <SuggestionItem>
              {showIcon && <CategoryIcon category={category} />}
              
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" component="div">
                  {option}
                  {details?.technologyDisplayName && 
                    details.technologyDisplayName !== option && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      ({details.technologyDisplayName})
                    </Typography>
                  )}
                </Typography>
                
                {(isPopular || (details?.usageCount && details.usageCount > 0)) && (
                  <PopularBadge>
                    <StarIcon fontSize="inherit" />
                    <Typography variant="caption">
                      {isPopular ? '人気' : `${details?.usageCount}件で使用`}
                    </Typography>
                  </PopularBadge>
                )}
              </Box>
            </SuggestionItem>
          </Box>
        );
      }}
      renderGroup={(params) => (
        <Box key={params.key}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              px: 2,
              py: 1,
              fontWeight: 600,
              color: 'text.secondary',
              backgroundColor: 'grey.50',
            }}
          >
            {params.group}
          </Typography>
          {params.children}
        </Box>
      )}
      noOptionsText={
        inputValue.length < AUTOCOMPLETE.MIN_INPUT_LENGTH
          ? '技術名を入力してください'
          : loading
          ? '検索中...'
          : inputValue
          ? `"${inputValue}" を追加`
          : '候補がありません'
      }
      loadingText="候補を検索中..."
      ChipProps={{
        size: 'small',
        variant: 'outlined',
        color: 'primary',
      }}
    />
  );
};

interface TechnologyMultiInputProps {
  programmingLanguages: string[];
  serversDatabases: string[];
  tools: string[];
  onProgrammingLanguagesChange: (values: string[]) => void;
  onServersDatabasesChange: (values: string[]) => void;
  onToolsChange: (values: string[]) => void;
  onSearch?: (category: string, query: string) => Promise<TechnologySuggestion[]>;
  popularTechnologies?: {
    programmingLanguages?: string[];
    serversDatabases?: string[];
    tools?: string[];
  };
  error?: {
    programmingLanguages?: boolean;
    serversDatabases?: boolean;
    tools?: boolean;
  };
  helperText?: {
    programmingLanguages?: string;
    serversDatabases?: string;
    tools?: string;
  };
  disabled?: boolean;
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
  required?: {
    programmingLanguages?: boolean;
    serversDatabases?: boolean;
    tools?: boolean;
  };
}

export const TechnologyMultiInput: React.FC<TechnologyMultiInputProps> = ({
  programmingLanguages,
  serversDatabases,
  tools,
  onProgrammingLanguagesChange,
  onServersDatabasesChange,
  onToolsChange,
  onSearch,
  popularTechnologies = {},
  error = {},
  helperText = {},
  disabled = false,
  variant = 'outlined',
  size = 'medium',
  required = {},
}) => {
  const createSearchHandler = useCallback((category: string) => {
    if (!onSearch) return undefined;
    return (query: string) => onSearch(category, query);
  }, [onSearch]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TechnologyInput
        value={programmingLanguages}
        onChange={onProgrammingLanguagesChange}
        onSearch={createSearchHandler('programming_languages')}
        category="programming_languages"
        label="プログラミング言語"
        placeholder="Java, TypeScript, Python..."
        error={error.programmingLanguages}
        helperText={helperText.programmingLanguages}
        required={required.programmingLanguages}
        disabled={disabled}
        variant={variant}
        size={size}
        popularTechnologies={popularTechnologies.programmingLanguages}
      />

      <TechnologyInput
        value={serversDatabases}
        onChange={onServersDatabasesChange}
        onSearch={createSearchHandler('servers_databases')}
        category="servers_databases"
        label="サーバー・DB"
        placeholder="MySQL, AWS, Docker..."
        error={error.serversDatabases}
        helperText={helperText.serversDatabases}
        required={required.serversDatabases}
        disabled={disabled}
        variant={variant}
        size={size}
        popularTechnologies={popularTechnologies.serversDatabases}
      />

      <TechnologyInput
        value={tools}
        onChange={onToolsChange}
        onSearch={createSearchHandler('tools')}
        category="tools"
        label="ツール"
        placeholder="Git, JIRA, Slack..."
        error={error.tools}
        helperText={helperText.tools}
        required={required.tools}
        disabled={disabled}
        variant={variant}
        size={size}
        popularTechnologies={popularTechnologies.tools}
      />
    </Box>
  );
};

export default TechnologyInput;