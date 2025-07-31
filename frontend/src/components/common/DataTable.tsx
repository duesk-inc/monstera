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
  useTheme,
  useMediaQuery,
  SxProps,
  Theme,
} from '@mui/material';

export interface DataTableColumn<T = Record<string, unknown>> {
  id: keyof T;
  label: string;
  align?: 'left' | 'center' | 'right';
  minWidth?: number;
  format?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T = Record<string, unknown>> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  maxHeight?: number | string;
  minWidth?: number;
  variant?: 'elevation' | 'outlined';
  sx?: SxProps<Theme>;
  getRowStyles?: (row: T) => SxProps<Theme>;
  getRowClassName?: (row: T) => string;
}

export const DataTable = <T extends Record<string, any> = Record<string, any>>({
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
  sx,
  getRowStyles,
  getRowClassName,
}: DataTableProps<T>) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
        aria-label="data table"
      >
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={String(column.id)}
                align={column.align || 'left'}
                sx={{ 
                  minWidth: column.minWidth,
                  fontWeight: 600,
                  backgroundColor: 'primary.50',
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center">
                <Box sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    読み込み中...
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center">
                <Box sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow
                key={String(row[keyField])}
                className={getRowClassName?.(row)}
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  ...(onRowClick && {
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }),
                  ...(getRowStyles?.(row) || {}),
                }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => {
                  const value = row[column.id];
                  return (
                    <TableCell key={String(column.id)} align={column.align || 'left'}>
                      {column.format ? column.format(value, row) : String(value || '')}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}; 