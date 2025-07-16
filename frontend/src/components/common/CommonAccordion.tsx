import React, { useState, useCallback } from 'react';
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
import { BORDER_RADIUS, px } from '@/constants/dimensions';
import { FONT_WEIGHTS } from '@/constants/typography';

export interface CommonAccordionProps {
  /** アコーディオンのタイトル */
  title: string;
  /** タイトル横のアイコン */
  icon?: React.ReactNode;
  /** カスタムヘッダーコンテンツ */
  customHeader?: React.ReactNode;
  /** 子要素（コンテンツ） */
  children: React.ReactNode;
  /** 初期展開状態 */
  defaultExpanded?: boolean;
  /** 展開状態の外部制御 */
  expanded?: boolean;
  /** 展開状態変更時のコールバック */
  onToggle?: (expanded: boolean) => void;
  /** 無効化状態 */
  disabled?: boolean;
  /** ローディング状態 */
  loading?: boolean;
  /** エラー状態 */
  error?: string | null;
  /** アコーディオンのバリアント */
  variant?: 'card' | 'minimal' | 'outlined' | 'custom';
  /** アニメーション設定 */
  animation?: {
    duration?: number;
    easing?: string;
  };
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** ヘッダー部分のカスタムスタイル */
  headerSx?: SxProps<Theme>;
  /** コンテンツ部分のカスタムスタイル */
  contentSx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
  /** アクセシビリティ用のaria-label */
  'aria-label'?: string;
}

/**
 * 統一アコーディオンコンポーネント
 * 
 * 機能:
 * - 統一されたデザインとアニメーション
 * - アクセシビリティ対応（キーボードナビゲーション、スクリーンリーダー対応）
 * - 複数のバリアント対応
 * - ローディング・エラー状態の内蔵
 * - 既存コンポーネントとの完全互換性
 * - 外部制御・内部制御の両方に対応
 */
export const CommonAccordion: React.FC<CommonAccordionProps> = ({
  title,
  icon,
  customHeader,
  children,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggle,
  disabled = false,
  loading = false,
  error = null,
  variant = 'card',
  animation = { duration: 300, easing: 'ease-in-out' },
  sx,
  headerSx,
  contentSx,
  'data-testid': testId,
  'aria-label': ariaLabel,
}) => {
  // 内部状態管理（外部制御されていない場合のみ）
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  
  // 実際の展開状態（外部制御優先）
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
  // 展開状態切り替えハンドラ
  const handleToggle = useCallback(() => {
    if (disabled || loading) return;
    
    const newExpanded = !isExpanded;
    
    // 外部制御されていない場合は内部状態を更新
    if (controlledExpanded === undefined) {
      setInternalExpanded(newExpanded);
    }
    
    // コールバック実行
    onToggle?.(newExpanded);
  }, [disabled, loading, isExpanded, controlledExpanded, onToggle]);
  
  // キーボードイベントハンドラ
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  // バリアント別のスタイル定義
  const getVariantStyles = (): SxProps<Theme> => {
    const baseStyles: SxProps<Theme> = {
      borderRadius: 2,
      mb: 2,
      transition: `all ${animation.duration}ms ${animation.easing}`,
    };

    switch (variant) {
      case 'outlined':
        return {
          ...baseStyles,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          bgcolor: 'background.paper',
        };
      case 'minimal':
        return {
          ...baseStyles,
          border: '1px solid #d1d9e0',
          borderRadius: px(BORDER_RADIUS.MD),
          boxShadow: 'none',
          overflow: 'hidden',
          bgcolor: '#ffffff',
        };
      case 'custom':
        return {
          ...baseStyles,
          // カスタムスタイルは外部のsxで完全に制御
        };
      case 'card':
      default:
        return {
          ...baseStyles,
          border: '1px solid rgba(0, 0, 0, 0.04)',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
          bgcolor: 'background.paper',
        };
    }
  };

  // ヘッダーのデフォルトスタイル
  const getHeaderStyles = (): SxProps<Theme> => {
    const baseHeaderStyles: SxProps<Theme> = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: disabled ? 'default' : 'pointer',
      transition: `all ${animation.duration}ms ${animation.easing}`,
      mb: isExpanded ? 2 : 0,
      p: variant === 'minimal' ? 2 : 0,
    };

    if (variant === 'minimal') {
      return {
        ...baseHeaderStyles,
        backgroundColor: isExpanded ? '#f6f8fa' : '#ffffff',
        borderBottom: isExpanded ? '1px solid #d1d9e0' : 'none',
        '&:hover': !disabled ? {
          backgroundColor: '#f6f8fa'
        } : {},
      };
    }

    return baseHeaderStyles;
  };

  // ローディング状態
  if (loading) {
    return (
      <Card sx={{ ...getVariantStyles(), ...sx } as SxProps<Theme>} data-testid={testId}>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={100}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // エラー状態
  if (error) {
    return (
      <Card sx={{ ...getVariantStyles(), ...sx } as SxProps<Theme>} data-testid={testId}>
        <CardContent>
          <Alert severity="error">
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // メインレンダリング
  const renderContent = () => {
    if (variant === 'minimal') {
      // minimalバリアント：ProfileFormContent互換
      return (
        <Box sx={{ ...getVariantStyles(), ...sx } as SxProps<Theme>}>
          <Box
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-expanded={isExpanded}
            aria-label={ariaLabel || `${title}を${isExpanded ? '閉じる' : '開く'}`}
            sx={{
              ...getHeaderStyles(),
              ...headerSx,
            } as SxProps<Theme>}
          >
            {customHeader || (
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: FONT_WEIGHTS.SEMI_BOLD,
                  color: disabled ? 'text.disabled' : '#24292f',
                  flex: 1
                }}
              >
                {title}
              </Typography>
            )}
            <Box sx={{ 
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: `transform ${animation.duration}ms ${animation.easing}`,
              display: 'flex',
              alignItems: 'center'
            }}>
              <ExpandMoreIcon sx={{ color: disabled ? 'action.disabled' : '#656d76' }} />
            </Box>
          </Box>
          
          {isExpanded && (
            <Box sx={{ 
              p: 3, 
              backgroundColor: '#ffffff',
              ...contentSx 
            }}>
              {children}
            </Box>
          )}
        </Box>
      );
    }

    // card/outlined/customバリアント：ProfileAccordion/InfoCard互換
    return (
      <Card sx={{ ...getVariantStyles(), ...sx } as SxProps<Theme>} data-testid={testId}>
        <CardContent sx={{ pb: variant === 'custom' ? undefined : 1 }}>
          <Box 
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-expanded={isExpanded}
            aria-label={ariaLabel || `${title}を${isExpanded ? '閉じる' : '開く'}`}
            sx={{
              ...getHeaderStyles(),
              ...headerSx,
            } as SxProps<Theme>}
          >
            {customHeader || (
              <Box display="flex" alignItems="center">
                {icon && (
                  <Box sx={{ 
                    mr: 1, 
                    color: disabled ? 'action.disabled' : 'primary.main' 
                  }}>
                    {icon}
                  </Box>
                )}
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: disabled ? 'text.disabled' : 'text.primary' 
                  }}
                >
                  {title}
                </Typography>
              </Box>
            )}
            {!customHeader && (
              <IconButton 
                aria-label={isExpanded ? `${title}を閉じる` : `${title}を開く`}
                disabled={disabled}
                size="small"
              >
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Box>
          
          <Collapse 
            in={isExpanded}
            timeout={animation.duration}
          >
            <Box sx={contentSx}>
              {children}
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  return renderContent();
};

export default CommonAccordion; 