import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Stack,
  IconButton,
  Box,
  Skeleton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { WorkHistoryItem } from '@/types/workHistory';

interface WorkHistoryGridProps {
  workHistories: WorkHistoryItem[];
  onEdit?: (workHistory: WorkHistoryItem) => void;
  onDelete?: (workHistory: WorkHistoryItem) => void;
  onView?: (workHistory: WorkHistoryItem) => void;
  isLoading?: boolean;
}

export const WorkHistoryGrid: React.FC<WorkHistoryGridProps> = React.memo(({
  workHistories,
  onEdit,
  onDelete,
  onView,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {[...Array(6)].map((_, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="80%" height={32} />
                <Skeleton variant="text" width="60%" />
                <Box sx={{ mt: 2 }}>
                  <Skeleton variant="rectangular" height={24} width="40%" />
                </Box>
              </CardContent>
              <CardActions>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="circular" width={40} height={40} />
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
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
    <Grid container spacing={2}>
      {workHistories.map((workHistory) => {
        const startDate = workHistory.startDate 
          ? format(new Date(workHistory.startDate), 'yyyy年MM月', { locale: ja })
          : '';
        const endDate = workHistory.endDate
          ? format(new Date(workHistory.endDate), 'yyyy年MM月', { locale: ja })
          : '現在';

        return (
          <Grid item xs={12} sm={6} md={4} key={workHistory.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Typography
                  variant="h6"
                  component="h3"
                  gutterBottom
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    minHeight: '3.6em',
                  }}
                >
                  {workHistory.projectName}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {startDate} - {endDate}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 0.5 }}>
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
                </Stack>

                {workHistory.companyName && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1.5 }}
                  >
                    {workHistory.companyName}
                  </Typography>
                )}

                {workHistory.technologies && workHistory.technologies.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      使用技術:
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                      {workHistory.technologies.slice(0, 3).map((tech, index) => (
                        <Chip
                          key={tech.id || index}
                          label={tech.technologyName}
                          size="small"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      ))}
                      {workHistory.technologies.length > 3 && (
                        <Chip
                          label={`+${workHistory.technologies.length - 3}`}
                          size="small"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      )}
                    </Stack>
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
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
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
});