import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Collapse,
  CircularProgress,
  Alert,
  SxProps,
  Theme,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

export interface InfoCardProps {
  /** カードのタイトル */
  title?: string;
  /** タイトルアイコン */
  icon?: React.ReactNode;
  /** 折りたたみ可能かどうか */
  expandable?: boolean;
  /** 初期展開状態 */
  defaultExpanded?: boolean;
  /** ローディング状態 */
  loading?: boolean;
  /** エラー状態 */
  error?: string | null;
  /** カードのバリアント */
  variant?: 'default' | 'outlined' | 'elevated';
  /** 最小高さ */
  minHeight?: number | string;
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** 子要素 */
  children?: React.ReactNode;
  /** テストID */
  'data-testid'?: string;
}

/**
 * 情報表示用の統一カードコンポーネント
 * 
 * 機能:
 * - 統一されたヘッダーとアイコン表示
 * - 折りたたみ機能（オプション）
 * - ローディング・エラー状態の内蔵
 * - BasicInfoCardとの完全互換性
 */
export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  icon,
  expandable = false,
  defaultExpanded = false,
  loading = false,
  error = null,
  variant = 'outlined',
  minHeight,
  sx,
  children,
  'data-testid': testId,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // バリアント別のスタイル定義
  const getVariantStyles = (): SxProps<Theme> => {
    const baseStyles: SxProps<Theme> = {
      borderRadius: '12px',
      minHeight,
      mb: 3,
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyles,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: 'none',
        };
      case 'outlined':
        return {
          ...baseStyles,
          boxShadow: 'none',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          bgcolor: 'background.paper',
        };
      case 'default':
      default:
        return {
          ...baseStyles,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
        };
    }
  };

  // ローディング状態の表示
  if (loading) {
    const mergedSx: any = { ...(getVariantStyles() as any), ...(sx as any) };
    return (
      <Card sx={mergedSx} data-testid={testId}>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={minHeight || 100}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // エラー状態の表示
  if (error) {
    const mergedSx: any = { ...(getVariantStyles() as any), ...(sx as any) };
    return (
      <Card sx={mergedSx} data-testid={testId}>
        <CardContent>
          <Alert severity="error">
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // 通常表示
  const mergedSx: any = { ...(getVariantStyles() as any), ...(sx as any) };
  return (
    <Card sx={mergedSx} data-testid={testId}>
      <CardContent sx={{ pb: 1 }}>
        {title && (
          <Box 
            display="flex" 
            alignItems="center" 
            justifyContent="space-between" 
            mb={expanded ? 2 : 0}
            role={expandable ? "button" : undefined}
            tabIndex={expandable ? 0 : undefined}
            aria-expanded={expandable ? expanded : undefined}
            onClick={expandable ? () => setExpanded(!expanded) : undefined}
            onKeyDown={expandable ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setExpanded(!expanded);
              }
            } : undefined}
            sx={{ cursor: expandable ? 'pointer' : 'default' }}
          >
            <Box display="flex" alignItems="center">
              {icon && <Box sx={{ mr: 1, color: 'primary.main' }}>{icon}</Box>}
              <Typography variant="h6">{title}</Typography>
            </Box>
            {expandable && (
              <IconButton 
                aria-label={expanded ? `${title}を閉じる` : `${title}を開く`}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Box>
        )}
        
        {expandable ? (
          <Collapse in={expanded}>
            {children}
          </Collapse>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}; 
