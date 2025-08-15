'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Box, CircularProgress, Typography } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  requiredRole?: number;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  adminOnly = false,
  requiredRole
}) => {
  const router = useRouter();
  const { user, isLoading, currentUserRole } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // ログインしていない場合
      if (!user) {
        router.push('/login');
        return;
      }

      // 管理者権限が必要な場合
      if (adminOnly && currentUserRole && currentUserRole > 2) {
        // 権限不足の場合はダッシュボードへリダイレクト
        router.push('/dashboard');
        return;
      }

      // 特定のロール以上が必要な場合
      if (requiredRole && currentUserRole && currentUserRole > requiredRole) {
        router.push('/dashboard');
        return;
      }
    }
  }, [user, isLoading, adminOnly, requiredRole, currentUserRole, router]);

  // ローディング中
  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          読み込み中...
        </Typography>
      </Box>
    );
  }

  // 未ログインまたは権限不足
  if (!user || (adminOnly && currentUserRole && currentUserRole > 2) || 
      (requiredRole && currentUserRole && currentUserRole > requiredRole)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          リダイレクト中...
        </Typography>
      </Box>
    );
  }

  // 認証済みかつ権限があればchildrenを表示
  return <>{children}</>;
};

export default ProtectedRoute;