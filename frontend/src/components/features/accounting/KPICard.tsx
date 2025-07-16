// 経理ダッシュボード用KPIカードコンポーネント

import React from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Skeleton,
  Tooltip,
  IconButton,
  Chip,
  Stack,
  useTheme,
  alpha,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Info,
  Refresh,
  Warning,
  CheckCircle,
} from "@mui/icons-material";
import { formatCurrency, formatNumber } from "../../../utils/format";

// ========== 型定義 ==========

export interface KPICardProps {
  title: string;
  value: number | string;
  previousValue?: number | string;
  unit?: "currency" | "percentage" | "count" | "hours" | "custom";
  customUnit?: string;
  description?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: number;
  trendLabel?: string;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  icon?: React.ReactNode;
  color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
  size?: "small" | "medium" | "large";
  status?: "good" | "warning" | "error" | "neutral";
  statusMessage?: string;
  onClick?: () => void;
  onRefresh?: () => void;
  footerContent?: React.ReactNode;
  highlight?: boolean;
  showTrendIcon?: boolean;
  decimals?: number;
}

// ========== メインコンポーネント ==========

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  previousValue,
  unit = "custom",
  customUnit = "",
  description,
  trend,
  trendValue,
  trendLabel,
  loading = false,
  error = false,
  errorMessage,
  icon,
  color = "primary",
  size = "medium",
  status,
  statusMessage,
  onClick,
  onRefresh,
  footerContent,
  highlight = false,
  showTrendIcon = true,
  decimals = 0,
}) => {
  const theme = useTheme();

  // サイズに応じたスタイル
  const sizeStyles = {
    small: {
      minHeight: 120,
      titleFontSize: "0.875rem",
      valueFontSize: "1.5rem",
      padding: 2,
    },
    medium: {
      minHeight: 160,
      titleFontSize: "1rem",
      valueFontSize: "2rem",
      padding: 3,
    },
    large: {
      minHeight: 200,
      titleFontSize: "1.125rem",
      valueFontSize: "2.5rem",
      padding: 3,
    },
  };

  const currentStyle = sizeStyles[size];

  // 値のフォーマット
  const formatValue = (val: number | string): string => {
    if (typeof val === "string") return val;

    switch (unit) {
      case "currency":
        return formatCurrency(val);
      case "percentage":
        return `${val.toFixed(decimals)}%`;
      case "count":
        return formatNumber(val);
      case "hours":
        return `${formatNumber(val)}時間`;
      case "custom":
        return `${formatNumber(val)}${customUnit}`;
      default:
        return String(val);
    }
  };

  // トレンドアイコンの取得
  const getTrendIcon = () => {
    if (!showTrendIcon || !trend) return null;

    const iconProps = {
      fontSize: "small" as const,
      sx: { ml: 1 },
    };

    switch (trend) {
      case "up":
        return <TrendingUp {...iconProps} color="success" />;
      case "down":
        return <TrendingDown {...iconProps} color="error" />;
      case "flat":
        return <TrendingFlat {...iconProps} color="action" />;
      default:
        return null;
    }
  };

  // ステータスの色を取得
  const getStatusColor = () => {
    switch (status) {
      case "good":
        return theme.palette.success.main;
      case "warning":
        return theme.palette.warning.main;
      case "error":
        return theme.palette.error.main;
      case "neutral":
      default:
        return theme.palette.text.secondary;
    }
  };

  // ステータスアイコンの取得
  const getStatusIcon = () => {
    switch (status) {
      case "good":
        return <CheckCircle sx={{ fontSize: 16, color: getStatusColor() }} />;
      case "warning":
        return <Warning sx={{ fontSize: 16, color: getStatusColor() }} />;
      default:
        return null;
    }
  };

  // カードの背景色を取得
  const getCardBackgroundColor = () => {
    if (highlight) {
      return alpha(theme.palette[color].main, 0.08);
    }
    return theme.palette.background.paper;
  };

  // エラー表示
  if (error && !loading) {
    return (
      <Card
        sx={{
          minHeight: currentStyle.minHeight,
          cursor: onClick ? "pointer" : "default",
          transition: "all 0.3s ease",
          "&:hover": onClick
            ? {
                transform: "translateY(-4px)",
                boxShadow: theme.shadows[4],
              }
            : {},
        }}
        onClick={onClick}
      >
        <CardContent sx={{ p: currentStyle.padding }}>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight={currentStyle.minHeight - 48}
          >
            <Warning color="error" sx={{ fontSize: 48, mb: 2 }} />
            <Typography color="error" variant="body2" align="center">
              {errorMessage || "データの取得に失敗しました"}
            </Typography>
            {onRefresh && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                sx={{ mt: 1 }}
              >
                <Refresh />
              </IconButton>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        minHeight: currentStyle.minHeight,
        cursor: onClick ? "pointer" : "default",
        backgroundColor: getCardBackgroundColor(),
        transition: "all 0.3s ease",
        border: highlight ? `2px solid ${theme.palette[color].main}` : "none",
        "&:hover": onClick
          ? {
              transform: "translateY(-4px)",
              boxShadow: theme.shadows[4],
            }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: currentStyle.padding }}>
        {/* ヘッダー部分 */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={2}
        >
          <Box display="flex" alignItems="center" flex={1}>
            {icon && (
              <Box
                sx={{
                  color: theme.palette[color].main,
                  mr: 1,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {icon}
              </Box>
            )}
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{
                fontSize: currentStyle.titleFontSize,
                fontWeight: 500,
              }}
            >
              {title}
            </Typography>
            {description && (
              <Tooltip title={description} placement="top">
                <IconButton size="small" sx={{ ml: 0.5 }}>
                  <Info sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          {onRefresh && !loading && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
            >
              <Refresh sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </Box>

        {/* 値表示部分 */}
        <Box>
          {loading ? (
            <Skeleton
              variant="text"
              width="60%"
              height={currentStyle.valueFontSize}
            />
          ) : (
            <Box display="flex" alignItems="baseline">
              <Typography
                variant="h4"
                sx={{
                  fontSize: currentStyle.valueFontSize,
                  fontWeight: 700,
                  color: theme.palette[color].main,
                }}
              >
                {formatValue(value)}
              </Typography>
              {getTrendIcon()}
            </Box>
          )}
        </Box>

        {/* トレンド情報 */}
        {(trendValue !== undefined || trendLabel || previousValue) &&
          !loading && (
            <Box mt={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                {trendValue !== undefined && (
                  <Chip
                    label={`${trendValue > 0 ? "+" : ""}${trendValue.toFixed(1)}%`}
                    size="small"
                    color={
                      trendValue > 0
                        ? "success"
                        : trendValue < 0
                          ? "error"
                          : "default"
                    }
                    sx={{ height: 20 }}
                  />
                )}
                {previousValue !== undefined && (
                  <Typography variant="caption" color="text.secondary">
                    前回: {formatValue(previousValue)}
                  </Typography>
                )}
                {trendLabel && (
                  <Typography variant="caption" color="text.secondary">
                    {trendLabel}
                  </Typography>
                )}
              </Stack>
            </Box>
          )}

        {/* ステータス表示 */}
        {status && statusMessage && !loading && (
          <Box mt={1.5} display="flex" alignItems="center" gap={0.5}>
            {getStatusIcon()}
            <Typography
              variant="caption"
              sx={{
                color: getStatusColor(),
                fontWeight: 500,
              }}
            >
              {statusMessage}
            </Typography>
          </Box>
        )}

        {/* フッターコンテンツ */}
        {footerContent && !loading && (
          <Box mt={2} pt={2} borderTop={1} borderColor="divider">
            {footerContent}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ========== KPIカードグループコンポーネント ==========

export interface KPICardGroupProps {
  children: React.ReactNode;
  spacing?: number;
}

export const KPICardGroup: React.FC<KPICardGroupProps> = ({
  children,
  spacing = 3,
}) => {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{
        xs: "1fr",
        sm: "repeat(2, 1fr)",
        md: "repeat(3, 1fr)",
        lg: "repeat(4, 1fr)",
      }}
      gap={spacing}
    >
      {children}
    </Box>
  );
};

// ========== 比較用KPIカード ==========

export interface ComparisonKPICardProps extends Omit<KPICardProps, "value"> {
  currentValue: number | string;
  compareValue: number | string;
  compareLabel?: string;
  showDifference?: boolean;
}

export const ComparisonKPICard: React.FC<ComparisonKPICardProps> = ({
  currentValue,
  compareValue,
  compareLabel = "前期",
  showDifference = true,
  ...props
}) => {
  // 差分の計算
  const calculateDifference = () => {
    if (typeof currentValue === "string" || typeof compareValue === "string") {
      return null;
    }

    const current = Number(currentValue);
    const compare = Number(compareValue);

    if (compare === 0) return null;

    const difference = ((current - compare) / compare) * 100;
    return difference;
  };

  const difference = calculateDifference();
  const trend = difference
    ? difference > 0
      ? "up"
      : difference < 0
        ? "down"
        : "flat"
    : undefined;

  return (
    <KPICard
      {...props}
      value={currentValue}
      previousValue={compareValue}
      trend={trend}
      trendValue={difference || undefined}
      trendLabel={compareLabel}
    />
  );
};

// ========== ミニKPIカード ==========

export interface MiniKPICardProps {
  label: string;
  value: number | string;
  unit?: KPICardProps["unit"];
  customUnit?: string;
  color?: KPICardProps["color"];
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const MiniKPICard: React.FC<MiniKPICardProps> = ({
  label,
  value,
  unit = "custom",
  customUnit = "",
  color = "primary",
  icon,
  onClick,
}) => {
  const theme = useTheme();

  const formatValue = (val: number | string): string => {
    if (typeof val === "string") return val;

    switch (unit) {
      case "currency":
        return formatCurrency(val);
      case "percentage":
        return `${val.toFixed(1)}%`;
      case "count":
        return formatNumber(val);
      case "hours":
        return `${formatNumber(val)}h`;
      case "custom":
        return `${formatNumber(val)}${customUnit}`;
      default:
        return String(val);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        backgroundColor: alpha(theme.palette[color].main, 0.08),
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        "&:hover": onClick
          ? {
              backgroundColor: alpha(theme.palette[color].main, 0.12),
            }
          : {},
      }}
      onClick={onClick}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        {icon && (
          <Box
            sx={{
              color: theme.palette[color].main,
              display: "flex",
              alignItems: "center",
            }}
          >
            {icon}
          </Box>
        )}
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            {label}
          </Typography>
          <Typography
            variant="body1"
            fontWeight={600}
            color={theme.palette[color].main}
          >
            {formatValue(value)}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};
