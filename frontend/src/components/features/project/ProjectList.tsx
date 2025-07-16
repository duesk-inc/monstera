import React from 'react';
import {
  Box,
  CircularProgress,
} from '@mui/material';
import { EmptyState } from '@/components/common/layout';
import ProjectCard from './ProjectCard';

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

interface ProjectListProps {
  projects: ProjectItem[];
  isLoading: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  onCardClick: (project: ProjectItem) => void;
  onDetailClick: (projectId: string | number) => void;
}

export default function ProjectList({
  projects,
  isLoading,
  emptyMessage = "案件が見つかりません",
  emptyDescription = "条件に一致する案件はありません。",
  onCardClick,
  onDetailClick,
}: ProjectListProps) {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        type="empty"
        message={emptyMessage}
        description={emptyDescription}
      />
    );
  }

  return (
    <Box sx={{ 
      display: 'grid',
      gridTemplateColumns: {
        xs: '1fr',
        md: 'repeat(2, 1fr)',
        lg: 'repeat(3, 1fr)'
      },
      gap: 3
    }}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onCardClick={onCardClick}
          onDetailClick={onDetailClick}
        />
      ))}
    </Box>
  );
} 