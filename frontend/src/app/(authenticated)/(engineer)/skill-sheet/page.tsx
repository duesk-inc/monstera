'use client';

import React, { useEffect } from 'react';
import { useSkillSheet } from '@/hooks/skillSheet/useSkillSheet';
import { useSkillSheetForm } from '@/hooks/skillSheet/useSkillSheetForm';
import { SkillSheetHeader } from '@/components/features/skillSheet/SkillSheetHeader';
import { SkillSheetFilterableContent } from '@/components/features/skillSheet/SkillSheetFilterableContent';
import { FormContainer, useToast, PageContainer } from '@/components/common';

export default function SkillSheetPage() {
  // 統一Toastシステムを使用
  const { showSuccess, showError } = useToast();
  
  // スキルシート情報の取得
  const { skillSheet, isLoading, error } = useSkillSheet();
  
  // スキルシートフォームの状態管理
  const formMethods = useSkillSheetForm(skillSheet);

  // 統一Toastシステムでの通知表示
  useEffect(() => {
    if (formMethods.submitResult.open && formMethods.submitResult.message) {
      if (formMethods.submitResult.success) {
        showSuccess(formMethods.submitResult.message, {
          title: 'スキルシート更新',
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
        error={error}
        data-testid="skill-sheet-form-container"
      >
        <SkillSheetHeader 
          isSubmitting={formMethods.isSubmitting} 
          skillSheet={skillSheet}
          formData={formMethods.formMethods.getValues()}
          onTempSave={formMethods.handleTempSave}
          onSubmit={formMethods.handleSubmit}
          isTempSaved={formMethods.isTempSaved}
          tempSavedAt={formMethods.tempSavedAt}
          isDirty={formMethods.isDirty}
        />
        
        {!isLoading && !error && (
          <form onSubmit={formMethods.handleSubmit} id="skill-sheet-form">
            <SkillSheetFilterableContent
              skillSheet={skillSheet}
              formMethods={formMethods.formMethods}
              onSubmit={formMethods.handleSubmit}
              onTempSave={formMethods.handleTempSave}
              isSubmitting={formMethods.isSubmitting}
              isTempSaved={formMethods.isTempSaved}
              isDirty={formMethods.isDirty}
            />
          </form>
        )}
      </FormContainer>
    </PageContainer>
  );
}