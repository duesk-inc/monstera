import React from 'react';
import { Box } from '@mui/material';
import { UseFormReturn } from 'react-hook-form';
import { SkillSheet, SkillSheetFormData } from '@/types/skillSheet';
import { WorkHistoryContentCards } from './WorkHistoryContentCards';
import { TechnicalSkillsSection } from './TechnicalSkillsSection';
import { ProfileActionButtons } from '@/components/common/ProfileActionButtons';

interface SkillSheetContentProps {
  skillSheet: SkillSheet | null;
  formMethods: UseFormReturn<SkillSheetFormData>;
  onSubmit: () => void;
  onTempSave: () => void;
  isSubmitting: boolean;
  isTempSaved: boolean;
}

/**
 * スキルシートのメインコンテンツコンポーネント
 */
export const SkillSheetContent: React.FC<SkillSheetContentProps> = ({
  skillSheet,
  formMethods,
  onSubmit,
  onTempSave,
  isSubmitting,
  isTempSaved,
}) => {
  return (
    <Box>
      {/* 職務経歴セクション */}
      <WorkHistoryContentCards 
        formMethods={formMethods}
      />

      {/* 技術スキル概要セクション */}
      {skillSheet?.technicalSkills && skillSheet.technicalSkills.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <TechnicalSkillsSection 
            technicalSkills={skillSheet.technicalSkills}
          />
        </Box>
      )}

      {/* フッターアクションボタン */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <ProfileActionButtons
          onTempSave={onTempSave}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          isTempSaved={isTempSaved}
          variant="footer"
        />
      </Box>
    </Box>
  );
};