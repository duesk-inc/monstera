'use client';

import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useProfile } from '@/hooks/profile/useProfile';
import { useProfileForm } from '@/hooks/profile/useProfileForm';
import { ProfileHeader } from '@/components/features/profile/ProfileHeader';
import { BasicInfoCard } from '@/components/features/profile/BasicInfoCard';
import { ProfileTabbedContent } from '@/components/features/profile/ProfileTabbedContent';
import { FormContainer, useToast, PageContainer } from '@/components/common';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { format } from 'date-fns';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';

export default function ProfilePage() {
  // 統一Toastシステムを使用
  const { showSuccess, showError } = useToast();
  
  // エラーハンドリングフックを使用
  const { handleError, getFieldErrors } = useEnhancedErrorHandler();
  
  // プロフィール情報の取得
  const { profile, workHistories, isLoading, error } = useProfile();
  
  // プロフィールフォームの状態管理
  const formMethods = useProfileForm(profile, workHistories);

  // 統一Toastシステムでの通知表示
  useEffect(() => {
    if (formMethods.submitResult.open && formMethods.submitResult.message) {
      if (formMethods.submitResult.success) {
        showSuccess(formMethods.submitResult.message, {
          title: 'プロフィール更新',
          duration: 4000
        });
      } else {
        showError(formMethods.submitResult.message, {
          title: '更新エラー',
          duration: 5000
        });
      }
      // 通知表示後、状態をリセット
      formMethods.resetSnackbar();
    }
  }, [formMethods.submitResult, showSuccess, showError, formMethods.resetSnackbar]);

  return (
    <PageContainer>
      <FormContainer
        loading={isLoading}
        error={error ? handleError(error)?.message || 'エラーが発生しました' : null}
        data-testid="profile-form-container"
      >
        <ProfileHeader 
          isSubmitting={formMethods.isSubmitting} 
          profile={profile}
          formData={formMethods.formMethods.getValues()}
          onTempSave={formMethods.handleTempSave}
          onSubmit={formMethods.handleSubmit}
          isTempSaved={formMethods.isTempSaved}
          tempSavedAt={formMethods.tempSavedAt}
        />
        
        {!isLoading && !error && (
          <>
            {/* 最終更新日表示 */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  最終更新: {profile?.tempSavedAt 
                    ? format(new Date(profile.tempSavedAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })
                    : '未更新'}
                </Typography>
              </Box>
            </Box>
            
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
              <form onSubmit={formMethods.handleSubmit} id="profile-form">
                <BasicInfoCard profile={profile} />
                
                <ProfileTabbedContent
                  profile={profile}
                  formMethods={formMethods.formMethods}
                  onSubmit={formMethods.handleSubmit}
                  onTempSave={formMethods.handleTempSave}
                  isSubmitting={formMethods.isSubmitting}
                  isTempSaved={formMethods.isTempSaved}
                />
              </form>
            </LocalizationProvider>
          </>
        )}
      </FormContainer>
    </PageContainer>
  );
} 
