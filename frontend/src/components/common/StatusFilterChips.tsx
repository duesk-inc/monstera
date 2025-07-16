import React from 'react';
import {
  Box,
  Chip,
  SxProps,
  Theme,
} from '@mui/material';

export interface StatusFilter {
  value: string;
  label: string;
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon?: React.ReactElement;
  count?: number;
}

interface StatusFilterChipsProps {
  filters: StatusFilter[];
  selected: string | string[];
  onChange: (value: string) => void;
  multiple?: boolean;
  size?: 'small' | 'medium';
  showCount?: boolean;
  sx?: SxProps<Theme>;
}

export const StatusFilterChips: React.FC<StatusFilterChipsProps> = ({
  filters,
  selected,
  onChange,
  multiple = false,
  size = 'medium',
  showCount = true,
  sx,
}) => {
  const selectedArray = Array.isArray(selected) ? selected : [selected];

  const handleClick = (value: string) => {
    if (multiple) {
      // 複数選択の場合
      if (selectedArray.includes(value)) {
        onChange(value);
      } else {
        onChange(value);
      }
    } else {
      // 単一選択の場合
      onChange(value);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        ...sx,
      }}
    >
      {filters.map((filter) => {
        const isSelected = selectedArray.includes(filter.value);
        const label = showCount && filter.count !== undefined
          ? `${filter.label} (${filter.count})`
          : filter.label;

        return (
          <Chip
            key={filter.value}
            label={label}
            icon={filter.icon}
            size={size}
            color={isSelected ? (filter.color || 'primary') : 'default'}
            variant={isSelected ? 'filled' : 'outlined'}
            onClick={() => handleClick(filter.value)}
            clickable
            sx={{
              fontWeight: isSelected ? 600 : 400,
              ...(isSelected && {
                borderWidth: 2,
              }),
            }}
          />
        );
      })}
    </Box>
  );
};