'use client';

import React, { useState } from 'react';
import { MenuItem, Typography, Avatar } from '@mui/material';
import AdminSidebar from '@/components/ui/AdminSidebar';
import { SharedLayoutWrapper } from '@/components/common/layout';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarWidth = sidebarOpen ? 240 : 68;
  const DEBUG_MODE = process.env.NODE_ENV === 'development';

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const userMenuItems = (
    <MenuItem component="a" href="/profile">
      <Avatar sx={{ width: 24, height: 24, mr: 2, bgcolor: 'primary.light' }}>P</Avatar>
      <Typography variant="body2">プロフィール</Typography>
    </MenuItem>
  );

  return (
    <SharedLayoutWrapper
      sidebar={<AdminSidebar open={sidebarOpen} onToggle={handleSidebarToggle} />}
      mobileSidebar={<AdminSidebar mobile onClose={() => {}} open={true} />}
      sidebarOpen={sidebarOpen}
      onSidebarToggle={handleSidebarToggle}
      sidebarWidth={sidebarWidth}
      isAdmin={false}
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