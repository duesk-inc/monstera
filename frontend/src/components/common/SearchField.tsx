import React, { useState, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  SxProps,
  Theme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { debounce } from 'lodash';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceTime?: number;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  disabled?: boolean;
  autoFocus?: boolean;
  sx?: SxProps<Theme>;
  onSearch?: () => void;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  placeholder = '検索...',
  debounceTime = 300,
  fullWidth = false,
  size = 'small',
  disabled = false,
  autoFocus = false,
  sx,
  onSearch,
}) => {
  const [localValue, setLocalValue] = useState(value);

  // デバウンスされた onChange
  const debouncedOnChange = useCallback(
    debounce((newValue: string) => {
      onChange(newValue);
    }, debounceTime),
    [onChange, debounceTime]
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && onSearch) {
      onSearch();
    }
  };

  // 親コンポーネントから value が変更された場合
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <TextField
      value={localValue}
      onChange={handleChange}
      onKeyPress={handleKeyPress}
      placeholder={placeholder}
      fullWidth={fullWidth}
      size={size}
      disabled={disabled}
      autoFocus={autoFocus}
      sx={{
        '& .MuiOutlinedInput-root': {
          paddingRight: 0.5,
        },
        ...sx,
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        endAdornment: localValue && (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={handleClear}
              disabled={disabled}
              edge="end"
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};