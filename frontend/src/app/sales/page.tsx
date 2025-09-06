"use client";

// Avoid static prerender while migrating UI constants/theme.
export const dynamic = "force-dynamic";

import NextDynamic from 'next/dynamic';

import React from 'react';
const SalesDashboard = NextDynamic(
  () => import('@/components/features/sales/dashboard/SalesDashboard').then(m => m.SalesDashboard),
  { ssr: false }
);

/**
 * 営業ダッシュボードページ
 */
export default function SalesPage() {
  const handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  if (typeof window === 'undefined') {
    // SSR/SSG評価時は描画しない（CSRでマウント）
    return null;
  }

  return <SalesDashboard onRefresh={handleRefresh} />;
}
