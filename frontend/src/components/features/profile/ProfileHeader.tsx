import React from 'react';
import { Box, Alert } from '@mui/material';
import { UserProfile, ProfileFormData } from '@/types/profile';
import { ProfileActionButtons } from '@/components/common/ProfileActionButtons';
import { PageHeader } from '@/components/common/layout';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ProfileHeaderProps {
  isSubmitting: boolean;
  profile: UserProfile | null;
  formData?: Partial<ProfileFormData>;
  onTempSave?: () => void;
  onSubmit?: () => void;
  isTempSaved?: boolean;
  tempSavedAt?: string | null;
}

/**
 * プロフィールページのヘッダーコンポーネント
 * PageHeaderコンポーネントを活用してUI統一性を保持
 * タイトルと保存ボタンを含む
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  isSubmitting,
  profile,
  formData,
  onTempSave,
  onSubmit,
  isTempSaved = false,
  tempSavedAt = null,
}) => {
  // 一時保存日時のフォーマット
  const formattedTempSavedAt = tempSavedAt 
    ? format(new Date(tempSavedAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })
    : '';

  // ヘッダーアクション要素の構築
  const headerActions = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {onTempSave && onSubmit && (
        <ProfileActionButtons
          onTempSave={onTempSave}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          isTempSaved={isTempSaved}
          variant="header"
        />
      )}
    </Box>
  );

  return (
    <>
      <PageHeader
        title="プロフィール設定"
        subtitle="基本情報、資格・認定、自己PRを管理します"
        actions={headerActions}
        marginBottom={isTempSaved ? 1 : 3}
        data-testid="profile-header"
      />
      
      {/* 一時保存状態の表示 */}
      {isTempSaved && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 3,
            borderRadius: 1,
            '& .MuiAlert-icon': {
              color: 'warning.main'
            }
          }}
          data-testid="temp-save-alert"
        >
          このプロフィールは一時保存状態です（{formattedTempSavedAt}）。内容を確認し、「更新する」ボタンを押して更新を完了してください。
        </Alert>
      )}
    </>
  );
}; 