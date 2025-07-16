import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import Grid from '@mui/material/Grid';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonChecked as OngoingIcon,
} from '@mui/icons-material';
import { EngineerDetail } from '@/types/engineer';
import { formatDate } from '@/utils/dateUtils';

interface ProjectHistoryTabProps {
  engineer: EngineerDetail;
}

export const ProjectHistoryTab: React.FC<ProjectHistoryTabProps> = ({ engineer }) => {
  if (engineer.projectHistory.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <AssignmentIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          プロジェクト履歴がありません
        </Typography>
      </Box>
    );
  }

  // プロジェクトを終了日でソート（進行中のプロジェクトを最初に）
  const sortedProjects = [...engineer.projectHistory].sort((a, b) => {
    if (!a.endDate && b.endDate) return -1;
    if (a.endDate && !b.endDate) return 1;
    if (!a.endDate && !b.endDate) {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    }
    if (a.endDate && b.endDate) {
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
    }
    return 0;
  });

  const calculateDuration = (startDate: string, endDate?: string | null): string => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    
    if (months < 1) {
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return `${days}日`;
    } else if (months < 12) {
      return `${months}ヶ月`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return remainingMonths > 0 ? `${years}年${remainingMonths}ヶ月` : `${years}年`;
    }
  };

  return (
    <Box>
      <Timeline position="alternate">
        {sortedProjects.map((history, index) => (
          <TimelineItem key={history.id}>
            <TimelineOppositeContent sx={{ m: 'auto 0' }}>
              <Typography variant="body2" color="text.secondary">
                {formatDate(history.startDate)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                〜
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {history.endDate ? formatDate(history.endDate) : '現在'}
              </Typography>
              <Typography variant="caption" color="primary">
                ({calculateDuration(history.startDate, history.endDate)})
              </Typography>
            </TimelineOppositeContent>
            
            <TimelineSeparator>
              <TimelineConnector sx={{ bgcolor: index === 0 && !history.endDate ? 'primary.main' : 'grey.400' }} />
              <TimelineDot color={!history.endDate ? 'primary' : 'grey'}>
                {!history.endDate ? <OngoingIcon /> : <CheckCircleIcon />}
              </TimelineDot>
              <TimelineConnector sx={{ bgcolor: index === sortedProjects.length - 1 ? 'transparent' : 'grey.400' }} />
            </TimelineSeparator>
            
            <TimelineContent sx={{ py: '12px', px: 2 }}>
              <Box sx={{ 
                p: 2, 
                bgcolor: !history.endDate ? 'primary.50' : 'grey.50', 
                borderRadius: 1,
                border: 1,
                borderColor: !history.endDate ? 'primary.200' : 'divider'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6" component="span">
                    {history.project?.name || 'プロジェクト名未設定'}
                  </Typography>
                  {!history.endDate && (
                    <Chip label="進行中" size="small" color="primary" />
                  )}
                </Box>
                
                {history.project?.client && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {history.project.client}
                  </Typography>
                )}
                
                <Typography variant="body2" color="primary" gutterBottom>
                  役割: {history.role}
                </Typography>
                
                {history.description && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {history.description}
                  </Typography>
                )}
                
                {history.technologies && history.technologies.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {history.technologies.map((tech, idx) => (
                      <Chip 
                        key={idx} 
                        label={tech} 
                        size="small" 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                )}
                
                {history.teamSize && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    チーム規模: {history.teamSize}名
                  </Typography>
                )}
              </Box>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
      
      {/* プロジェクトサマリー */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          プロジェクトサマリー
        </Typography>
        <Grid container spacing={2}>
          <Grid size={6}>
            <Typography variant="body2" color="text.secondary">
              総プロジェクト数: {engineer.projectHistory.length}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="body2" color="text.secondary">
              進行中: {engineer.projectHistory.filter(p => !p.endDate).length}
            </Typography>
          </Grid>
          <Grid size={12}>
            <Typography variant="body2" color="text.secondary">
              最長プロジェクト期間: {
                engineer.projectHistory.length > 0 
                  ? calculateDuration(
                      sortedProjects.reduce((longest, current) => {
                        const currentDuration = new Date(current.endDate || new Date()).getTime() - new Date(current.startDate).getTime();
                        const longestDuration = new Date(longest.endDate || new Date()).getTime() - new Date(longest.startDate).getTime();
                        return currentDuration > longestDuration ? current : longest;
                      }).startDate,
                      sortedProjects.reduce((longest, current) => {
                        const currentDuration = new Date(current.endDate || new Date()).getTime() - new Date(current.startDate).getTime();
                        const longestDuration = new Date(longest.endDate || new Date()).getTime() - new Date(longest.startDate).getTime();
                        return currentDuration > longestDuration ? current : longest;
                      }).endDate
                    )
                  : '-'
              }
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};