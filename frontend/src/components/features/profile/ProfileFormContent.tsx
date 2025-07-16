import React from 'react';
import { 
  Box, 
  Divider, 
  CircularProgress,
  Alert,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { UseFormReturn } from 'react-hook-form';
import { UserProfile, ProfileFormData } from '@/types/profile';
import { BasicInfoSection } from './BasicInfoSection';
import { CertificationsSection } from './CertificationsSection';
import { AppealPointsSection } from './AppealPointsSection';

interface ProfileFormContentProps {
  tabIndex: number;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  formMethods: UseFormReturn<ProfileFormData>;
  isTempSaved?: boolean;
}

export const ProfileFormContent: React.FC<ProfileFormContentProps> = ({
  tabIndex,
  profile,
  isLoading,
  error,
  formMethods,
  isTempSaved = false,
}) => {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      {/* 基本プロフィール情報のみ表示（職務経歴はスキルシート画面に移動） */}
      <BasicInfoSection formMethods={formMethods} />
      
      <Divider sx={{ my: 3 }} />
      
      <CertificationsSection formMethods={formMethods} profile={profile} isTempSaved={isTempSaved} />
      
      <Divider sx={{ my: 3 }} />
      
      <AppealPointsSection formMethods={formMethods} />
    </LocalizationProvider>
  );
}; 