import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Checkbox,
  TableSortLabel,
  useTheme,
  useMediaQuery,
  SxProps,
  Theme,
  Skeleton,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';

export interface DataGridColumn<T = Record<string, unknown>> {
  id: keyof T | string;
  label: string;
  align?: 'left' | 'center' | 'right';
  minWidth?: number;
  format?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  getValue?: (row: T) => any;
}

export interface DataGridTableProps<T = Record<string, unknown>> {
  columns: DataGridColumn<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  maxHeight?: number | string;
  minWidth?: number;
  variant?: 'elevation' | 'outlined';
  selectable?: boolean;
  selected?: T[keyof T][];
  onSelectionChange?: (selected: T[keyof T][]) => void;
  orderBy?: string;
  order?: 'asc' | 'desc';
  onRequestSort?: (property: string) => void;
  sx?: SxProps<Theme>;
  size?: 'small' | 'medium';
  'data-testid'?: string;
}

export const DataGridTable = <T extends Record<string, any> = Record<string, any>>({
  columns,
  data,
  keyField,
  loading = false,
  emptyMessage = 'データがありません',
  onRowClick,
  stickyHeader = false,
  maxHeight,
  minWidth = 650,
  variant = 'outlined',
  selectable = false,
  selected = [],
  onSelectionChange,
  orderBy,
  order = 'asc',
  onRequestSort,
  sx,
  size = 'medium',
  'data-testid': testId,
}: DataGridTableProps<T>) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = data.map((row) => row[keyField]);
      onSelectionChange?.(newSelected);
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleClick = (row: T) => {
    if (selectable && onSelectionChange) {
      const selectedIndex = selected.indexOf(row[keyField]);
      let newSelected: T[keyof T][] = [];

      if (selectedIndex === -1) {
        newSelected = newSelected.concat(selected, row[keyField]);
      } else if (selectedIndex === 0) {
        newSelected = newSelected.concat(selected.slice(1));
      } else if (selectedIndex === selected.length - 1) {
        newSelected = newSelected.concat(selected.slice(0, -1));
      } else if (selectedIndex > 0) {
        newSelected = newSelected.concat(
          selected.slice(0, selectedIndex),
          selected.slice(selectedIndex + 1),
        );
      }

      onSelectionChange(newSelected);
    } else {
      onRowClick?.(row);
    }
  };

  const isSelected = (id: T[keyof T]) => selected.indexOf(id) !== -1;

  const createSortHandler = (property: string) => () => {
    onRequestSort?.(property);
  };

  if (loading) {
    return (
      <TableContainer component={Paper} variant={variant} sx={{ maxHeight, ...sx }}>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && <TableCell padding="checkbox" />}
              {columns.map((column) => (
                <TableCell key={String(column.id)} align={column.align || 'left'}>
                  <Skeleton />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {selectable && <TableCell padding="checkbox"><Skeleton /></TableCell>}
                {columns.map((column) => (
                  <TableCell key={String(column.id)}>
                    <Skeleton />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <TableContainer 
      component={Paper} 
      variant={variant}
      sx={{ 
        maxHeight,
        ...sx 
      }}
    >
      <Table 
        sx={{ minWidth: isMobile ? 300 : minWidth }} 
        stickyHeader={stickyHeader}
        aria-label="data grid table"
        size={size}
        data-testid={testId}
      >
        <TableHead>
          <TableRow>
            {selectable && (
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selected.length > 0 && selected.length < data.length}
                  checked={data.length > 0 && selected.length === data.length}
                  onChange={handleSelectAllClick}
                  inputProps={{
                    'aria-label': 'select all',
                  }}
                  data-testid="select-all-checkbox"
                />
              </TableCell>
            )}
            {columns.map((column) => (
              <TableCell
                key={String(column.id)}
                align={column.align || 'left'}
                sx={{ 
                  minWidth: column.minWidth,
                  fontWeight: 600,
                  backgroundColor: theme.palette.grey[50],
                }}
                sortDirection={orderBy === column.id ? order : false}
              >
                {column.sortable && onRequestSort ? (
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={createSortHandler(String(column.id))}
                  >
                    {column.label}
                    {orderBy === column.id ? (
                      <Box component="span" sx={visuallyHidden}>
                        {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                      </Box>
                    ) : null}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0)} align="center">
                <Box sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => {
              const isItemSelected = isSelected(row[keyField]);
              return (
                <TableRow
                  key={String(row[keyField])}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    ...(onRowClick && {
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }),
                    ...(isItemSelected && {
                      backgroundColor: 'action.selected',
                    }),
                  }}
                  onClick={() => handleClick(row)}
                  selected={isItemSelected}
                >
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        inputProps={{
                          'aria-labelledby': `checkbox-${String(row[keyField])}`,
                        }}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => {
                    const value = column.getValue ? column.getValue(row) : row[column.id as keyof T];
                    return (
                      <TableCell key={String(column.id)} align={column.align || 'left'}>
                        {column.format ? column.format(value, row) : String(value || '')}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};