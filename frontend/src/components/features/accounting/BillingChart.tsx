// 経理ダッシュボード用請求チャートコンポーネント

import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  IconButton,
  ButtonGroup,
  Button,
  Skeleton,
  Tooltip,
  Menu,
  MenuItem,
  useTheme,
  alpha,
  Stack,
  FormControl,
  Select,
  SelectChangeEvent,
  Chip,
} from "@mui/material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import {
  MoreVert,
  Download,
  Fullscreen,
  Info,
  TrendingUp,
  TrendingDown,
} from "@mui/icons-material";
import { formatCurrency, formatNumber } from "../../../utils/format";
import { CHART_CONFIG } from "../../../constants/accounting";
import { MonthlyTrendData, ClientRankingData } from "../../../types/accounting";

// ========== 型定義 ==========

export interface BillingChartProps {
  title: string;
  data: any[];
  type?: "line" | "bar" | "area" | "pie" | "composed";
  dataKeys?: {
    xAxis?: string;
    yAxis?: string | string[];
    category?: string;
  };
  height?: number;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  colors?: string[];
  formatters?: {
    xAxis?: (value: any) => string;
    yAxis?: (value: any) => string;
    tooltip?: (value: any) => string;
  };
  onExport?: (format: "csv" | "png") => void;
  onFullscreen?: () => void;
  customActions?: React.ReactNode;
  stacked?: boolean;
  showTrend?: boolean;
}

// ========== ユーティリティ関数 ==========

// デフォルトのフォーマッター
const defaultYAxisFormatter = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
};

// カスタムツールチップコンポーネント
const CustomTooltip: React.FC<any> = ({
  active,
  payload,
  label,
  formatter,
}) => {
  const theme = useTheme();

  if (active && payload && payload.length) {
    return (
      <Card
        sx={{
          p: 1.5,
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          boxShadow: theme.shadows[4],
        }}
      >
        <Typography variant="caption" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        {payload.map((entry: any, index: number) => (
          <Box key={index} display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: entry.color,
              }}
            />
            <Typography variant="body2">
              {entry.name}: {formatter ? formatter(entry.value) : entry.value}
            </Typography>
          </Box>
        ))}
      </Card>
    );
  }

  return null;
};

// ========== メインコンポーネント ==========

