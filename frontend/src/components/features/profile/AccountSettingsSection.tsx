import React from 'react';
import { 
  Box, 
  Stack, 
  Typography,
  Alert,
} from '@mui/material';
import { 
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { 
  ROLE_VALUE_TO_STRING, 
  RoleValueType
} from '@/constants/roles';

/**
 * アカウント設定セクションコンポーネント
 * 1ユーザー1ロール原則に基づいた現在のロール表示
 */
export const AccountSettingsSection: React.FC = () => {
  const { user, currentUserRole } = useAuth();
  
  // ロールアイコンの取得
  const getRoleIcon = (roleValue: number) => {
    // 1: SuperAdmin, 2: Admin, 3: Sales は管理者系
    if (roleValue <= 3) {
      return <AdminIcon fontSize="small" sx={{ color: 'error.main' }} />;
    }
    // 4: Engineer
    return <PersonIcon fontSize="small" sx={{ color: 'primary.main' }} />;
  };

  // ロール名の取得
  const getRoleName = (roleValue: number) => {
    return ROLE_VALUE_TO_STRING[roleValue as RoleValueType] || 'Unknown';
  };

  if (!user || !currentUserRole) {
    return (
      <Box sx={{ mb: 4 }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              アカウント設定
            </Typography>
          </Box>
          <Alert severity="warning">
            ユーザー情報を読み込み中です...
          </Alert>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <SettingsIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            アカウント設定
          </Typography>
        </Box>

        <Alert severity="info">
          本システムは1ユーザー1ロールの原則で運用されています。
        </Alert>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" mb={1}>
            <strong>現在のロール:</strong>
          </Typography>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.5,
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {getRoleIcon(currentUserRole)}
            <Typography variant="body1" fontWeight={500}>
              {getRoleName(currentUserRole)}
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};