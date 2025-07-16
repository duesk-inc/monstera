import React from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Stack, 
  IconButton,
} from '@mui/material';
import { 
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { ProfileFormData } from '@/types/profile';
import ActionButton from '@/components/common/ActionButton';

interface TechnologiesSectionProps {
  workHistoryIndex: number;
  formMethods: UseFormReturn<ProfileFormData>;
}

/**
 * 技術項目セクションコンポーネント
 * 使用言語／ライブラリ、サーバーOS／DBサーバー、ツール等の追加・削除・編集を管理
 */
export const TechnologiesSection: React.FC<TechnologiesSectionProps> = ({
  workHistoryIndex,
  formMethods,
}) => {
  const { 
    control, 
    register, 
    formState: { errors },
    getValues,
    setValue,
  } = formMethods;

  // React Hook Formのフィールド配列を監視
  const programmingLanguages = useWatch({
    control,
    name: `workHistory.${workHistoryIndex}.programmingLanguages`
  }) || [''];

  const serversDatabases = useWatch({
    control,
    name: `workHistory.${workHistoryIndex}.serversDatabases`
  }) || [''];

  const tools = useWatch({
    control,
    name: `workHistory.${workHistoryIndex}.tools`
  }) || [''];

  // 技術項目の追加・削除処理
  const appendTechnology = (categoryType: 'programmingLanguages' | 'serversDatabases' | 'tools') => {
    const current = getValues().workHistory[workHistoryIndex][categoryType] || [];
    setValue(`workHistory.${workHistoryIndex}.${categoryType}`, [...current, '']);
  };

  const removeTechnology = (categoryType: 'programmingLanguages' | 'serversDatabases' | 'tools', index: number) => {
    const current = getValues().workHistory[workHistoryIndex][categoryType] || [];
    if (current.length > 1 || index > 0) {
      setValue(`workHistory.${workHistoryIndex}.${categoryType}`, current.filter((_, i) => i !== index));
    }
  };

  // 技術項目の表示・入力コンポーネント
  const renderTechnologyInputs = (
    categoryType: 'programmingLanguages' | 'serversDatabases' | 'tools',
    categoryLabel: string,
    items: string[]
  ) => {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
          {categoryLabel}
        </Typography>
        
        {items.map((item: string, index: number) => (
          <Stack 
            key={index} 
            direction="row" 
            spacing={2} 
            sx={{ mb: 1.5, alignItems: 'flex-start' }}
          >
            <TextField
              label={`${categoryLabel}${index + 1}`}
              {...register(`workHistory.${workHistoryIndex}.${categoryType}.${index}` as const)}
              error={!!errors.workHistory?.[workHistoryIndex]?.[categoryType]?.[index]}
              helperText={errors.workHistory?.[workHistoryIndex]?.[categoryType]?.[index]?.message}
              fullWidth
              size="small"
            />
            
            <IconButton 
              onClick={() => removeTechnology(categoryType, index)}
              disabled={items.length === 1 && index === 0}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Stack>
        ))}
        
        <ActionButton
          buttonType="secondary"
          startIcon={<AddIcon />}
          onClick={() => appendTechnology(categoryType)}
          size="small"
          sx={{ mt: 1 }}
        >
          {categoryLabel}を追加
        </ActionButton>
      </Box>
    );
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>使用技術</Typography>
      
      {renderTechnologyInputs(
        'programmingLanguages',
        '使用言語／ライブラリ',
        programmingLanguages
      )}
      
      {renderTechnologyInputs(
        'serversDatabases',
        'サーバーOS／DBサーバー',
        serversDatabases
      )}
      
      {renderTechnologyInputs(
        'tools',
        'ツール等',
        tools
      )}
    </Box>
  );
}; 