import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import {
  Code as CodeIcon,
} from '@mui/icons-material';
import { EngineerDetail, EngineerSkill } from '@/types/engineer';
import { formatDate } from '@/utils/dateUtils';
import {
  SKILL_LEVEL_LABELS,
  SKILL_LEVEL_COLORS
} from '@/constants/engineer';

interface SkillInfoTabProps {
  engineer: EngineerDetail;
}

export const SkillInfoTab: React.FC<SkillInfoTabProps> = ({ engineer }) => {
  const getSkillLevelColor = (level: number): string => {
    return SKILL_LEVEL_COLORS[level] || '#9e9e9e';
  };

  // スキルをカテゴリー別にグループ化
  const skillsByCategory = engineer.skills.reduce((acc, skill) => {
    const categoryName = skill.skillCategory?.name || 'その他';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(skill);
    return acc;
  }, {} as Record<string, EngineerSkill[]>);

  // カテゴリーをソート
  const sortedCategories = Object.keys(skillsByCategory).sort();

  if (engineer.skills.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <CodeIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          スキルが登録されていません
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {sortedCategories.map((category, index) => (
        <Box key={category} sx={{ mb: 4 }}>
          {index > 0 && <Divider sx={{ mb: 3 }} />}
          
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon />
            {category}
          </Typography>

          <Grid container spacing={2}>
            {skillsByCategory[category].map((skill) => (
              <Grid key={skill.id} size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {skill.skillName}
                    </Typography>
                    <Chip
                      label={SKILL_LEVEL_LABELS[skill.skillLevel]}
                      size="small"
                      sx={{ 
                        backgroundColor: getSkillLevelColor(skill.skillLevel),
                        color: 'white'
                      }}
                    />
                  </Box>
                  
                  {skill.experience && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {skill.experience}
                    </Typography>
                  )}
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    {skill.yearsOfExperience && (
                      <Typography variant="caption" color="text.secondary">
                        経験年数: {skill.yearsOfExperience}年
                      </Typography>
                    )}
                    {skill.lastUsedDate && (
                      <Typography variant="caption" color="text.secondary">
                        最終使用: {formatDate(skill.lastUsedDate)}
                      </Typography>
                    )}
                  </Box>
                  
                  {skill.isCertified && (
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label="資格保有"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
      
      {/* スキルサマリー */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          スキルサマリー
        </Typography>
        <Grid container spacing={2}>
          <Grid size={6}>
            <Typography variant="body2" color="text.secondary">
              総スキル数: {engineer.skills.length}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="body2" color="text.secondary">
              カテゴリ数: {sortedCategories.length}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="body2" color="text.secondary">
              エキスパートレベル: {engineer.skills.filter(s => s.skillLevel >= 4).length}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="body2" color="text.secondary">
              資格保有: {engineer.skills.filter(s => s.isCertified).length}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};