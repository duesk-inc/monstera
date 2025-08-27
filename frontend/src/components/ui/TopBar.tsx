'use client';

import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box } from '@mui/material';
import {
  Menu as MenuIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/common/NotificationBell';

interface TopBarProps {
  onMenuClick: () => void;
  isMobile: boolean;
  isAdmin?: boolean;
  isLoading?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  onMenuClick, 
  isMobile,
  isAdmin = false,
  isLoading = false
}) => {
  const { user } = useAuth();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'transparent',
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 64, sm: 70 } }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' }, color: 'primary.main' }}
        >
          <MenuIcon />
        </IconButton>

        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            display: { xs: 'block', md: 'none' }, 
            fontWeight: 'bold',
            color: 'primary.main'
          }}
        >
          MONSTERA
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
          {/* 管理者の場合のみ通知ベルを表示 */}
          {isAdmin && (
            <NotificationBell />
          )}
          
          {/* ユーザーがログインしている場合のみヘルプアイコン表示 */}
          {user && !isLoading && (
            <IconButton 
              sx={{ 
                display: { xs: 'none', sm: 'inline-flex' }, 
                color: 'text.secondary',
                mx: 1
              }}
            >
              <HelpIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};