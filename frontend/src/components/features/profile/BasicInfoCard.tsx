import React, { useMemo } from 'react';
import { Typography, Box } from '@mui/material';
import { 
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  CalendarMonth as CalendarIcon,
  Wc as GenderIcon
} from '@mui/icons-material';
import { format, differenceInYears } from 'date-fns';
import { InfoCard } from '@/components/common/cards';
import { DetailInfoGrid, DetailInfoItem } from '@/components/common/layout';
import { UserProfile } from '@/types/profile';

interface BasicInfoCardProps {
  profile: UserProfile | null;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * 社員情報を表示するカードコンポーネント
 * React.memoでプロフィールデータの変更時のみ再レンダリング
 */
export const BasicInfoCard: React.FC<BasicInfoCardProps> = React.memo(({
  profile,
  isLoading = false,
  error = null,
}) => {
  // 年齢計算をメモ化 - 生年月日が変わった時のみ再計算
  const age = useMemo(() => {
    if (!profile?.birthdate) return null;
    return differenceInYears(new Date(), new Date(profile.birthdate));
  }, [profile?.birthdate]);

  // フルネーム表示をメモ化
  const fullName = useMemo(() => {
    if (!profile) return '未設定';
    return `${profile.lastName || ''} ${profile.firstName || ''}`.trim() || '未設定';
  }, [profile?.lastName, profile?.firstName]);

  // フリガナ表示をメモ化
  const fullNameKana = useMemo(() => {
    if (!profile) return '未設定';
    return `${profile.lastNameKana || ''} ${profile.firstNameKana || ''}`.trim() || '未設定';
  }, [profile?.lastNameKana, profile?.firstNameKana]);

  // 生年月日表示をメモ化
  const formattedBirthdate = useMemo(() => {
    if (!profile?.birthdate) return '未設定';
    const formatted = format(new Date(profile.birthdate), 'yyyy年MM月dd日');
    return age ? `${formatted} (${age}歳)` : formatted;
  }, [profile?.birthdate, age]);

  // DetailInfoGrid用の項目データを構築
  const infoItems: DetailInfoItem[] = useMemo(() => [
    {
      label: '氏名',
      value: (
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <Typography component="span" sx={{ fontWeight: 'medium', fontSize: '1rem' }}>
            {fullName}
          </Typography>
          <Typography component="span" sx={{ 
            fontSize: '0.875rem', 
            color: 'text.secondary',
            fontWeight: 'normal'
          }}>
            {fullNameKana}
          </Typography>
        </Box>
      ),
      icon: <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />,
      gridSize: { xs: 12 } // 全幅表示
    },
    {
      label: 'メールアドレス',
      value: profile?.email || '未設定',
      icon: <EmailIcon sx={{ fontSize: 18, color: 'text.secondary' }} />,
      gridSize: { xs: 12 } // 全幅表示
    },
    {
      label: '電話番号',
      value: profile?.phoneNumber || '未設定',
      icon: <PhoneIcon sx={{ fontSize: 18, color: 'text.secondary' }} />,
      gridSize: { xs: 12 } // 全幅表示
    },
    {
      label: '生年月日',
      value: formattedBirthdate,
      icon: <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />,
      gridSize: { xs: 12, sm: 6 } // モバイルは全幅、タブレット以上は半幅
    },
    {
      label: '性別',
      value: profile?.gender || '未設定',
      icon: <GenderIcon sx={{ fontSize: 18, color: 'text.secondary' }} />,
      gridSize: { xs: 12, sm: 6 } // モバイルは全幅、タブレット以上は半幅
    },
    {
      label: '住所',
      value: profile?.address || '未設定',
      icon: <HomeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />,
      gridSize: { xs: 12 } // 全幅表示
    },
  ], [fullName, fullNameKana, profile, formattedBirthdate]);

  return (
    <InfoCard
      title="社員情報"
      icon={<PersonIcon />}
      expandable={true}
      defaultExpanded={false}
      loading={isLoading}
      error={error}
      variant="outlined"
      data-testid="basic-info-card"
    >
      <Typography variant="body2" color="text.secondary" mb={3}>
        以下の情報は自動的に設定されます。変更が必要な場合は管理者にお問い合わせください。
      </Typography>
      
      <DetailInfoGrid 
        items={infoItems}
        spacing={3}
        data-testid="basic-info-grid"
      />
    </InfoCard>
  );
}); 