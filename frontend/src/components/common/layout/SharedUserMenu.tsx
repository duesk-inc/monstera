'use client';

import React from 'react';
import { Menu, MenuItem, Box, Typography, Divider, CircularProgress } from '@mui/material';
import {
  Email as EmailIcon,
  Business as BusinessIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { User } from '@/types/auth';
import { UserAvatar } from './UserAvatar';
import { RoleSwitcher } from '@/components/ui/RoleSwitcher';

interface SharedUserMenuProps {
  anchorEl: null | HTMLElement;
  open: boolean;
  onClose: () => void;
  user: User | null;
  isLoading: boolean;
  onLogout: () => void;
  isAdmin?: boolean;
  additionalMenuItems?: React.ReactNode;
}

export const SharedUserMenu: React.FC<SharedUserMenuProps> = ({
  anchorEl,
  open,
  onClose,
  user,
  isLoading,
  onLogout,
  isAdmin = false,
  additionalMenuItems,
}) => {
  const getUserDisplayName = () => {
    if (!user) return 'ゲスト';
    
    const hasFirstName = user.first_name && typeof user.first_name === 'string' && user.first_name.length > 0;
    const hasLastName = user.last_name && typeof user.last_name === 'string' && user.last_name.length > 0;
    
    if (hasFirstName && hasLastName) {
      return `${user.last_name} ${user.first_name}`;
    }
    
    if (hasLastName) return user.last_name;
    if (hasFirstName) return user.first_name;
    if (user.email) return user.email;
    
    return 'ユーザー';
  };

  const getRoleDisplay = () => {
    if (!user) return '';
    
    // 複数ロールがある場合
    if (user.roles && user.roles.length > 0) {
      const roleLabels = user.roles.map(role => {
        switch (role) {
          case 'super_admin': return 'スーパー管理者';
          case 'admin': return '管理者';
          case 'manager': return 'マネージャー';
          case 'employee': return 'エンジニア';
          case 'user': return 'エンジニア';
          default: return role;
        }
      });
      return roleLabels.join(' / ');
    }
    
    // 単一ロールの場合
    switch (user.role) {
      case 'admin': return '管理者';
      case 'manager': return 'マネージャー';
      case 'user': return 'エンジニア';
      default: return user.role;
    }
  };

  return (
    <Menu
      id="user-menu"
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      data-testid="user-menu"
      MenuListProps={{
        'aria-labelledby': 'user-button',
      }}
      PaperProps={{
        elevation: 0,
        sx: {
          overflow: 'visible',
          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
          mt: 1.5,
          width: 280,
          borderRadius: 2,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          '& .MuiMenuItem-root': {
            px: 2,
            py: 1.5,
            borderRadius: 1,
            my: 0.5,
            mx: 1,
            '&:hover': {
              bgcolor: 'rgba(46, 125, 50, 0.04)',
            }
          }
        }
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      {isLoading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} color={isAdmin ? "error" : "primary"} />
        </Box>
      ) : user ? (
        <Box>
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <UserAvatar 
              user={user}
              size="medium"
              sx={{ 
                mx: 'auto', 
                mb: 1,
                bgcolor: 'primary.main'
              }}
            />
            <Typography variant="subtitle1" fontWeight="bold" color="text.primary" data-testid="user-name">
              {getUserDisplayName()}
            </Typography>
          </Box>
          
          <Divider sx={{ my: 1 }} />
      
          <Box sx={{ px: 1 }}>
            <MenuItem sx={{ pointerEvents: 'none' }}>
              <EmailIcon fontSize="small" sx={{ mr: 2, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }} data-testid="user-email">
                {user.email}
              </Typography>
            </MenuItem>
            
            <MenuItem sx={{ pointerEvents: 'none' }}>
              <BusinessIcon fontSize="small" sx={{ mr: 2, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" data-testid="user-role">
                {getRoleDisplay()}
              </Typography>
            </MenuItem>
          </Box>
          
          <RoleSwitcher onClose={onClose} />
          
          {additionalMenuItems && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ px: 1 }}>
                {additionalMenuItems}
              </Box>
            </>
          )}
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ px: 1 }}>
            <MenuItem onClick={onLogout} sx={{ color: 'error.main' }} data-testid="logout-button">
              <LogoutIcon fontSize="small" sx={{ mr: 2 }} />
              <Typography variant="body2" fontWeight={500}>ログアウト</Typography>
            </MenuItem>
          </Box>
        </Box>
      ) : (
        <Box sx={{ px: 1, py: 1 }}>
          <MenuItem component="a" href="/login" onClick={onClose}>
            <Typography variant="body2">ログイン</Typography>
          </MenuItem>
        </Box>
      )}
    </Menu>
  );
};