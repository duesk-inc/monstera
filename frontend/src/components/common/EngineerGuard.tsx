"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Box, Alert } from '@mui/material';

type Props = {
  children: React.ReactNode;
};

const EngineerGuard: React.FC<Props> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  const roles: string[] = Array.isArray((user as any)?.role)
    ? ((user as any).role as unknown[]).map((r) => String(r))
    : (user?.role ? [String(user.role)] : []);
  const isEngineer = roles.includes('engineer');

  if (!isEngineer) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">このページへのアクセス権限がありません（engineer専用）。</Alert>
      </Box>
    );
  }

  return <>{children}</>;
};

export default EngineerGuard;
