import React from 'react';
import {
  Chip,
  Tooltip,
  Box,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Code as CodeIcon,
  Storage as StorageIcon,
  Build as BuildIcon,
} from '@mui/icons-material';

const StyledChip = styled(Chip)<{ category?: string }>(({ theme, category }) => {
  let color = theme.palette.primary.main;
  let backgroundColor = theme.palette.primary.light;
  
  switch (category) {
    case 'programming_languages':
      color = theme.palette.success.main;
      backgroundColor = theme.palette.success.light;
      break;
    case 'servers_databases':
      color = theme.palette.warning.main;
      backgroundColor = theme.palette.warning.light;
      break;
    case 'tools':
      color = theme.palette.info.main;
      backgroundColor = theme.palette.info.light;
      break;
    default:
      break;
  }

  return {
    color,
    backgroundColor: `${backgroundColor}20`,
    borderColor: color,
    '& .MuiChip-icon': {
      color,
    },
    '&:hover': {
      backgroundColor: `${backgroundColor}40`,
    },
  };
});

const CategoryIcon: React.FC<{ category: string }> = ({ category }) => {
  switch (category) {
    case 'programming_languages':
      return <CodeIcon />;
    case 'servers_databases':
      return <StorageIcon />;
    case 'tools':
      return <BuildIcon />;
    default:
      return <CodeIcon />;
  }
};

interface TechnologyChipProps {
  technology: string;
  category?: 'programming_languages' | 'servers_databases' | 'tools';
  experienceText?: string;
  projectCount?: number;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  showIcon?: boolean;
  onDelete?: () => void;
  onClick?: () => void;
  clickable?: boolean;
}

export const TechnologyChip: React.FC<TechnologyChipProps> = ({
  technology,
  category,
  experienceText,
  projectCount,
  size = 'small',
  variant = 'outlined',
  showIcon = false,
  onDelete,
  onClick,
  clickable = false,
}) => {
  const tooltipContent = () => {
    const parts = [];
    
    if (experienceText) {
      parts.push(`経験: ${experienceText}`);
    }
    
    if (projectCount !== undefined) {
      parts.push(`プロジェクト: ${projectCount}件`);
    }
    
    if (category) {
      const categoryMap = {
        programming_languages: 'プログラミング言語',
        servers_databases: 'サーバー・DB',
        tools: 'ツール',
      };
      parts.push(`カテゴリ: ${categoryMap[category]}`);
    }
    
    return parts.length > 0 ? parts.join(' / ') : technology;
  };

  const chipElement = (
    <StyledChip
      label={technology}
      category={category}
      size={size}
      variant={variant}
      icon={showIcon && category ? <CategoryIcon category={category} /> : undefined}
      onDelete={onDelete}
      onClick={clickable ? onClick : undefined}
      clickable={clickable}
    />
  );

  if (experienceText || projectCount !== undefined || category) {
    return (
      <Tooltip title={tooltipContent()} arrow>
        {chipElement}
      </Tooltip>
    );
  }

  return chipElement;
};

interface TechnologyChipGroupProps {
  technologies: string[];
  category?: 'programming_languages' | 'servers_databases' | 'tools';
  maxDisplay?: number;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  showIcon?: boolean;
  onTechnologyClick?: (technology: string) => void;
  onTechnologyRemove?: (technology: string) => void;
}

export const TechnologyChipGroup: React.FC<TechnologyChipGroupProps> = ({
  technologies,
  category,
  maxDisplay = 5,
  size = 'small',
  variant = 'outlined',
  showIcon = false,
  onTechnologyClick,
  onTechnologyRemove,
}) => {
  const displayTechnologies = technologies.slice(0, maxDisplay);
  const remainingCount = technologies.length - maxDisplay;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {displayTechnologies.map((tech, index) => (
        <TechnologyChip
          key={index}
          technology={tech}
          category={category}
          size={size}
          variant={variant}
          showIcon={showIcon}
          clickable={!!onTechnologyClick}
          onClick={() => onTechnologyClick?.(tech)}
          onDelete={onTechnologyRemove ? () => onTechnologyRemove(tech) : undefined}
        />
      ))}
      
      {remainingCount > 0 && (
        <Chip
          label={`+${remainingCount}個`}
          size={size}
          variant="outlined"
          color="default"
        />
      )}
    </Box>
  );
};

interface TechnologyGridProps {
  programmingLanguages?: string[];
  serversDatabases?: string[];
  tools?: string[];
  maxDisplayPerCategory?: number;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  showIcons?: boolean;
  showCategoryLabels?: boolean;
  onTechnologyClick?: (technology: string, category: string) => void;
  onTechnologyRemove?: (technology: string, category: string) => void;
}

export const TechnologyGrid: React.FC<TechnologyGridProps> = ({
  programmingLanguages = [],
  serversDatabases = [],
  tools = [],
  maxDisplayPerCategory = 5,
  size = 'small',
  variant = 'outlined',
  showIcons = true,
  showCategoryLabels = true,
  onTechnologyClick,
  onTechnologyRemove,
}) => {
  const categories = [
    {
      key: 'programming_languages' as const,
      label: 'プログラミング言語',
      technologies: programmingLanguages,
      icon: <CodeIcon />,
    },
    {
      key: 'servers_databases' as const,
      label: 'サーバー・DB',
      technologies: serversDatabases,
      icon: <StorageIcon />,
    },
    {
      key: 'tools' as const,
      label: 'ツール',
      technologies: tools,
      icon: <BuildIcon />,
    },
  ].filter(category => category.technologies.length > 0);

  if (categories.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {categories.map(({ key, label, technologies, icon }) => (
        <Box key={key}>
          {showCategoryLabels && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              {showIcons && icon}
              <Box component="span" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {label}
              </Box>
            </Box>
          )}
          
          <TechnologyChipGroup
            technologies={technologies}
            category={key}
            maxDisplay={maxDisplayPerCategory}
            size={size}
            variant={variant}
            showIcon={showIcons && !showCategoryLabels}
            onTechnologyClick={
              onTechnologyClick ? (tech) => onTechnologyClick(tech, key) : undefined
            }
            onTechnologyRemove={
              onTechnologyRemove ? (tech) => onTechnologyRemove(tech, key) : undefined
            }
          />
        </Box>
      ))}
    </Box>
  );
};

export default TechnologyChip;