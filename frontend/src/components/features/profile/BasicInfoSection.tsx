import React from 'react';
import { 
  Box, 
  TextField, 
  Stack, 
} from '@mui/material';
import { Controller, UseFormReturn } from 'react-hook-form';
import { ProfileFormData } from '@/types/profile';
import { FormRadioGroup } from '@/components/common';

// 出張可否オプション
const travelOptions = [
  { value: '1', label: '可能' },
  { value: '2', label: '不可' },
  { value: '3', label: '要相談' },
];

interface BasicInfoSectionProps {
  formMethods: UseFormReturn<ProfileFormData>;
}

/**
 * 基本情報セクションコンポーネント
 * 教育歴、最寄駅、出張可否を管理
 */
export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  formMethods,
}) => {
  const { 
    control, 
    formState: { errors },
  } = formMethods;

  return (
    <Box sx={{ mb: 4 }}>
      <Stack spacing={2}>
        {/* 基本情報タブから移動した項目 */}
        <Controller
          name="education"
          control={control}
          rules={{ required: '最終学歴を入力してください' }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="最終学歴"
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              fullWidth
            />
          )}
        />
        
        <Controller
          name="nearestStation"
          control={control}
          rules={{ required: '最寄駅を入力してください' }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="最寄駅"
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              fullWidth
            />
          )}
        />
        
        <FormRadioGroup
          name="canTravel"
          control={control}
          label="出張可否"
          options={travelOptions}
          direction="row"
          required
          error={errors.canTravel}
        />
      </Stack>
    </Box>
  );
}; 