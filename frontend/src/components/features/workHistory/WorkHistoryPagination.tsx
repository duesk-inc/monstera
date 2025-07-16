import React from 'react';
import {
  Box,
  Pagination,
  Select,
  MenuItem,
  Typography,
  Stack,
  FormControl,
  InputLabel,
} from '@mui/material';

interface WorkHistoryPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (items: number) => void;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

export const WorkHistoryPagination: React.FC<WorkHistoryPaginationProps> = React.memo(({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  startIndex,
  endIndex,
}) => {
  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    onPageChange(page);
  };

  const handleItemsPerPageChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    onItemsPerPageChange(Number(event.target.value));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        py: 2,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {totalItems > 0 ? `${startIndex + 1}-${endIndex} / ${totalItems}件` : '0件'}
        </Typography>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>表示件数</InputLabel>
          <Select
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            label="表示件数"
          >
            <MenuItem value={10}>10件</MenuItem>
            <MenuItem value={20}>20件</MenuItem>
            <MenuItem value={50}>50件</MenuItem>
            <MenuItem value={100}>100件</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {totalPages > 1 && (
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
          size="medium"
          showFirstButton
          showLastButton
          siblingCount={1}
          boundaryCount={1}
        />
      )}
    </Box>
  );
});