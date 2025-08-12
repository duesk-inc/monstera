'use client';

import React, { useState } from 'react';
import {
  Box,
  MenuItem,
  Typography,
  Divider,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SwapHoriz as SwapHorizIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ManagerIcon,
  Person as PersonIcon,
  SupervisorAccount as SuperAdminIcon,
} from '@mui/icons-material';
import { useActiveRole } from '@/context/ActiveRoleContext';
import { ROLES, RoleType, ADMIN_ROLES } from '@/constants/roles';
import { useRouter } from 'next/navigation';

// ロール切り替えコンポーネントのプロパティ
interface RoleSwitcherProps {
  onClose?: () => void;
}

// ロールアイコンのマッピング
const getRoleIcon = (role: RoleType) => {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return <SuperAdminIcon fontSize="small" sx={{ color: 'error.main' }} />;
    case ROLES.ADMIN:
      return <AdminIcon fontSize="small" sx={{ color: 'error.main' }} />;
    case ROLES.MANAGER:
      return <ManagerIcon fontSize="small" sx={{ color: 'warning.main' }} />;
    case ROLES.ENGINEER:
      return <PersonIcon fontSize="small" sx={{ color: 'primary.main' }} />;
    default:
      return <PersonIcon fontSize="small" />;
  }
};

// ロール切り替えコンポーネント
export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ onClose }) => {
  const {
    activeRole,
    availableRoles,
    setActiveRole,
    hasMultipleRoles,
    isActiveRole,
    getDisplayName,
  } = useActiveRole();
  
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  // 複数ロールを持たない場合は何も表示しない
  if (!hasMultipleRoles || !activeRole) {
    return null;
  }

  // ロール切り替え処理
  const handleRoleSwitch = async (newRole: RoleType) => {
    if (newRole === activeRole) return;

    // ロールを更新
    setActiveRole(newRole);
    setExpanded(false);

    // メニューを閉じる
    if (onClose) {
      onClose();
    }

    // ロールに応じた画面遷移
    const currentPath = window.location.pathname;
    
    // 管理者系ロールの場合
    if (ADMIN_ROLES.includes(newRole)) {
      // 既に管理画面にいない場合は管理画面に遷移
      if (!currentPath.startsWith('/admin')) {
        // 少し待機してからページ遷移（状態更新を確実にするため）
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 100);
      } else {
        // 既に管理画面にいる場合はページをリフレッシュ
        router.refresh();
      }
    } 
    // エンジニアロールの場合
    else if (newRole === ROLES.ENGINEER) {
      // 管理画面にいる場合はダッシュボードに遷移
      if (currentPath.startsWith('/admin')) {
        // 少し待機してからページ遷移（状態更新を確実にするため）
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      } else {
        // 既にエンジニア画面にいる場合はページをリフレッシュ
        router.refresh();
      }
    }
  };

  // 展開/折りたたみの切り替え
  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Box>
      <Divider sx={{ my: 1 }} />
      
      {/* 現在のロール表示と切り替えボタン */}
      <MenuItem 
        onClick={handleToggleExpanded}
        sx={{ 
          px: 2,
          py: 1,
          borderRadius: 1,
          mx: 1,
          my: 0.5,
          '&:hover': {
            bgcolor: 'action.hover',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {getRoleIcon(activeRole)}
          <Box sx={{ ml: 2, flexGrow: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              現在: {getDisplayName(activeRole)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ロール切り替え
            </Typography>
          </Box>
          <IconButton size="small" sx={{ ml: 1 }}>
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>
      </MenuItem>

      {/* ロール選択メニュー */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ px: 1, pb: 1 }}>
          <List dense disablePadding>
            {availableRoles.map((role) => (
              <ListItem key={role} disablePadding>
                <ListItemButton
                  onClick={() => handleRoleSwitch(role)}
                  disabled={isActiveRole(role)}
                  sx={{
                    borderRadius: 1,
                    py: 0.5,
                    px: 1,
                    '&.Mui-disabled': {
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {getRoleIcon(role)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {getDisplayName(role)}
                        </Typography>
                        {isActiveRole(role) && (
                          <Chip 
                            label="使用中" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.625rem', 
                              height: '20px',
                              backgroundColor: 'transparent',
                              borderColor: 'primary.main',
                              color: 'primary.main'
                            }}
                          />
                        )}
                      </Box>
                    }
                  />
                  {role !== activeRole && (
                    <SwapHorizIcon fontSize="small" sx={{ color: 'action.active' }} />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Collapse>
    </Box>
  );
};