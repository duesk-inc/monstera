'use client';

import React from 'react';
import { MenuItem, Typography, Avatar } from '@mui/material';
import AdminSidebar from '@/components/ui/AdminSidebar';
import EngineerSidebar from '@/components/ui/EngineerSidebar';
import { SharedLayoutWrapper } from '@/components/common/layout';
import { useAuth } from '@/hooks/useAuth';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const DEBUG_MODE = process.env.NODE_ENV === 'development';
  const { currentUserRole, user, logout } = useAuth();
  
  // Phase 4: 単一ロールシステムでのロール判定
  const isEngineer = currentUserRole === 4;  // Engineer = 4
  
  // デバッグ用ログ
  if (DEBUG_MODE && user) {
    console.log('Auth Debug:', {
      email: user.email,
      role: user.role,
      currentUserRole,
      isEngineer,
      sidebarType: isEngineer ? 'Engineer' : 'Admin'
    });
  }


  const userMenuItems = (
    <MenuItem component="a" href="/profile">
      <Avatar sx={{ width: 24, height: 24, mr: 2, bgcolor: 'primary.light' }}>P</Avatar>
      <Typography variant="body2">プロフィール</Typography>
    </MenuItem>
  );

  const sidebar = isEngineer ? (
    <EngineerSidebar user={user} onLogout={logout} />
  ) : (
    <AdminSidebar user={user} onLogout={logout} />
  );

  const mobileSidebar = isEngineer ? (
    <EngineerSidebar mobile onClose={() => {}} user={user} onLogout={logout} />
  ) : (
    <AdminSidebar mobile onClose={() => {}} user={user} onLogout={logout} />
  );

  return (
    <SharedLayoutWrapper
      sidebar={sidebar}
      mobileSidebar={mobileSidebar}
      isAdmin={!isEngineer}
      userMenuItems={userMenuItems}
      contentPadding={{ xs: 2, sm: 3 }}
      contentBgColor="background.default"
      debugMode={DEBUG_MODE}
      retryDelay={5000}
    >
      {children}
    </SharedLayoutWrapper>
  );
}