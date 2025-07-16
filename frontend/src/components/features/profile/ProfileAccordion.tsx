import React, { useState } from 'react';
import { Box } from '@mui/material';
import { 
  School as SchoolIcon,
} from '@mui/icons-material';
import { UseFormReturn } from 'react-hook-form';
import { UserProfile, ProfileFormData } from '@/types/profile';
import { ProfileFormContent } from './ProfileFormContent';
import { ProfileActionButtons } from '@/components/common/ProfileActionButtons';
import { CommonAccordion } from '@/components/common/CommonAccordion';

interface ProfileAccordionProps {
  profile: UserProfile | null;
  formMethods: UseFormReturn<ProfileFormData>;
  onSubmit: () => void;
  onTempSave: () => void;
  isSubmitting: boolean;
  isTempSaved: boolean;
}

/**
 * プロフィール用のアコーディオンコンポーネント
 * 基本プロフィール（基本情報、資格・認定、自己PR）をアコーディオン形式で表示
 * 
 * 改修: 職務経歴はスキルシート画面に移動し、基本プロフィールのみに特化
 */
export const ProfileAccordion: React.FC<ProfileAccordionProps> = ({
  profile,
  formMethods,
  onSubmit,
  onTempSave,
  isSubmitting,
  isTempSaved,
}) => {
  const [basicProfileOpen, setBasicProfileOpen] = useState(true);

  return (
    <>
      {/* 基本プロフィール */}
      <CommonAccordion
        title="基本プロフィール"
        icon={<SchoolIcon color="primary" />}
        variant="outlined"
        expanded={basicProfileOpen}
        onToggle={setBasicProfileOpen}
        disabled={isSubmitting}
        sx={{ mb: 3 }}
        data-testid="basic-profile-accordion"
      >
        <ProfileFormContent
          tabIndex={0}
          profile={profile}
          isLoading={false}
          error={null}
          formMethods={formMethods}
        />
      </CommonAccordion>

      {/* 操作ボタン - 基本プロフィールアコーディオンの外側右下に配置 */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <ProfileActionButtons
          onTempSave={onTempSave}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          isTempSaved={isTempSaved}
          variant="footer"
        />
      </Box>
    </>
  );
}; 