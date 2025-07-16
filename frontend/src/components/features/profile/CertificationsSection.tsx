import React, { useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Stack, 
  IconButton,
} from '@mui/material';
import { 
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { UseFormReturn, useWatch, Controller } from 'react-hook-form';
import { ProfileFormData, UserProfile } from '@/types/profile';
import ActionButton from '@/components/common/ActionButton';
import { FormDatePicker, CertificationInput } from '@/components/common/forms';
import { getCareerMinDate } from '@/constants/date';

// 型定義
interface CertificationField {
  name: string;
  acquiredAt: Date | null;
}

interface CertificationsSectionProps {
  formMethods: UseFormReturn<ProfileFormData>;
  profile?: UserProfile | null;
  isTempSaved?: boolean;
}

/**
 * 資格情報セクションコンポーネント
 * 保有資格・認定証の追加・削除・編集を管理
 */
export const CertificationsSection: React.FC<CertificationsSectionProps> = ({
  formMethods,
  profile,
  isTempSaved = false,
}) => {
  const { 
    control, 
    register, 
    formState: { errors },
    getValues,
    setValue,
    watch,
    setError,
    clearErrors,
  } = formMethods;

  // React Hook Formのフィールド配列を監視
  const certificationFields = useWatch({
    control,
    name: 'certifications'
  }) || [{ name: '', acquiredAt: null }];

  // リアルタイムバリデーションは削除（保存時のみチェック）


  // FieldArrayのappendとremove関数
  const appendCertification = (data: CertificationField) => {
    const current = getValues().certifications || [];
    setValue('certifications', [...current, data]);
  };

  const removeCertification = (index: number) => {
    const current = getValues().certifications || [];
    // 資格は任意項目なので、すべて削除可能
    const newCertifications = current.filter((_, i) => i !== index);
    
    // 空配列の場合でも、最低1つの空のフィールドを保持
    if (newCertifications.length === 0) {
      // 非同期で実行して、レンダリングサイクルを分離
      setTimeout(() => {
        setValue('certifications', [{ name: '', acquiredAt: null }]);
        // 関連するエラーをクリア
        clearErrors('certifications');
      }, 0);
    } else {
      setValue('certifications', newCertifications);
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>保有資格・認定証</Typography>
      
      {certificationFields.map((field: CertificationField, index: number) => (
        <Stack 
          key={index} 
          direction={{ xs: 'column', md: 'row' }} 
          spacing={2} 
          sx={{ mb: 2, alignItems: 'flex-start' }}
        >
          <Controller
            name={`certifications.${index}.name` as const}
            control={control}
            render={({ field }) => (
              <Box sx={{ flex: { md: 2 }, width: '100%' }}>
                <CertificationInput
                  value={field.value || ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={!!errors.certifications?.[index]?.name}
                  helperText={errors.certifications?.[index]?.name?.message}
                  isSaved={isTempSaved || (profile?.currentVersion && profile.currentVersion > 0) || false}
                  existingCertifications={certificationFields.map(cert => cert.name)}
                  currentIndex={index}
                />
              </Box>
            )}
          />
          
          <FormDatePicker
            name={`certifications.${index}.acquiredAt` as const}
            control={control}
            label="取得年月"
            mode="month-year"
            minDate={getCareerMinDate()}
            maxDate={new Date()}
            error={errors.certifications?.[index]?.acquiredAt}
            textFieldProps={{ sx: { flex: { md: 1 } } }}
            rules={{
              validate: (value) => {
                const certifications = getValues().certifications || [];
                const cert = certifications[index];
                const hasName = cert?.name && cert.name.trim() !== '';
                const hasDate = !!value;
                
                if (hasName && !hasDate) {
                  return '資格名を入力済みの場合は取得年月を入力してください';
                }
                return true;
              }
            }}
          />
          
          <IconButton 
            onClick={() => removeCertification(index)}
            sx={{ 
              mt: { xs: 0, md: 1 },
              alignSelf: { xs: 'flex-end', md: 'flex-start' }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      ))}
      
      <ActionButton
        buttonType="secondary"
        startIcon={<AddIcon />}
        onClick={() => appendCertification({ name: '', acquiredAt: null })}
        sx={{ mt: 1 }}
      >
        資格を追加
      </ActionButton>
    </Box>
  );
}; 