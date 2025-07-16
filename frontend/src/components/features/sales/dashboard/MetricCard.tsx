'use client';

import React, { ReactNode } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box,
  Skeleton 
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { SPACING } from '@/constants/dimensions';

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
  icon: ReactNode;
  color: string;
  isLoading?: boolean;
  onClick?: () => void;
}

/**
 * 営業ダッシュボードのメトリック表示カード
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  trend,
  icon,
  color,
  isLoading = false,
  onClick
}) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Card 
        sx={{ 
          height: '100%',
          minHeight: 140,
          cursor: onClick ? 'pointer' : 'default'
        }}
      >
        <CardContent sx={{ p: SPACING.lg }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={20} />
              <Skeleton variant="text" width="40%" height={32} sx={{ mt: 1 }} />
              <Skeleton variant="text" width="30%" height={16} sx={{ mt: 1 }} />
            </Box>
            <Skeleton variant="circular" width={48} height={48} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: '100%',
        minHeight: 140,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        } : {},
        border: `1px solid ${theme.palette.divider}`
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: SPACING.lg }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', height: '100%' }}>
          {/* 左側：メトリック情報 */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography 
              color="textSecondary" 
              gutterBottom
              variant="body2"
              sx={{ 
                fontWeight: 500,
                fontSize: '0.875rem',
                mb: SPACING.xs
              }}
            >
              {title}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 'auto' }}>
              <Typography 
                variant="h4" 
                component="div"
                sx={{ 
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  lineHeight: 1.2
                }}
              >
                {typeof value === 'number' ? value.toLocaleString() : value}
              </Typography>
              {unit && (
                <Typography 
                  variant="h6" 
                  component="span"
                  sx={{ 
                    ml: 0.5,
                    color: theme.palette.text.secondary,
                    fontWeight: 400
                  }}
                >
                  {unit}
                </Typography>
              )}
            </Box>
            
            {/* トレンド表示 */}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: SPACING.sm }}>
                {trend.isPositive ? (
                  <TrendingUp 
                    sx={{ 
                      color: theme.palette.success.main,
                      fontSize: '1rem',
                      mr: 0.5
                    }} 
                  />
                ) : (
                  <TrendingDown 
                    sx={{ 
                      color: theme.palette.error.main,
                      fontSize: '1rem',
                      mr: 0.5
                    }} 
                  />
                )}
                <Typography 
                  variant="body2" 
                  sx={{
                    color: trend.isPositive 
                      ? theme.palette.success.main 
                      : theme.palette.error.main,
                    fontWeight: 600,
                    mr: 0.5
                  }}
                >
                  {Math.abs(trend.value)}%
                </Typography>
                {trend.period && (
                  <Typography 
                    variant="body2" 
                    color="textSecondary"
                    sx={{ fontSize: '0.75rem' }}
                  >
                    {trend.period}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          
          {/* 右側：アイコン */}
          <Box 
            sx={{ 
              backgroundColor: `${color}20`,
              borderRadius: 2,
              p: SPACING.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 64,
              height: 64,
              alignSelf: 'flex-start'
            }}
          >
            <Box 
              sx={{ 
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '& > svg': {
                  fontSize: '1.5rem'
                }
              }}
            >
              {icon}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};