export const BillingChart: React.FC<BillingChartProps> = ({
  title,
  data,
  type = "line",
  dataKeys = {},
  height = CHART_CONFIG.DEFAULT_HEIGHT,
  loading = false,
  error = false,
  errorMessage,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  colors = CHART_CONFIG.COLORS,
  formatters = {},
  onExport,
  onFullscreen,
  customActions,
  stacked = false,
  showTrend = false,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // メニューの開閉
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // エクスポート処理
  const handleExport = (format: "csv" | "png") => {
    handleMenuClose();
    if (onExport) {
      onExport(format);
    }
  };

  // トレンド計算
  const trend = useMemo(() => {
    if (!showTrend || !data || data.length < 2) return null;

    const yKey = Array.isArray(dataKeys.yAxis)
      ? dataKeys.yAxis[0]
      : dataKeys.yAxis;
    if (!yKey) return null;

    const firstValue = data[0][yKey] || 0;
    const lastValue = data[data.length - 1][yKey] || 0;
    const change = lastValue - firstValue;
    const changePercent = firstValue !== 0 ? (change / firstValue) * 100 : 0;

    return {
      value: change,
      percent: changePercent,
      direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    };
  }, [data, dataKeys.yAxis, showTrend]);

  // チャートの描画
  const renderChart = () => {
    const xKey = dataKeys.xAxis || "name";
    const yKeys = Array.isArray(dataKeys.yAxis)
      ? dataKeys.yAxis
      : [dataKeys.yAxis || "value"];

    switch (type) {
      case "line":
        return (
          <LineChart data={data}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
              />
            )}
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 12 }}
              tickFormatter={formatters.xAxis}
              stroke={theme.palette.text.secondary}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={formatters.yAxis || defaultYAxisFormatter}
              stroke={theme.palette.text.secondary}
            />
            {showTooltip && (
              <RechartsTooltip
                content={
                  <CustomTooltip
                    formatter={formatters.tooltip || formatCurrency}
                  />
                }
              />
            )}
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );

      case "bar":
        return (
          <BarChart data={data}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
              />
            )}
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 12 }}
              tickFormatter={formatters.xAxis}
              stroke={theme.palette.text.secondary}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={formatters.yAxis || defaultYAxisFormatter}
              stroke={theme.palette.text.secondary}
            />
            {showTooltip && (
              <RechartsTooltip
                content={
                  <CustomTooltip
                    formatter={formatters.tooltip || formatCurrency}
                  />
                }
              />
            )}
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
          </BarChart>
        );

      case "area":
        return (
          <AreaChart data={data}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
              />
            )}
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 12 }}
              tickFormatter={formatters.xAxis}
              stroke={theme.palette.text.secondary}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={formatters.yAxis || defaultYAxisFormatter}
              stroke={theme.palette.text.secondary}
            />
            {showTooltip && (
              <RechartsTooltip
                content={
                  <CustomTooltip
                    formatter={formatters.tooltip || formatCurrency}
                  />
                }
              />
            )}
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.6}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
          </AreaChart>
        );

      case "pie":
        const categoryKey = dataKeys.category || "name";
        const valueKey = yKeys[0];
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={categoryKey}
              cx="50%"
              cy="50%"
              outerRadius={Math.min(height / 2 - 40, 150)}
              label={({ value }) =>
                formatters.tooltip
                  ? formatters.tooltip(value)
                  : formatCurrency(value)
              }
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            {showTooltip && (
              <RechartsTooltip
                content={
                  <CustomTooltip
                    formatter={formatters.tooltip || formatCurrency}
                  />
                }
              />
            )}
            {showLegend && <Legend />}
          </PieChart>
        );

      case "composed":
        return (
          <ComposedChart data={data}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
              />
            )}
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 12 }}
              tickFormatter={formatters.xAxis}
              stroke={theme.palette.text.secondary}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={formatters.yAxis || defaultYAxisFormatter}
              stroke={theme.palette.text.secondary}
            />
            {showTooltip && (
              <RechartsTooltip
                content={
                  <CustomTooltip
                    formatter={formatters.tooltip || formatCurrency}
                  />
                }
              />
            )}
            {showLegend && <Legend />}
            {yKeys.map((key, index) => {
              if (index === 0) {
                return (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={colors[index % colors.length]}
                  />
                );
              } else {
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                  />
                );
              }
            })}
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  // エラー表示
  if (error && !loading) {
    return (
      <Card sx={{ height }}>
        <CardContent
          sx={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box textAlign="center">
            <Typography color="error" gutterBottom>
              データの読み込みに失敗しました
            </Typography>
            {errorMessage && (
              <Typography variant="caption" color="text.secondary">
                {errorMessage}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">{title}</Typography>
            {trend && (
              <Chip
                size="small"
                icon={
                  trend.direction === "up" ? (
                    <TrendingUp fontSize="small" />
                  ) : trend.direction === "down" ? (
                    <TrendingDown fontSize="small" />
                  ) : undefined
                }
                label={`${trend.percent > 0 ? "+" : ""}${trend.percent.toFixed(1)}%`}
                color={
                  trend.direction === "up"
                    ? "success"
                    : trend.direction === "down"
                      ? "error"
                      : "default"
                }
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        }
        action={
          <Stack direction="row" spacing={1}>
            {customActions}
            {onFullscreen && (
              <IconButton size="small" onClick={onFullscreen}>
                <Fullscreen />
              </IconButton>
            )}
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVert />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => handleExport("csv")}>
                <Download sx={{ mr: 1, fontSize: 20 }} />
                CSVでダウンロード
              </MenuItem>
              <MenuItem onClick={() => handleExport("png")}>
                <Download sx={{ mr: 1, fontSize: 20 }} />
                画像でダウンロード
              </MenuItem>
            </Menu>
          </Stack>
        }
        sx={{ pb: 0 }}
      />
      <CardContent sx={{ height: `calc(100% - 64px)`, pt: 1 }}>
        {loading ? (
          <Skeleton variant="rectangular" width="100%" height={height - 80} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

// ========== 月次トレンドチャート専用コンポーネント ==========

export interface MonthlyTrendChartProps {
  data: MonthlyTrendData[];
  height?: number;
  loading?: boolean;
  error?: boolean;
  selectedMetric?: "amount" | "count";
  onMetricChange?: (metric: "amount" | "count") => void;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  data,
  height = 400,
  loading = false,
  error = false,
  selectedMetric = "amount",
  onMetricChange,
}) => {
  const formatXAxis = (value: string) => {
    const [year, month] = value.split("-");
    return `${month}月`;
  };

  const formatYAxis = (value: number) => {
    if (selectedMetric === "amount") {
      return formatCurrency(value);
    }
    return `${value}件`;
  };

  return (
    <BillingChart
      title="月次推移"
      data={data}
      type="composed"
      dataKeys={{
        xAxis: "yearMonth",
        yAxis:
          selectedMetric === "amount"
            ? ["processedAmount", "pendingAmount"]
            : ["processedCount", "pendingCount"],
      }}
      height={height}
      loading={loading}
      error={error}
      formatters={{
        xAxis: formatXAxis,
        yAxis: selectedMetric === "amount" ? undefined : (v) => `${v}`,
        tooltip: selectedMetric === "amount" ? formatCurrency : (v) => `${v}件`,
      }}
      showTrend
      customActions={
        onMetricChange && (
          <FormControl size="small">
            <Select
              value={selectedMetric}
              onChange={(e: SelectChangeEvent) =>
                onMetricChange(e.target.value as "amount" | "count")
              }
              sx={{ minWidth: 100 }}
            >
              <MenuItem value="amount">金額</MenuItem>
              <MenuItem value="count">件数</MenuItem>
            </Select>
          </FormControl>
        )
      }
    />
  );
};

// ========== 取引先ランキングチャート専用コンポーネント ==========

export interface ClientRankingChartProps {
  data: ClientRankingData[];
  height?: number;
  loading?: boolean;
  error?: boolean;
  limit?: number;
}

export const ClientRankingChart: React.FC<ClientRankingChartProps> = ({
  data,
  height = 400,
  loading = false,
  error = false,
  limit = 10,
}) => {
  const theme = useTheme();

  // 上位N件のデータを取得
  const topData = useMemo(() => {
    return data.slice(0, limit);
  }, [data, limit]);

  return (
    <BillingChart
      title={`取引先別請求額TOP${limit}`}
      data={topData}
      type="bar"
      dataKeys={{
        xAxis: "clientName",
        yAxis: "totalAmount",
      }}
      height={height}
      loading={loading}
      error={error}
      formatters={{
        tooltip: formatCurrency,
      }}
      showLegend={false}
      colors={[theme.palette.primary.main]}
    />
  );
};

// ========== 請求ステータス分布チャート ==========

export interface BillingStatusChartProps {
  data: Array<{
    status: string;
    statusLabel: string;
    count: number;
    amount: number;
  }>;
  height?: number;
  loading?: boolean;
  error?: boolean;
  valueType?: "count" | "amount";
}

export const BillingStatusChart: React.FC<BillingStatusChartProps> = ({
  data,
  height = 300,
  loading = false,
  error = false,
  valueType = "amount",
}) => {
  return (
    <BillingChart
      title="請求ステータス分布"
      data={data}
      type="pie"
      dataKeys={{
        category: "statusLabel",
        yAxis: [valueType],
      }}
      height={height}
      loading={loading}
      error={error}
      formatters={{
        tooltip: valueType === "amount" ? formatCurrency : (v) => `${v}件`,
      }}
    />
  );
};

// ========== 時系列比較チャート ==========

export interface TimeSeriesComparisonChartProps {
  data: any[];
  series: Array<{
    key: string;
    label: string;
    color?: string;
  }>;
  height?: number;
  loading?: boolean;
  error?: boolean;
  xAxisKey?: string;
  showArea?: boolean;
}

export const TimeSeriesComparisonChart: React.FC<
  TimeSeriesComparisonChartProps
> = ({
  data,
  series,
  height = 400,
  loading = false,
  error = false,
  xAxisKey = "date",
  showArea = false,
}) => {
  const seriesKeys = series.map((s) => s.key);
  const seriesColors = series.map((s) => s.color).filter(Boolean) as string[];

  return (
    <BillingChart
      title="期間比較"
      data={data}
      type={showArea ? "area" : "line"}
      dataKeys={{
        xAxis: xAxisKey,
        yAxis: seriesKeys,
      }}
      height={height}
      loading={loading}
      error={error}
      colors={seriesColors.length > 0 ? seriesColors : undefined}
      stacked={showArea}
    />
  );
};
