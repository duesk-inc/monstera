'use client';

import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box } from '@mui/material';
import {
  Menu as MenuIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useAuthContext } from '@/app/providers';
import { UserAvatar } from '@/components/common/layout';
import { NotificationBell } from '@/components/common/NotificationBell';

interface TopBarProps {
  onMenuClick: () => void;
  onUserMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
  isMobile: boolean;
  isAdmin?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  onMenuClick, 
  onUserMenuClick, 
  isMobile,
  isAdmin = false
}) => {
  const { user } = useAuthContext();

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
          
          <IconButton 
            sx={{ 
              display: { xs: 'none', sm: 'inline-flex' }, 
              color: 'text.secondary',
              mx: 1
            }}
          >
            <HelpIcon fontSize="small" />
          </IconButton>
          
          <IconButton
            onClick={onUserMenuClick}
            aria-controls="user-menu"
            aria-haspopup="true"
            data-testid="user-menu-button"
            sx={{ 
              p: 0.5,
              ml: 1, 
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderColor: 'rgba(0, 0, 0, 0.08)',
              bgcolor: 'background.paper',
              '&:hover': {
                bgcolor: 'rgba(46, 125, 50, 0.04)',
              }
            }}
          >
            <UserAvatar 
              user={user}
              size="small"
              sx={{ 
                cursor: 'pointer',
                bgcolor: user ? 'primary.main' : 'grey.400',
              }}
            />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};