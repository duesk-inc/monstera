import React, { useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  useTheme,
  useMediaQuery,
  IconButton,
  Skeleton,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Launch as LaunchIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { WorkHistoryItem } from '@/types/workHistory';

interface VirtualizedWorkHistoryListProps {
  workHistories: WorkHistoryItem[];
  onEdit?: (workHistory: WorkHistoryItem) => void;
  onDelete?: (workHistory: WorkHistoryItem) => void;
  onView?: (workHistory: WorkHistoryItem) => void;
  isLoading?: boolean;
  itemHeight?: number;
  overscan?: number;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    workHistories: WorkHistoryItem[];
    onEdit?: (workHistory: WorkHistoryItem) => void;
    onDelete?: (workHistory: WorkHistoryItem) => void;
    onView?: (workHistory: WorkHistoryItem) => void;
    isMobile: boolean;
  };
}

const WorkHistoryRow: React.FC<RowProps> = React.memo(({ index, style, data }) => {
  const { workHistories, onEdit, onDelete, onView, isMobile } = data;
  const workHistory = workHistories[index];

  if (!workHistory) {
    return (
      <Box style={style} sx={{ p: 1 }}>
        <Skeleton variant="rectangular" height={isMobile ? 120 : 80} />
      </Box>
    );
  }

  const startDate = workHistory.startDate 
    ? format(new Date(workHistory.startDate), 'yyyy年MM月', { locale: ja })
    : '';
  const endDate = workHistory.endDate
    ? format(new Date(workHistory.endDate), 'yyyy年MM月', { locale: ja })
    : '現在';

  return (
    <Box style={style} sx={{ p: 1 }}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          '&:hover': {
            boxShadow: 3,
          },
        }}
      >
        <CardContent sx={{ flex: 1, p: isMobile ? 1.5 : 2 }}>
          <Stack spacing={1}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box flex={1}>
                <Typography
                  variant={isMobile ? 'body1' : 'h6'}
                  component="h3"
                  gutterBottom
                  sx={{ fontWeight: 'medium' }}
                >
                  {workHistory.projectName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {startDate} - {endDate}
                </Typography>
              </Box>
              {!isMobile && (
                <Stack direction="row" spacing={0.5}>
                  {onView && (
                    <IconButton
                      size="small"
                      onClick={() => onView(workHistory)}
                      aria-label="詳細表示"
                    >
                      <LaunchIcon fontSize="small" />
                    </IconButton>
                  )}
                  {onEdit && (
                    <IconButton
                      size="small"
                      onClick={() => onEdit(workHistory)}
                      aria-label="編集"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                  {onDelete && (
                    <IconButton
                      size="small"
                      onClick={() => onDelete(workHistory)}
                      aria-label="削除"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              )}
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={workHistory.industryName || workHistory.industry}
                size="small"
                variant="outlined"
              />
              <Chip
                label={workHistory.role}
                size="small"
                color="primary"
                variant="outlined"
              />
              {workHistory.companyName && (
                <Chip
                  label={workHistory.companyName}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>

            {isMobile && (
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {onView && (
                  <IconButton
                    size="small"
                    onClick={() => onView(workHistory)}
                    aria-label="詳細表示"
                  >
                    <LaunchIcon fontSize="small" />
                  </IconButton>
                )}
                {onEdit && (
                  <IconButton
                    size="small"
                    onClick={() => onEdit(workHistory)}
                    aria-label="編集"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                {onDelete && (
                  <IconButton
                    size="small"
                    onClick={() => onDelete(workHistory)}
                    aria-label="削除"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
});

WorkHistoryRow.displayName = 'WorkHistoryRow';

export const VirtualizedWorkHistoryList: React.FC<VirtualizedWorkHistoryListProps> = ({
  workHistories,
  onEdit,
  onDelete,
  onView,
  isLoading = false,
  itemHeight = 100,
  overscan = 5,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // モバイルでは高さを増やす
  const actualItemHeight = isMobile ? 140 : itemHeight;

  const itemData = useMemo(
    () => ({
      workHistories,
      onEdit,
      onDelete,
      onView,
      isMobile,
    }),
    [workHistories, onEdit, onDelete, onView, isMobile]
  );

  const itemKey = useCallback(
    (index: number, data: typeof itemData) => {
      const workHistory = data.workHistories[index];
      return workHistory?.id || `placeholder-${index}`;
    },
    []
  );

  if (isLoading) {
    return (
      <Box>
        {[...Array(5)].map((_, index) => (
          <Box key={index} sx={{ p: 1 }}>
            <Skeleton variant="rectangular" height={actualItemHeight - 16} />
          </Box>
        ))}
      </Box>
    );
  }

  if (workHistories.length === 0) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight={400}
      >
        <Typography variant="body1" color="text.secondary">
          職務経歴がありません
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={workHistories.length}
            itemSize={actualItemHeight}
            width={width}
            itemData={itemData}
            itemKey={itemKey}
            overscanCount={overscan}
          >
            {WorkHistoryRow}
          </List>
        )}
      </AutoSizer>
    </Box>
  );
};