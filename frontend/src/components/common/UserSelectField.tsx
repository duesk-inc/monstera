import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  Avatar,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { debounce } from 'lodash';

export interface User {
  id: string;
  name: string;
  email?: string;
  department?: string;
  avatar?: string;
}

interface UserSelectFieldProps {
  value: User | User[] | null;
  onChange: (value: User | User[] | null) => void;
  onSearch: (query: string) => Promise<User[]>;
  multiple?: boolean;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  clearable?: boolean;
}

export const UserSelectField: React.FC<UserSelectFieldProps> = ({
  value,
  onChange,
  onSearch,
  multiple = false,
  label = 'ユーザー',
  placeholder = 'ユーザーを検索...',
  disabled = false,
  error = false,
  helperText,
  size = 'medium',
  fullWidth = true,
  clearable = true,
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // デバウンスされた検索
  const debouncedSearch = React.useMemo(
    () =>
      debounce(async (query: string) => {
        if (query.length < 1) {
          setOptions([]);
          return;
        }

        setLoading(true);
        try {
          const results = await onSearch(query);
          setOptions(results);
        } catch (error) {
          console.error('User search error:', error);
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }, 300),
    [onSearch]
  );

  useEffect(() => {
    debouncedSearch(inputValue);
  }, [inputValue, debouncedSearch]);

  const renderOption = (props: any, option: User) => (
    <Box component="li" {...props}>
      <Avatar
        src={option.avatar}
        sx={{ width: 32, height: 32, mr: 1.5 }}
      >
        {option.name.charAt(0)}
      </Avatar>
      <Box>
        <Typography variant="body2">{option.name}</Typography>
        {option.department && (
          <Typography variant="caption" color="text.secondary">
            {option.department}
            {option.email && ` • ${option.email}`}
          </Typography>
        )}
      </Box>
    </Box>
  );

  const renderTags = (value: User[], getTagProps: any) =>
    value.map((option, index) => (
      <Chip
        {...getTagProps({ index })}
        key={option.id}
        avatar={<Avatar src={option.avatar}>{option.name.charAt(0)}</Avatar>}
        label={option.name}
        size="small"
      />
    ));

  return (
    <Autocomplete
      multiple={multiple}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      options={options}
      loading={loading}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderOption={renderOption}
      renderTags={multiple ? renderTags : undefined}
      disabled={disabled}
      clearable={clearable}
      fullWidth={fullWidth}
      size={size}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};