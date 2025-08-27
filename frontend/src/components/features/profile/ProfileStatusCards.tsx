import React, { useMemo } from 'react';
import {  } from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
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
 * 資格・認定件数、最終更新日を表示
 */
export const ProfileStatusCards: React.FC<ProfileStatusCardsProps> = ({
  profile,
  formData,
}) => {

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

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {/* 資格・認定件数 */}
      <Grid size={{ xs: 12, md: 6 }}>
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
      <Grid size={{ xs: 12, md: 6 }}>
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