import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Computer as RemoteIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Money as MoneyIcon,
  Videocam as VideoIcon,
  Business as CompanyIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import ActionButton from '@/components/common/ActionButton';

interface ProjectItem {
  id: string | number;
  name: string;
  category: string;
  startDate: Date;
  endDate: Date;
  expectedDailyRate: string;
  company: string;
  location: string;
  status: string;
  applicationDeadline?: Date;
  interviewCount?: number;
  nearestStation?: string;
  isFullRemote?: boolean;
}

interface ProjectCardProps {
  project: ProjectItem;
  onCardClick: (project: ProjectItem) => void;
  onDetailClick: (projectId: string | number) => void;
}

const formatProjectPeriod = (startDate: Date, endDate: Date) => {
  return `${format(startDate, 'yyyy/MM/dd', { locale: ja })} 〜 ${format(endDate, 'yyyy/MM/dd', { locale: ja })}`;
};

export default function ProjectCard({
  project,
  onCardClick,
  onDetailClick,
}: ProjectCardProps) {
  const theme = useTheme();

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-4px)',
        },
      }}
      onClick={() => onCardClick(project)}
    >
      <Box sx={{ 
        p: 2, 
        pb: 1, 
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
          <Chip
            label={project.category}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ height: 22, fontSize: theme.typography.caption.fontSize }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            ID: {project.id}
          </Typography>
        </Box>
        <Typography variant="h6" component="h2" gutterBottom sx={{ lineHeight: 1.3 }}>
          {project.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          <CompanyIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
          {project.company}
        </Typography>
      </Box>
      
      <CardContent sx={{ flexGrow: 1, pt: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <CalendarIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {formatProjectPeriod(project.startDate, project.endDate)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <LocationIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
          <Typography variant="body2" color="text.secondary" noWrap>
            {project.location}（{project.nearestStation}）
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <MoneyIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {project.expectedDailyRate}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <VideoIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            面談: {project.interviewCount}回
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            <RemoteIcon fontSize="small" sx={{ color: project.isFullRemote ? 'success.main' : 'text.disabled' }} />
            <Typography variant="caption" color={project.isFullRemote ? 'success.main' : 'text.disabled'} sx={{ ml: 0.5 }}>
              {project.isFullRemote ? 'リモート可' : '常駐'}
            </Typography>
          </Box>
        </Box>
      </CardContent>
      
      <Box sx={{ p: 2, pt: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center' }}>
            <CalendarIcon fontSize="inherit" sx={{ mr: 0.5 }} />
            応募期限: {project.applicationDeadline ? format(project.applicationDeadline, 'yyyy/MM/dd') : '—'}
          </Typography>
        </Box>
        <ActionButton
          buttonType="primary"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDetailClick(project.id);
          }}
        >
          詳細を見る
        </ActionButton>
      </Box>
    </Card>
  );
} 