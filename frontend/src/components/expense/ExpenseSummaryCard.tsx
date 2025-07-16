'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Grid,
  Chip,
  Stack,
  Divider,
  Skeleton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { type ExpensePeriodSummary } from '@/lib/api/expenseSummary';
import { useExpenseSummaryUtils } from '@/hooks/useExpenseSummary';

interface ExpenseSummaryCardProps {
  title: string;
  summary: ExpensePeriodSummary;
  isLoading?: boolean;
  compact?: boolean;
  showProgress?: boolean;
  showBreakdown?: boolean;
}

/**
 * 経費申請集計情報を表示するカードコンポーネント
 */
export default function ExpenseSummaryCard({
  title,
  summary,
  isLoading = false,
  compact = false,
  showProgress = true,
  showBreakdown = true,
}: ExpenseSummaryCardProps) {
  const {
    formatCurrency,
    formatUsageRate,
    getUsageColor,
    isOverLimit,
    isNearLimit,
  } = useExpenseSummaryUtils();

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} />
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="rectangular" height={8} sx={{ mt: 1, mb: 1 }} />
            <Skeleton variant="text" width="60%" />
          </Box>
        </CardContent>
      </Card>
    );
  }

  const usageColor = getUsageColor(summary.usageRate);
  const isOver = isOverLimit(summary.totalAmount, summary.limit);
  const isNear = isNearLimit(summary.totalAmount, summary.limit);

  return (
    <Card>
      <CardContent>
        {/* タイトル */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {summary.period}
          </Typography>
        </Stack>

        {/* メイン金額表示 */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography variant="h4" component="div" fontWeight="bold">
              {formatCurrency(summary.totalAmount)}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {isOver && (
                <Chip
                  icon={<WarningIcon />}
                  label="上限超過"
                  color="error"
                  size="small"
                />
              )}
              {!isOver && isNear && (
                <Chip
                  icon={<WarningIcon />}
                  label="上限接近"
                  color="warning"
                  size="small"
                />
              )}
              <Typography variant="body2" color="text.secondary">
                / {formatCurrency(summary.limit)}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* 進捗バー */}
        {showProgress && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(summary.usageRate, 100)}
              color={usageColor}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {formatUsageRate(summary.usageRate)} 使用
              </Typography>
              <Typography variant="caption" color="text.secondary">
                残り {formatCurrency(summary.remaining)}
              </Typography>
            </Stack>
          </Box>
        )}

        {/* 内訳情報 */}
        {showBreakdown && !compact && (
          <>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    承認済み
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" color="success.main">
                    {formatCurrency(summary.approvedAmount)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    承認待ち
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" color="warning.main">
                    {formatCurrency(summary.pendingAmount)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    却下
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" color="error.main">
                    {formatCurrency(summary.rejectedAmount)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </>
        )}

        {/* コンパクト表示時の簡易内訳 */}
        {showBreakdown && compact && (
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" color="success.main">
                承認
              </Typography>
              <Typography variant="caption" fontWeight="medium">
                {formatCurrency(summary.approvedAmount)}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" color="warning.main">
                待機
              </Typography>
              <Typography variant="caption" fontWeight="medium">
                {formatCurrency(summary.pendingAmount)}
              </Typography>
            </Stack>
            {summary.rejectedAmount > 0 && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" color="error.main">
                  却下
                </Typography>
                <Typography variant="caption" fontWeight="medium">
                  {formatCurrency(summary.rejectedAmount)}
                </Typography>
              </Stack>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}