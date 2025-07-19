'use client';

import React, { useEffect } from 'react';
import { MenuItem, Typography } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import AdminSidebar from '@/components/ui/AdminSidebar';
import { SharedLayoutWrapper } from '@/components/common/layout';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const DEBUG_MODE = process.env.NODE_ENV === 'development';

  // 管理者権限チェック
  useEffect(() => {
    if (!isLoading && user) {
      const hasAdminRole = user.roles ? 
        user.roles.some(role => role === 'admin' || role === 'manager' || role === 'super_admin') :
        (user.role === 'admin' || user.role === 'manager');
      
      if (!hasAdminRole) {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);


  const handleSwitchToEngineer = () => {
    router.push('/dashboard');
  };

  const userMenuItems = (
    <MenuItem onClick={handleSwitchToEngineer}>
      <PersonIcon fontSize="small" sx={{ mr: 2, color: 'primary.main' }} />
      <Typography variant="body2">エンジニア画面に切り替え</Typography>
    </MenuItem>
  );

  return (
    <SharedLayoutWrapper
      sidebar={<AdminSidebar />}
      mobileSidebar={<AdminSidebar mobile onClose={() => {}} />}
      isAdmin={true}
      userMenuItems={userMenuItems}
      contentPadding={0}
      contentBgColor="grey.50"
      debugMode={DEBUG_MODE}
    >
      {children}
    </SharedLayoutWrapper>
  );
}