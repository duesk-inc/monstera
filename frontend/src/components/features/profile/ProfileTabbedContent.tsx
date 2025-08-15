import React, { useState } from 'react';
import { Box } from '@mui/material';
import { 
  School as SchoolIcon,
  CardMembership as CertificationIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  AccountBalanceWallet as WalletIcon
} from '@mui/icons-material';
import { UseFormReturn } from 'react-hook-form';
import { UserProfile, ProfileFormData } from '@/types/profile';
import { BasicInfoSection } from './BasicInfoSection';
import { CertificationsSection } from './CertificationsSection';
import { AppealPointsSection } from './AppealPointsSection';
import { AccountSettingsSection } from './AccountSettingsSection';
import ExpenseProfileSection from '@/components/profile/ExpenseProfileSection';
import { ProfileActionButtons } from '@/components/common/ProfileActionButtons';
import { TabContainer } from '@/components/common/layout';
import { CommonTabPanel } from '@/components/common/CommonTabPanel';
import { useAuth } from '@/hooks/useAuth';
import { getRoleDisplayName } from '@/utils/roleUtils';

interface ProfileTabbedContentProps {
  profile: UserProfile | null;
  formMethods: UseFormReturn<ProfileFormData>;
  onSubmit: () => void;
  onTempSave: () => void;
  isSubmitting: boolean;
  isTempSaved: boolean;
}

/**
 * プロフィールのタブ形式コンテンツコンポーネント
 * 基本情報、資格・認定、自己PRをタブで切り替えて表示
 */
export const ProfileTabbedContent: React.FC<ProfileTabbedContentProps> = ({
  profile,
  formMethods,
  onSubmit,
  onTempSave,
  isSubmitting,
  isTempSaved,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const { currentUserRole, multiRoleEnabled } = useAuth();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // タブの定義
  const tabs = [
    { 
      label: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon fontSize="small" />
          基本情報
        </Box>
      ), 
      value: 0 
    },
    { 
      label: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CertificationIcon fontSize="small" />
          資格・認定
        </Box>
      ), 
      value: 1 
    },
    { 
      label: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon fontSize="small" />
          自己PR
        </Box>
      ), 
      value: 2 
    },
    { 
      label: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WalletIcon fontSize="small" />
          経費申請履歴
        </Box>
      ), 
      value: 3 
    },
  ];

  // 複数ロールモードが有効な場合のみアカウント設定タブを追加
  // 単一ロールモードではロール切り替えが不要なため表示しない
  if (multiRoleEnabled) {
    tabs.push({
      label: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon fontSize="small" />
          アカウント設定
        </Box>
      ),
      value: 4
    });
  }

  // タブヘッダーのアクション（モバイル用）
  const headerActions = (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      <ProfileActionButtons
        onTempSave={onTempSave}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        isTempSaved={isTempSaved}
        variant="compact"
      />
    </Box>
  );

  return (
    <>
      <TabContainer
        tabs={tabs}
        value={currentTab}
        onChange={handleTabChange}
        headerActions={headerActions}
        variant="elevated"
        data-testid="profile-tab-container"
      >
        {/* 基本情報タブ */}
        <CommonTabPanel value={currentTab} index={0} prefix="profile">
          <Box sx={{ px: 3 }}>
            <BasicInfoSection
              formMethods={formMethods}
            />
          </Box>
        </CommonTabPanel>

        {/* 資格・認定タブ */}
        <CommonTabPanel value={currentTab} index={1} prefix="profile">
          <Box sx={{ px: 3 }}>
            <CertificationsSection
              formMethods={formMethods}
              profile={profile}
              isTempSaved={isTempSaved}
            />
          </Box>
        </CommonTabPanel>

        {/* 自己PRタブ */}
        <CommonTabPanel value={currentTab} index={2} prefix="profile">
          <Box sx={{ px: 3 }}>
            <AppealPointsSection
              formMethods={formMethods}
            />
          </Box>
        </CommonTabPanel>

        {/* 経費申請履歴タブ */}
        <CommonTabPanel value={currentTab} index={3} prefix="profile">
          <Box sx={{ px: 3 }}>
            <ExpenseProfileSection />
          </Box>
        </CommonTabPanel>

        {/* アカウント設定タブ（複数ロールモードが有効な場合のみ） */}
        {multiRoleEnabled && (
          <CommonTabPanel value={currentTab} index={4} prefix="profile">
            <Box sx={{ px: 3 }}>
              <AccountSettingsSection />
            </Box>
          </CommonTabPanel>
        )}
      </TabContainer>

      {/* 操作ボタン - デスクトップではタブ外側右下に配置 */}
      <Box sx={{ 
        display: { xs: 'none', md: 'flex' }, 
        justifyContent: 'flex-end', 
        mt: 3 
      }}>
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