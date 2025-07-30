'use client';

import React from 'react';
import { Typography, Box } from '@mui/material';
import ExpenseApproverSettings from '@/components/features/admin/ExpenseApproverSettings';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ExpenseApproversPage() {
  return (
    <ProtectedRoute adminOnly>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          経費承認者設定
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          経費申請の承認者を設定・管理します。管理部承認者と役員承認者を設定できます。
        </Typography>
        <ExpenseApproverSettings />
      </Box>
    </ProtectedRoute>
  );
}