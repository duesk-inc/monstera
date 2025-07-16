'use client';

import React from 'react';
import { Box, Container } from '@mui/material';

/**
 * 営業機能共通レイアウト
 */
export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {children}
    </Container>
  );
}