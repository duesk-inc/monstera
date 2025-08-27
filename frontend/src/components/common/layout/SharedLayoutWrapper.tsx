'use client';

import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { TopBar } from '@/components/ui/TopBar';
import { SharedMobileDrawer } from './SharedMobileDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useAuthInitializer } from '@/hooks/common/useAuthInitializer';
import { SIDEBAR_WIDTH } from '@/constants/layout';

interface SharedLayoutWrapperProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  mobileSidebar: React.ReactNode;
  isAdmin?: boolean;
  userMenuItems?: React.ReactNode;
  contentPadding?: number | { xs: number; sm: number; md?: number };
  contentBgColor?: string;
  debugMode?: boolean;
  retryDelay?: number;
}

export const SharedLayoutWrapper: React.FC<SharedLayoutWrapperProps> = ({
  children,
  sidebar,
  mobileSidebar,
  isAdmin = false,
  userMenuItems,
  contentPadding = 0,
  contentBgColor = 'grey.50',
  debugMode = false,
  retryDelay,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  const { user, logout, initializeAuth, isLoading } = useAuth();
  
  useAuthInitializer({
    initializeAuth,
    user,
    debugMode,
    retryDelay,
  });

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <Box 
      component="div" 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        bgcolor: isAdmin ? 'grey.50' : 'background.default' 
      }}
    >
      {/* モバイル用ドロワー */}
      <SharedMobileDrawer
        open={mobileDrawerOpen}
        onClose={handleDrawerToggle}
        width={SIDEBAR_WIDTH}
      >
        {mobileSidebar}
      </SharedMobileDrawer>

      {/* デスクトップ用サイドバー */}
      {!isMobile && sidebar}

      {/* メインコンテンツ */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
        }}
      >
        {/* トップバー */}
        <TopBar
          onMenuClick={handleDrawerToggle}
          isMobile={isMobile}
          isAdmin={isAdmin}
          isLoading={isLoading}
        />

        {/* ページコンテンツ */}
        <Box sx={{ 
          p: contentPadding, 
          bgcolor: contentBgColor, 
          minHeight: 'calc(100vh - 70px)' 
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};