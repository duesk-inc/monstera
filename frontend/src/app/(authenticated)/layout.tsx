'use client';

import React, { useState } from 'react';
import { MenuItem, Typography, Avatar } from '@mui/material';
import AdminSidebar from '@/components/ui/AdminSidebar';
import EngineerSidebar from '@/components/ui/EngineerSidebar';
import { SharedLayoutWrapper } from '@/components/common/layout';
import { useActiveRole } from '@/context/ActiveRoleContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarWidth = sidebarOpen ? 240 : 68;
  const DEBUG_MODE = process.env.NODE_ENV === 'development';
  const { activeRole } = useActiveRole();
  const isEngineer = activeRole === 'employee' || activeRole === 'user';

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const userMenuItems = (
    <MenuItem component="a" href="/profile">
      <Avatar sx={{ width: 24, height: 24, mr: 2, bgcolor: 'primary.light' }}>P</Avatar>
      <Typography variant="body2">プロフィール</Typography>
    </MenuItem>
  );

  const sidebar = isEngineer ? (
    <EngineerSidebar open={sidebarOpen} onToggle={handleSidebarToggle} />
  ) : (
    <AdminSidebar open={sidebarOpen} onToggle={handleSidebarToggle} />
  );

  const mobileSidebar = isEngineer ? (
    <EngineerSidebar mobile onClose={() => {}} open={true} />
  ) : (
    <AdminSidebar mobile onClose={() => {}} open={true} />
  );

  return (
    <SharedLayoutWrapper
      sidebar={sidebar}
      mobileSidebar={mobileSidebar}
      sidebarOpen={sidebarOpen}
      onSidebarToggle={handleSidebarToggle}
      sidebarWidth={sidebarWidth}
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