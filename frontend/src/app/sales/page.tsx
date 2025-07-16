'use client';

import React from 'react';
import { SalesDashboard } from '@/components/features/sales/dashboard/SalesDashboard';

/**
 * 営業ダッシュボードページ
 */
export default function SalesPage() {
  const handleRefresh = () => {
    // リフレッシュ処理
    window.location.reload();
  };

  return (
    <SalesDashboard onRefresh={handleRefresh} />
  );
}