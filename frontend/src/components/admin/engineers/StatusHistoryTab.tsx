import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Paper,
  Avatar,
  Divider,
} from '@mui/material';
import {
  History as HistoryIcon,
  SwapHoriz as StatusChangeIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { EngineerDetail, EngineerStatus } from '@/types/engineer';
import { formatDate } from '@/utils/dateUtils';
import {
  ENGINEER_STATUS_LABELS,
  ENGINEER_STATUS_COLORS
} from '@/constants/engineer';

interface StatusHistoryTabProps {
  engineer: EngineerDetail;
}

export const StatusHistoryTab: React.FC<StatusHistoryTabProps> = ({ engineer }) => {
  const getStatusColor = (status: EngineerStatus): string => {
    return ENGINEER_STATUS_COLORS[status] || 'default';
  };

  if (engineer.statusHistory.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          ステータス変更履歴がありません
        </Typography>
      </Box>
    );
  }

  // 履歴を新しい順にソート
  const sortedHistory = [...engineer.statusHistory].sort((a, b) => 
    new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  // ステータス別の統計
  const statusStats = engineer.statusHistory.reduce((acc, history) => {
    acc[history.newStatus] = (acc[history.newStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Box>
      {/* 現在のステータス */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.50' }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          現在のステータス
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={ENGINEER_STATUS_LABELS[engineer.user.engineerStatus]}
            color={getStatusColor(engineer.user.engineerStatus) as any}
            size="large"
          />
          <Typography variant="body2" color="text.secondary">
            最終更新: {formatDate(engineer.user.updatedAt)}
          </Typography>
        </Box>
      </Paper>

      {/* ステータス変更履歴 */}
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryIcon />
        変更履歴
      </Typography>

      <List>
        {sortedHistory.map((history, index) => (
          <React.Fragment key={history.id}>
            <ListItem
              sx={{
                bgcolor: index === 0 ? 'action.hover' : 'transparent',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <ListItemIcon>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                  <StatusChangeIcon />
                </Avatar>
              </ListItemIcon>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {history.previousStatus && (
                      <>
                        <Chip 
                          label={ENGINEER_STATUS_LABELS[history.previousStatus]}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: ENGINEER_STATUS_COLORS[history.previousStatus] }}
                        />
                        <ArrowIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                      </>
                    )}
                    <Chip 
                      label={ENGINEER_STATUS_LABELS[history.newStatus]}
                      size="small"
                      color={getStatusColor(history.newStatus) as any}
                    />
                    {index === 0 && (
                      <Chip
                        label="最新"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    {history.reason && (
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        理由: {history.reason}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarIcon sx={{ fontSize: 14 }} />
                        {formatDate(history.changedAt)}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 14 }} />
                        {history.changedByUser 
                          ? `${history.changedByUser.sei} ${history.changedByUser.mei}` 
                          : history.changedBy}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </ListItem>
            
            {index < sortedHistory.length - 1 && (
              <Divider variant="inset" component="li" />
            )}
          </React.Fragment>
        ))}
      </List>

      {/* ステータス統計 */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          ステータス変更統計
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {Object.entries(statusStats).map(([status, count]) => (
            <Chip
              key={status}
              label={`${ENGINEER_STATUS_LABELS[status as EngineerStatus]}: ${count}回`}
              size="small"
              sx={{ 
                bgcolor: `${ENGINEER_STATUS_COLORS[status as EngineerStatus]}20`,
                borderColor: ENGINEER_STATUS_COLORS[status as EngineerStatus],
                border: 1,
              }}
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          総変更回数: {engineer.statusHistory.length}回
        </Typography>
      </Box>
    </Box>
  );
};