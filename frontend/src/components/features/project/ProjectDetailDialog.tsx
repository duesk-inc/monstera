import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Divider,
  useMediaQuery,
} from '@mui/material';
import {
  Work as WorkIcon,
  LocationOn as LocationIcon,
  Computer as RemoteIcon,
  AccessTime as TimeIcon,
  Business as CompanyIcon,
  CalendarToday as CalendarIcon,
  Money as MoneyIcon,
  Videocam as VideoIcon,
  Backpack as BackpackIcon,
  WbIncandescent as SkillIcon,
  Checkroom as ClothesIcon,
  Info as InfoIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useTheme } from '@mui/material/styles';
import ActionButton from '@/components/common/ActionButton';
import { InfoDialog } from '@/components/common';

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
  workingHours?: string;
  skillRequirements?: string;
  details?: string;
  dress?: string;
  notes?: string;
}

interface ProjectDetailDialogProps {
  open: boolean;
  project: ProjectItem | null;
  onClose: () => void;
  onApply?: (projectId: string | number) => void;
}

const formatProjectPeriod = (startDate: Date, endDate: Date) => {
  return `${format(startDate, 'yyyy/MM/dd', { locale: ja })} 〜 ${format(endDate, 'yyyy/MM/dd', { locale: ja })}`;
};

const calculateRemainingDays = (deadline?: Date) => {
  if (!deadline) return 0;
  const today = new Date();
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export default function ProjectDetailDialog({
  open,
  project,
  onClose,
  onApply,
}: ProjectDetailDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!project) {
    return null;
  }

  return (
    <InfoDialog
      open={open}
      onClose={onClose}
      title={project.name}
      subtitle="案件詳細情報"
      icon={<WorkIcon />}
      maxWidth="md"
      fullScreen={isMobile}
      actions={
        <>
          <ActionButton
            buttonType="cancel"
            onClick={onClose}
          >
            閉じる
          </ActionButton>
          <ActionButton
            buttonType="secondary"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = `/project/edit?id=${project.id}`;
              }
            }}
          >
            編集する
          </ActionButton>
          <ActionButton
            buttonType="primary"
            onClick={() => {
              if (onApply) {
                onApply(project.id);
              }
              onClose();
            }}
          >
            この案件に応募する
          </ActionButton>
        </>
      }
    >
      <Box sx={{ mb: 2 }}>
        <Chip
          label={project.category}
          size="small"
          color="primary"
        />
      </Box>
      
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 3
      }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <CompanyIcon sx={{ mr: 1, color: 'primary.main' }} />
            企業情報
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1">
              {project.company}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <LocationIcon fontSize="small" sx={{ mr: 0.5 }} />
              {project.location}（{project.nearestStation}）
            </Typography>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <CalendarIcon sx={{ mr: 1, color: 'primary.main' }} />
            案件期間・勤務情報
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ArrowForwardIcon fontSize="small" sx={{ mr: 0.5 }} />
              期間: {formatProjectPeriod(project.startDate, project.endDate)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TimeIcon fontSize="small" sx={{ mr: 0.5 }} />
              勤務時間: {project.workingHours}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <RemoteIcon fontSize="small" sx={{ mr: 0.5 }} />
              リモート: {project.isFullRemote ? 'フルリモート可' : '常駐あり'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ClothesIcon fontSize="small" sx={{ mr: 0.5 }} />
              服装: {project.dress}
            </Typography>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
            単価・面談情報
          </Typography>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ArrowForwardIcon fontSize="small" sx={{ mr: 0.5 }} />
              想定単価: {project.expectedDailyRate}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <VideoIcon fontSize="small" sx={{ mr: 0.5 }} />
              面談回数: {project.interviewCount}回
            </Typography>
            <Typography 
              variant="body2" 
              color="error" 
              sx={{ display: 'flex', alignItems: 'center', mb: 1, fontWeight: 'bold' }}
            >
              <TimeIcon fontSize="small" sx={{ mr: 0.5 }} />
              応募期限: {project.applicationDeadline ? format(project.applicationDeadline, 'yyyy/MM/dd') : '—'}
              {project.applicationDeadline && (
                <>（残り{calculateRemainingDays(project.applicationDeadline)}日）</>
              )}
            </Typography>
          </Box>
        </Box>
        
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <SkillIcon sx={{ mr: 1, color: 'primary.main' }} />
            スキル要件
          </Typography>
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
            <Box>
              {(project.skillRequirements || '').split(',').map((skill, index) => (
                <Chip
                  key={index}
                  label={skill.trim()}
                  size="small"
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          </Box>
          
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <BackpackIcon sx={{ mr: 1, color: 'primary.main' }} />
            案件詳細
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {project.details}
            </Typography>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
            注意事項・特記事項
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {project.notes}
            </Typography>
          </Box>
        </Box>
      </Box>
    </InfoDialog>
  );
} 
