import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  CircularProgress,
  LinearProgress,
  Chip,
  IconButton,
  SxProps,
  Theme,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { BORDER_RADIUS, CARD_DIMENSIONS, PROGRESS_DIMENSIONS, SPACING, px } from '@/constants/dimensions';
import { FONT_WEIGHTS } from '@/constants/typography';
import { PERCENTAGE } from '@/constants/business-rules';

export interface StatusCardProps {
  /** カードのタイトル */
  title: string;
  /** メインの数値 */
  value?: number | string;
  /** 単位 */
  unit?: string;
  /** 最大値（プログレスバー用） */
  maxValue?: number;
  /** ステータスの色 */
  status?: 'success' | 'warning' | 'error' | 'info' | 'default';
  /** 色（statusの別名） */
  color?: 'success' | 'warning' | 'error' | 'info' | 'default';
  /** 説明テキスト */
  description?: string;
  /** サブ情報 */
  subtitle?: string;
  /** ローディング状態 */
  loading?: boolean;
  /** プログレスバーを表示するか */
  showProgress?: boolean;
  /** カードのアイコン */
  icon?: React.ReactNode;
  /** 情報アイコンのクリック時コールバック */
  onInfoClick?: () => void;
  /** カード全体のクリック時コールバック */
  onClick?: () => void;
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** 子要素 */
  children?: React.ReactNode;
  /** テストID */
  'data-testid'?: string;
}

/**
 * ステータス表示用の統一カードコンポーネント
 * 
 * 機能:
 * - 数値とステータスの視覚的表示
 * - プログレスバー対応
 * - LeaveBalanceCardとの完全互換性
 */
export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  unit,
  maxValue,
  status = 'default',
  color,
  description,
  subtitle,
  loading = false,
  showProgress = false,
  icon,
  onInfoClick,
  onClick,
  sx,
  children,
  'data-testid': testId,
}) => {
  // colorが指定されている場合はstatusを上書き
  const effectiveStatus = color || status;
  // ステータス別の色を取得
  const getStatusColor = () => {
    switch (effectiveStatus) {
      case 'success':
        return 'success.main';
      case 'warning':
        return 'warning.main';
      case 'error':
        return 'error.main';
      case 'info':
        return 'info.main';
      default:
        return 'text.primary';
    }
  };

  // プログレスの計算
  const getProgressValue = () => {
    if (!showProgress || !maxValue || typeof value !== 'number') return 0;
    return Math.min((value / maxValue) * PERCENTAGE.BASE, PERCENTAGE.MAX);
  };

  // ローディング状態の表示
  if (loading) {
    return (
      <Card 
        sx={{ 
          borderRadius: px(BORDER_RADIUS.LG),
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: 'none',
          ...sx 
        }} 
        data-testid={testId}
      >
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={CARD_DIMENSIONS.MIN_HEIGHT}>
            <CircularProgress size={PROGRESS_DIMENSIONS.CIRCULAR_SIZE.SMALL} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        borderRadius: px(BORDER_RADIUS.LG),
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: 'none',
        bgcolor: 'background.paper',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          boxShadow: 1,
        } : {},
        ...sx 
      }} 
      onClick={onClick}
      data-testid={testId}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        {/* ヘッダー */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            {icon && (
              <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                {icon}
              </Box>
            )}
            <Typography variant="h6" sx={{ fontWeight: FONT_WEIGHTS.SEMI_BOLD }}>
              {title}
            </Typography>
          </Box>
          {onInfoClick && (
            <IconButton 
              size="small" 
              onClick={onInfoClick}
              aria-label={`${title}の詳細情報`}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* メイン値 */}
        {value !== undefined && (
          <Box mb={showProgress ? 1 : 2}>
            <Typography 
              variant="h4" 
              sx={{ 
                color: getStatusColor(),
                fontWeight: FONT_WEIGHTS.BOLD,
                display: 'inline'
              }}
              data-testid="card-value"
            >
              {value}
            </Typography>
            {unit && (
              <Typography 
                variant="h6" 
                component="span" 
                sx={{ 
                  ml: 0.5, 
                  color: 'text.secondary' 
                }}
              >
                {unit}
              </Typography>
            )}
          </Box>
        )}

        {/* プログレスバー */}
        {showProgress && maxValue && (
          <Box mb={2}>
            <LinearProgress 
              variant="determinate" 
              value={getProgressValue()}
              sx={{
                height: PROGRESS_DIMENSIONS.HEIGHT.MD,
                borderRadius: BORDER_RADIUS.SM,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  bgcolor: getStatusColor(),
                },
              }}
            />
            <Box display="flex" justifyContent="space-between" mt={0.5}>
              <Typography variant="caption" color="text.secondary">
                0
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {maxValue}{unit}
              </Typography>
            </Box>
          </Box>
        )}

        {/* サブタイトル */}
        {subtitle && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {subtitle}
          </Typography>
        )}

        {/* 説明 */}
        {description && (
          <Typography variant="body2" color="text.secondary" mb={1}>
            {description}
          </Typography>
        )}


        {/* カスタムコンテンツ */}
        {children}
      </CardContent>
    </Card>
  );
}; 