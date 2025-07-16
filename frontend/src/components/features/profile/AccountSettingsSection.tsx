import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Stack, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { 
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useActiveRole } from '@/context/ActiveRoleContext';
import { updateDefaultRole } from '@/lib/api/user';
import { useToast } from '@/components/common';

/**
 * アカウント設定セクションコンポーネント
 * デフォルトロール設定を管理
 */
export const AccountSettingsSection: React.FC = () => {
  const { user } = useAuth();
  const { availableRoles, getDisplayName } = useActiveRole();
  const { showSuccess, showError } = useToast();
  
  const [defaultRole, setDefaultRole] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ロールを数値に変換するマッピング
  const roleStringToNumber: Record<string, number> = {
    'super_admin': 1,
    'admin': 2,
    'manager': 3,
    'employee': 4,
    'user': 4, // userはemployeeと同じ
  };

  // 数値をロール文字列に変換するマッピング
  const roleNumberToString: Record<number, string> = {
    1: 'super_admin',
    2: 'admin',
    3: 'manager',
    4: 'employee',
  };

  // 初期値の設定
  useEffect(() => {
    if (user && user.default_role !== undefined) {
      setDefaultRole(user.default_role);
    } else if (availableRoles.length > 0) {
      // デフォルトロールが設定されていない場合は最高権限を初期値にする
      const highestRole = availableRoles.reduce((highest, current) => {
        const currentPriority = roleStringToNumber[current] || 999;
        const highestPriority = roleStringToNumber[highest] || 999;
        return currentPriority < highestPriority ? current : highest;
      });
      setDefaultRole(roleStringToNumber[highestRole] || null);
    }
  }, [user, availableRoles]);

  // デフォルトロールの変更処理
  const handleDefaultRoleChange = async (event: any) => {
    const newValue = event.target.value as number | '';
    if (newValue === '') return;

    setIsSaving(true);
    try {
      await updateDefaultRole(newValue);
      setDefaultRole(newValue);
      showSuccess('デフォルトロールを更新しました', {
        title: 'アカウント設定',
        duration: 4000,
      });
    } catch (error) {
      showError('デフォルトロールの更新に失敗しました', {
        title: 'エラー',
        duration: 5000,
      });
      console.error('Failed to update default role:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 複数ロールを持たない場合は表示しない
  if (!user || availableRoles.length <= 1) {
    return null;
  }

  // ロールアイコンの取得
  const getRoleIcon = (role: string) => {
    if (role === 'super_admin' || role === 'admin' || role === 'manager') {
      return <AdminIcon fontSize="small" sx={{ color: 'error.main' }} />;
    }
    return <PersonIcon fontSize="small" sx={{ color: 'primary.main' }} />;
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <SettingsIcon color="primary" />
          <Typography variant="h6">アカウント設定</Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          デフォルトロールを設定すると、次回ログイン時に自動的に選択されたロールでシステムを利用開始できます。
        </Alert>

        <FormControl fullWidth disabled={isSaving}>
          <InputLabel id="default-role-label">デフォルトロール</InputLabel>
          <Select
            labelId="default-role-label"
            id="default-role"
            value={defaultRole || ''}
            label="デフォルトロール"
            onChange={handleDefaultRoleChange}
          >
            {availableRoles.map((role) => {
              const roleNumber = roleStringToNumber[role];
              if (!roleNumber) return null;
              
              return (
                <MenuItem key={role} value={roleNumber}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getRoleIcon(role)}
                    <Typography>{getDisplayName(role)}</Typography>
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
          <FormHelperText>
            ログイン時に最初に使用するロールを選択してください
          </FormHelperText>
        </FormControl>

        {isSaving && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>現在利用可能なロール:</strong>
          </Typography>
          <Stack direction="row" spacing={2} mt={1} flexWrap="wrap">
            {availableRoles.map((role) => (
              <Box
                key={role}
                sx={{
                  display: 'flex',
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
                {getRoleIcon(role)}
                <Typography variant="body2">{getDisplayName(role)}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};