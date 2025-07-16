import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Chip,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { TechnologyInput } from '../TechnologyInput';
import type { WorkHistoryFormData, TechnologyMasterData } from '../../../../types/workHistory';

const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
}));

const TechCategoryPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  backgroundColor: theme.palette.grey[50],
}));

const CategoryTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  marginBottom: theme.spacing(1.5),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const TechChipContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(1),
  minHeight: 60,
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px dashed ${theme.palette.divider}`,
}));

const HintText = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(1),
}));

interface WorkHistoryTechFormProps {
  formData: WorkHistoryFormData;
  errors: Record<string, string>;
  popularTechnologies: TechnologyMasterData[];
  onFieldChange: <K extends keyof WorkHistoryFormData>(field: K, value: WorkHistoryFormData[K]) => void;
  getFieldError: (field: string) => string | null;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'programmingLanguages':
      return '💻';
    case 'serversDatabases':
      return '🗄️';
    case 'tools':
      return '🔧';
    default:
      return '📌';
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'programmingLanguages':
      return 'プログラミング言語';
    case 'serversDatabases':
      return 'サーバー・データベース';
    case 'tools':
      return 'ツール・その他';
    default:
      return category;
  }
};

export const WorkHistoryTechForm: React.FC<WorkHistoryTechFormProps> = ({
  formData,
  errors,
  popularTechnologies,
  onFieldChange,
  getFieldError,
}) => {
  // カテゴリごとの人気技術を分類
  const popularByCategory = React.useMemo(() => {
    const categorized: Record<string, string[]> = {
      programmingLanguages: [],
      serversDatabases: [],
      tools: [],
    };

    popularTechnologies.forEach(tech => {
      if (tech.category && categorized[tech.category]) {
        categorized[tech.category].push(tech.name);
      }
    });

    return categorized;
  }, [popularTechnologies]);

  const handleRemoveTech = (category: 'programmingLanguages' | 'serversDatabases' | 'tools', tech: string) => {
    const currentTechs = formData[category] || [];
    onFieldChange(category, currentTechs.filter(t => t !== tech));
  };

  const getTotalTechCount = () => {
    return formData.programmingLanguages.length + 
           formData.serversDatabases.length + 
           formData.tools.length;
  };

  return (
    <Box>
      <FormSection>
        <SectionTitle variant="h6">
          使用技術・スキル
          {getTotalTechCount() > 0 && (
            <Chip 
              label={`合計: ${getTotalTechCount()}個`}
              size="small"
              color="primary"
              sx={{ ml: 2 }}
            />
          )}
        </SectionTitle>
        
        <Grid container spacing={2}>
          {/* プログラミング言語 */}
          <Grid item xs={12}>
            <TechCategoryPaper elevation={0}>
              <CategoryTitle>
                <span>{getCategoryIcon('programmingLanguages')}</span>
                {getCategoryLabel('programmingLanguages')}
                <Chip label={formData.programmingLanguages.length} size="small" />
              </CategoryTitle>
              
              <TechnologyInput
                value={formData.programmingLanguages}
                onChange={(technologies) => onFieldChange('programmingLanguages', technologies)}
                category="programmingLanguages"
                placeholder="使用したプログラミング言語を入力..."
                popularTechnologies={popularByCategory.programmingLanguages}
                maxTags={10}
                helperText="Java, Python, TypeScript, Go, Ruby など"
              />
              
              {formData.programmingLanguages.length > 0 && (
                <TechChipContainer>
                  {formData.programmingLanguages.map((tech, index) => (
                    <Chip
                      key={`lang-${index}`}
                      label={tech}
                      onDelete={() => handleRemoveTech('programmingLanguages', tech)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </TechChipContainer>
              )}
            </TechCategoryPaper>
          </Grid>

          {/* サーバー・データベース */}
          <Grid item xs={12}>
            <TechCategoryPaper elevation={0}>
              <CategoryTitle>
                <span>{getCategoryIcon('serversDatabases')}</span>
                {getCategoryLabel('serversDatabases')}
                <Chip label={formData.serversDatabases.length} size="small" />
              </CategoryTitle>
              
              <TechnologyInput
                value={formData.serversDatabases}
                onChange={(technologies) => onFieldChange('serversDatabases', technologies)}
                category="serversDatabases"
                placeholder="使用したサーバー・データベースを入力..."
                popularTechnologies={popularByCategory.serversDatabases}
                maxTags={10}
                helperText="MySQL, PostgreSQL, AWS, Docker, Nginx など"
              />
              
              {formData.serversDatabases.length > 0 && (
                <TechChipContainer>
                  {formData.serversDatabases.map((tech, index) => (
                    <Chip
                      key={`db-${index}`}
                      label={tech}
                      onDelete={() => handleRemoveTech('serversDatabases', tech)}
                      color="secondary"
                      variant="outlined"
                    />
                  ))}
                </TechChipContainer>
              )}
            </TechCategoryPaper>
          </Grid>

          {/* ツール・その他 */}
          <Grid item xs={12}>
            <TechCategoryPaper elevation={0}>
              <CategoryTitle>
                <span>{getCategoryIcon('tools')}</span>
                {getCategoryLabel('tools')}
                <Chip label={formData.tools.length} size="small" />
              </CategoryTitle>
              
              <TechnologyInput
                value={formData.tools}
                onChange={(technologies) => onFieldChange('tools', technologies)}
                category="tools"
                placeholder="使用したツール・フレームワークを入力..."
                popularTechnologies={popularByCategory.tools}
                maxTags={10}
                helperText="Git, React, Spring Boot, Jenkins, JIRA など"
              />
              
              {formData.tools.length > 0 && (
                <TechChipContainer>
                  {formData.tools.map((tech, index) => (
                    <Chip
                      key={`tool-${index}`}
                      label={tech}
                      onDelete={() => handleRemoveTech('tools', tech)}
                      color="success"
                      variant="outlined"
                    />
                  ))}
                </TechChipContainer>
              )}
            </TechCategoryPaper>
          </Grid>
        </Grid>
      </FormSection>

      {/* 入力のヒント */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          <strong>技術入力のポイント:</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2 }}>
          <li>プロジェクトで実際に使用した技術のみを記入してください</li>
          <li>バージョン情報も含めると具体的になります（例: React 18, Java 17）</li>
          <li>最低でも1つ以上の技術を入力してください</li>
          <li>技術名は正式名称で記入することを推奨します</li>
        </Typography>
      </Box>

      {/* エラー表示 */}
      {(getFieldError('programmingLanguages') || 
        getFieldError('serversDatabases') || 
        getFieldError('tools')) && (
        <Box sx={{ mt: 2 }}>
          {getFieldError('programmingLanguages') && (
            <Typography color="error" variant="body2">
              {getFieldError('programmingLanguages')}
            </Typography>
          )}
          {getFieldError('serversDatabases') && (
            <Typography color="error" variant="body2">
              {getFieldError('serversDatabases')}
            </Typography>
          )}
          {getFieldError('tools') && (
            <Typography color="error" variant="body2">
              {getFieldError('tools')}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default WorkHistoryTechForm;