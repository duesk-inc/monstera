import React from 'react';
import { 
  Box, 
  Typography, 
} from '@mui/material';
import { UseFormReturn } from 'react-hook-form';
import { ProfileFormData } from '@/types/profile';
import { FormTextArea } from '@/components/common';

interface AppealPointsSectionProps {
  formMethods: UseFormReturn<ProfileFormData>;
}

/**
 * アピールポイントセクションコンポーネント
 * スキルや経験のアピールポイント入力を管理
 */
export const AppealPointsSection: React.FC<AppealPointsSectionProps> = ({
  formMethods,
}) => {
  const { register, watch } = formMethods;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>アピールポイント</Typography>
      
      <FormTextArea
        register={register('appealPoints')}
        label="アピールポイント"
        rows={10}
        placeholder="あなたのスキルや経験のアピールポイントを入力してください"
        value={watch('appealPoints')}
      />
    </Box>
  );
}; 