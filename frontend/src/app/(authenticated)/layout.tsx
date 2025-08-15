'use client';

import React from 'react';
import { MenuItem, Typography, Avatar } from '@mui/material';
import AdminSidebar from '@/components/ui/AdminSidebar';
import EngineerSidebar from '@/components/ui/EngineerSidebar';
import { SharedLayoutWrapper } from '@/components/common/layout';
import { useActiveRole } from '@/context/ActiveRoleContext';
import { ROLES } from '@/constants/roles';
import { useAuth } from '@/hooks/useAuth';
import { isMultiRoleEnabled } from '@/utils/roleUtils';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const DEBUG_MODE = process.env.NODE_ENV === 'development';
  const { activeRole } = useActiveRole();
  const { currentUserRole } = useAuth();
  const multiRoleEnabled = isMultiRoleEnabled();
  
  // Feature Flagによるロール判定の切り替え
  const isEngineer = multiRoleEnabled 
    ? activeRole === ROLES.ENGINEER  // 複数ロールモード
    : currentUserRole === 4;         // 単一ロールモード（Engineer=4）


  const userMenuItems = (
    <MenuItem component="a" href="/profile">
      <Avatar sx={{ width: 24, height: 24, mr: 2, bgcolor: 'primary.light' }}>P</Avatar>
      <Typography variant="body2">プロフィール</Typography>
    </MenuItem>
  );

  const sidebar = isEngineer ? (
    <EngineerSidebar />
  ) : (
    <AdminSidebar />
  );

  const mobileSidebar = isEngineer ? (
    <EngineerSidebar mobile onClose={() => {}} />
  ) : (
    <AdminSidebar mobile onClose={() => {}} />
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