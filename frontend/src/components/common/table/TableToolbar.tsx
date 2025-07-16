import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Toolbar,
  alpha,
  Button,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  Send as SendIcon,
} from '@mui/icons-material';

interface TableToolbarProps {
  numSelected: number;
  title: string;
  onDelete?: () => void;
  onFilter?: () => void;
  onBulkAction?: () => void;
  bulkActionLabel?: string;
  bulkActionIcon?: React.ReactNode;
  actions?: React.ReactNode;
  'data-testid'?: string;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  numSelected,
  title,
  onDelete,
  onFilter,
  onBulkAction,
  bulkActionLabel = '一括処理',
  bulkActionIcon = <SendIcon />,
  actions,
  'data-testid': testId,
}) => {
  return (
    <Toolbar
      sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        ...(numSelected > 0 && {
          bgcolor: (theme) =>
            alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
        }),
      }}
    >
      {numSelected > 0 ? (
        <Typography
          sx={{ flex: '1 1 100%' }}
          color="inherit"
          variant="subtitle1"
          component="div"
        >
          {numSelected} 件選択中
        </Typography>
      ) : (
        <Typography
          sx={{ flex: '1 1 100%' }}
          variant="h6"
          id="tableTitle"
          component="div"
        >
          {title}
        </Typography>
      )}

      {numSelected > 0 ? (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onBulkAction && (
            <Button
              startIcon={bulkActionIcon}
              onClick={onBulkAction}
              variant="contained"
              size="small"
              data-testid={testId}
            >
              {bulkActionLabel}
            </Button>
          )}
          {onDelete && (
            <Tooltip title="削除">
              <IconButton onClick={onDelete}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
          {actions}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onFilter && (
            <Tooltip title="フィルター">
              <IconButton onClick={onFilter}>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          )}
          {actions}
        </Box>
      )}
    </Toolbar>
  );
};