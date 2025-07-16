import React, { useMemo } from 'react';
import {  } from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  CheckCircle as CheckIcon,
  School as SchoolIcon,
  Update as UpdateIcon
} from '@mui/icons-material';
import { StatusCard } from '@/components/common/cards';
import { UserProfile, ProfileFormData } from '@/types/profile';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ProfileStatusCardsProps {
  profile: UserProfile | null;
  formData: ProfileFormData;
}

/**
 * プロフィール画面のステータスカード群
 * プロフィール完成度、資格・認定件数、最終更新日を表示
 */
export const ProfileStatusCards: React.FC<ProfileStatusCardsProps> = ({
  profile,
  formData,
}) => {
  // プロフィール完成度の計算
  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    
    let completedFields = 0;
    const totalFields = 7; // 基本情報5項目 + 資格 + 自己PR
    
    // 基本情報のチェック
    if (profile.lastName && profile.firstName) completedFields++;
    if (profile.email) completedFields++;
    if (profile.phoneNumber) completedFields++;
    if (profile.address) completedFields++;
    if (formData.education) completedFields++;
    
    // 資格・認定のチェック
    if (formData.certifications && formData.certifications.length > 0 && 
        formData.certifications.some(cert => cert.name && cert.name.trim() !== '')) {
      completedFields++;
    }
    
    // 自己PRのチェック
    if (formData.appealPoints && formData.appealPoints.trim() !== '') {
      completedFields++;
    }
    
    return Math.round((completedFields / totalFields) * 100);
  }, [profile, formData]);

  // 資格・認定の件数を計算
  const certificationCount = useMemo(() => {
    if (!formData.certifications) return 0;
    return formData.certifications.filter(cert => cert.name && cert.name.trim() !== '').length;
  }, [formData.certifications]);

  // 最終更新日のフォーマット
  const lastUpdatedFormatted = useMemo(() => {
    if (!profile?.updatedAt) return '未更新';
    return format(new Date(profile.updatedAt), 'yyyy年MM月dd日', { locale: ja });
  }, [profile?.updatedAt]);

  // 完成度に応じたステータスを決定
  const getCompletionStatus = (completeness: number): 'success' | 'warning' | 'error' => {
    if (completeness >= 80) return 'success';
    if (completeness >= 50) return 'warning';
    return 'error';
  };

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {/* プロフィール完成度 */}
      <Grid size={{ xs: 12, md: 4 }}>
        <StatusCard
          title="プロフィール完成度"
          value={profileCompleteness}
          unit="%"
          maxValue={100}
          showProgress={true}
          status={getCompletionStatus(profileCompleteness)}
          icon={<CheckIcon />}
          sx={{ height: '100%', minWidth: 0 }}
          data-testid="profile-completeness-card"
        />
      </Grid>
      
      {/* 資格・認定件数 */}
      <Grid size={{ xs: 12, md: 4 }}>
        <StatusCard
          title="資格・認定"
          value={certificationCount}
          unit="件"
          status={certificationCount > 0 ? 'info' : 'default'}
          icon={<SchoolIcon />}
          sx={{ height: '100%', minWidth: 0 }}
          data-testid="certification-count-card"
        />
      </Grid>
      
      {/* 最終更新日 */}
      <Grid size={{ xs: 12, md: 4 }}>
        <StatusCard
          title="最終更新日"
          value={lastUpdatedFormatted}
          status="default"
          icon={<UpdateIcon />}
          sx={{ height: '100%', minWidth: 0 }}
          data-testid="last-updated-card"
        />
      </Grid>
    </Grid>
  );
};