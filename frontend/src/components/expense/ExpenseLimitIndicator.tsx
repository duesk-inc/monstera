'use client';

import React from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  Chip,
  LinearProgress,
  Typography,
  Stack,
  Divider,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { type LimitCheckResult } from '@/lib/api/expenseLimit';
import { useLimitCheckHelpers } from '@/hooks/useExpenseLimitCheck';

interface ExpenseLimitIndicatorProps {
  limitResult: LimitCheckResult;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * 経費申請の上限チェック結果を表示するコンポーネント
 */
export default function ExpenseLimitIndicator({
  limitResult,
  showDetails = true,
  compact = false,
}: ExpenseLimitIndicatorProps) {
  const { formatCurrency, getLimitStatusMessage, getLimitStatusColor, canSubmitExpense } = useLimitCheckHelpers();

  const statusColor = getLimitStatusColor(limitResult);
  const statusMessage = getLimitStatusMessage(limitResult);
  const canSubmit = canSubmitExpense(limitResult);

  // 月次進捗率の計算
  const monthlyProgress = (limitResult.currentMonthlyAmount / limitResult.monthlyLimitAmount) * 100;
  const yearlyProgress = (limitResult.currentYearlyAmount / limitResult.yearlyLimitAmount) * 100;

  // コンパクト表示
  if (compact) {
    return (
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            icon={
              statusColor === 'error' ? <ErrorIcon /> :
              statusColor === 'warning' ? <WarningIcon /> :
              <CheckCircleIcon />
            }
            label={statusMessage}
            color={statusColor}
            size="small"
            variant={statusColor === 'success' ? 'outlined' : 'filled'}
          />
          {!canSubmit && (
            <Typography variant="caption" color="error">
              申請できません
            </Typography>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* メインステータス */}
      <Alert 
        severity={statusColor} 
        icon={
          statusColor === 'error' ? <ErrorIcon /> :
          statusColor === 'warning' ? <WarningIcon /> :
          <CheckCircleIcon />
        }
        sx={{ mb: showDetails ? 2 : 0 }}
      >
        <AlertTitle>
          {statusColor === 'error' ? '上限超過' :
           statusColor === 'warning' ? '上限接近' :
           '上限内'}
        </AlertTitle>
        {statusMessage}
        {!canSubmit && (
          <Typography variant="body2" sx={{ mt: 1, fontWeight: 'medium' }}>
            この金額では申請を提出できません。金額を調整してください。
          </Typography>
        )}
      </Alert>

      {/* 詳細情報 */}
      {showDetails && (
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            上限使用状況
          </Typography>

          {/* 月次上限 */}
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                月次上限
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(limitResult.currentMonthlyAmount)} / {formatCurrency(limitResult.monthlyLimitAmount)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(monthlyProgress, 100)}
              color={
                monthlyProgress >= 100 ? 'error' :
                monthlyProgress >= (limitResult.warningThreshold * 100) ? 'warning' :
                'success'
              }
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {monthlyProgress.toFixed(1)}% 使用
              </Typography>
              <Typography variant="caption" color="text.secondary">
                残り {formatCurrency(limitResult.remainingMonthlyAmount)}
              </Typography>
            </Stack>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* 年次上限 */}
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                年次上限
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(limitResult.currentYearlyAmount)} / {formatCurrency(limitResult.yearlyLimitAmount)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(yearlyProgress, 100)}
              color={
                yearlyProgress >= 100 ? 'error' :
                yearlyProgress >= (limitResult.warningThreshold * 100) ? 'warning' :
                'success'
              }
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {yearlyProgress.toFixed(1)}% 使用
              </Typography>
              <Typography variant="caption" color="text.secondary">
                残り {formatCurrency(limitResult.remainingYearlyAmount)}
              </Typography>
            </Stack>
          </Box>

          {/* 予測値（もし提供されている場合） */}
          {(limitResult.projectedMonthlyAmount || limitResult.projectedYearlyAmount) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                今月末予測
              </Typography>
              {limitResult.projectedMonthlyAmount && (
                <Typography variant="caption" display="block" color="text.secondary">
                  月次: {formatCurrency(limitResult.projectedMonthlyAmount)}
                </Typography>
              )}
              {limitResult.projectedYearlyAmount && (
                <Typography variant="caption" display="block" color="text.secondary">
                  年次: {formatCurrency(limitResult.projectedYearlyAmount)}
                </Typography>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}