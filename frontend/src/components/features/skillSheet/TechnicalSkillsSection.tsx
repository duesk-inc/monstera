import React from 'react';
import { Box, Typography, Chip, Card, CardContent } from '@mui/material';
import { Code as CodeIcon } from '@mui/icons-material';
import { TechnicalSkill } from '@/types/skillSheet';
import { SectionHeader } from '@/components/common/layout';

interface TechnicalSkillsSectionProps {
  technicalSkills: TechnicalSkill[];
}

/**
 * 技術スキル概要を表示するセクションコンポーネント
 * 
 * @deprecated このコンポーネントは管理者向け機能として設計されています。
 * 現在はエンジニア画面では使用されていません。
 * 管理者画面実装時に再利用してください。
 * 詳細: /docs/04_development/technical-skills-summary-specification.md
 */
export const TechnicalSkillsSection: React.FC<TechnicalSkillsSectionProps> = ({
  technicalSkills,
}) => {
  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <SectionHeader
          title="技術スキル概要"
          subtitle="プロジェクトで使用された技術の一覧"
          icon={<CodeIcon color="primary" />}
        />

        <Box sx={{ mt: 3 }}>
          {technicalSkills.map((skillCategory, index) => (
            <Box key={index} sx={{ mb: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ 
                  mb: 2, 
                  fontWeight: 'medium',
                  color: 'primary.main'
                }}
              >
                {skillCategory.displayName}
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {skillCategory.technologies.map((tech, techIndex) => (
                  <Chip
                    key={techIndex}
                    label={tech}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'rgba(46, 125, 50, 0.08)',
                        borderColor: 'primary.dark',
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          ))}
          
          {technicalSkills.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              技術スキルが登録されていません。<br />
              職務経歴に技術項目を追加すると、ここに表示されます。
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};