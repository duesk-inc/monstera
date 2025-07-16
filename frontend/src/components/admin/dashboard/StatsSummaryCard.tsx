'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { TrendData } from '@/types/admin/weeklyReportSummary';

interface StatsSummaryCardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: TrendData;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
  subtitle?: string;
  showTrendPercentage?: boolean;
}

export default function StatsSummaryCard({
  title,
  value,
  unit = '',
  trend,
  icon,
  color = 'primary',
  onClick,
  subtitle,
  showTrendPercentage = true,
}: StatsSummaryCardProps) {
  const getTrendIcon = (trendDirection: string) => {
    switch (trendDirection) {
      case 'up':
        return <TrendingUpIcon fontSize="small" color="success" />;
      case 'down':
        return <TrendingDownIcon fontSize="small" color="error" />;
      default:
        return <TrendingFlatIcon fontSize="small" color="action" />;
    }
  };

  const getTrendColor = (trendDirection: string) => {
    switch (trendDirection) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    // 大きな数値の場合は省略形で表示
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    } else if (val % 1 === 0) {
      return val.toString();
    } else {
      return val.toFixed(1);
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          boxShadow: (theme) => theme.shadows[4],
          transform: 'translateY(-2px)',
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* ヘッダー部分 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: 1.2 }}>
            {title}
          </Typography>
          {icon && (
            <Box sx={{ color: `${color}.main`, ml: 1 }}>
              {icon}
            </Box>
          )}
        </Box>

        {/* メイン値 */}
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="h4" 
            component="div" 
            fontWeight="bold"
            sx={{ 
              color: `${color}.main`,
              lineHeight: 1,
              mb: 0.5,
            }}
          >
            {formatValue(value)}
            {unit && (
              <Typography component="span" variant="h6" color="text.secondary" sx={{ ml: 0.5 }}>
                {unit}
              </Typography>
            )}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* トレンド情報 */}
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getTrendIcon(trend.trend)}
              <Typography 
                variant="caption" 
                sx={{ 
                  color: getTrendColor(trend.trend),
                  fontWeight: 'medium',
                }}
              >
                {showTrendPercentage ? (
                  `${trend.changeRate >= 0 ? '+' : ''}${trend.changeRate.toFixed(1)}%`
                ) : (
                  `${trend.change >= 0 ? '+' : ''}${trend.change.toFixed(1)}`
                )}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              前期比
            </Typography>
          </Box>
        )}

        {/* トレンドがない場合の空白スペース確保 */}
        {!trend && <Box sx={{ height: '20px' }} />}
      </CardContent>
    </Card>
  );
}