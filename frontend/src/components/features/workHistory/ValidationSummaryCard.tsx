import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Divider,
} from '@mui/material';
import { useResponsive } from '../../../hooks/common/useResponsive';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import type { WorkHistoryValidationResult } from '../../../hooks/workHistory/useWorkHistoryValidationEnhanced';

const StatusCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[1],
  [theme.breakpoints.down('sm')]: {
    marginBottom: theme.spacing(1.5),
    boxShadow: theme.shadows[0],
  },
}));

const ScoreContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: theme.spacing(1.5),
    alignItems: 'stretch',
  },
}));

const StatsGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing(0.75),
  },
}));

const StatItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[50],
}));

interface ValidationSummaryCardProps {
  validation: WorkHistoryValidationResult;
  showDetails?: boolean;
  compact?: boolean;
}

export const ValidationSummaryCard: React.FC<ValidationSummaryCardProps> = ({
  validation,
  showDetails = true,
  compact = false,
}) => {
  const { isMobile } = useResponsive();
  const {
    isValid,
    errors = [],
    warnings = [],
    overallScore = 0,
    completionRate = 0,
  } = validation;

  const getScoreColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getCompletionColor = (rate: number): 'success' | 'warning' | 'error' => {
    if (rate >= 90) return 'success';
    if (rate >= 70) return 'warning';
    return 'error';
  };

  const getStatusIcon = () => {
    if (isValid && warnings.length === 0) {
      return <CheckCircleIcon color="success" />;
    } else if (isValid && warnings.length > 0) {
      return <WarningIcon color="warning" />;
    } else {
      return <ErrorIcon color="error" />;
    }
  };

  const getStatusText = () => {
    if (isValid && warnings.length === 0) {
      return '入力完了';
    } else if (isValid && warnings.length > 0) {
      return '入力完了（要確認）';
    } else {
      return '入力不完全';
    }
  };

  const getStatusColor = (): 'success' | 'warning' | 'error' => {
    if (isValid && warnings.length === 0) return 'success';
    if (isValid && warnings.length > 0) return 'warning';
    return 'error';
  };

  if (compact || isMobile) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        gap: isMobile ? 1 : 2, 
        p: isMobile ? 1.5 : 1,
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          width: isMobile ? '100%' : 'auto',
        }}>
          {getStatusIcon()}
          <Box sx={{ flexGrow: 1 }}>
            <Typography 
              variant={isMobile ? 'body2' : 'body2'} 
              fontWeight="medium"
              sx={{ fontSize: isMobile ? '0.9rem' : undefined }}
            >
              {getStatusText()}
            </Typography>
          </Box>
          
          {/* モバイルではエラー数を右上に表示 */}
          {isMobile && (errors.length > 0 || warnings.length > 0) && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {errors.length > 0 && (
                <Chip
                  label={errors.length}
                  size="small"
                  color="error"
                  variant="filled"
                  sx={{ minWidth: 24, height: 20, fontSize: '0.7rem' }}
                />
              )}
              {warnings.length > 0 && (
                <Chip
                  label={warnings.length}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ minWidth: 24, height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          )}
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          gap: isMobile ? 0.75 : 1, 
          flexDirection: isMobile ? 'row' : 'row',
          flexWrap: 'wrap',
          width: isMobile ? '100%' : 'auto',
        }}>
          <Chip
            label={`完了率 ${completionRate}%`}
            size="small"
            color={getCompletionColor(completionRate)}
            variant="outlined"
            sx={{ 
              fontSize: isMobile ? '0.7rem' : undefined,
              height: isMobile ? 24 : undefined,
            }}
          />
          <Chip
            label={`スコア ${overallScore}`}
            size="small"
            color={getScoreColor(overallScore)}
            variant="outlined"
            sx={{ 
              fontSize: isMobile ? '0.7rem' : undefined,
              height: isMobile ? 24 : undefined,
            }}
          />
          
          {/* デスクトップではエラー数を右端に表示 */}
          {!isMobile && errors.length > 0 && (
            <Chip
              label={`エラー ${errors.length}`}
              size="small"
              color="error"
              variant="filled"
            />
          )}
          {!isMobile && warnings.length > 0 && (
            <Chip
              label={`警告 ${warnings.length}`}
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Box>
      </Box>
    );
  }

  return (
    <StatusCard>
      <CardContent>
        {/* ステータスヘッダー */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {getStatusIcon()}
          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
            フォーム入力状況
          </Typography>
          <Chip
            label={getStatusText()}
            color={getStatusColor()}
            variant={isValid ? 'filled' : 'outlined'}
          />
        </Box>

        {/* スコア表示 */}
        <ScoreContainer>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              全体スコア
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={overallScore}
                color={getScoreColor(overallScore)}
                sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
              />
              <Typography variant="h6" color={`${getScoreColor(overallScore)}.main`}>
                {overallScore}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              入力完了率
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={completionRate}
                color={getCompletionColor(completionRate)}
                sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
              />
              <Typography variant="h6" color={`${getCompletionColor(completionRate)}.main`}>
                {completionRate}%
              </Typography>
            </Box>
          </Box>
        </ScoreContainer>

        {showDetails && (
          <>
            <Divider sx={{ mb: 2 }} />
            
            {/* 統計情報 */}
            <Typography variant="subtitle2" gutterBottom>
              チェック結果
            </Typography>
            <StatsGrid>
              <StatItem>
                <CheckCircleIcon color="success" fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    正常
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {Object.keys(validation.fieldErrors || {}).length - errors.length - warnings.length}
                  </Typography>
                </Box>
              </StatItem>

              <StatItem>
                <ErrorIcon color="error" fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    エラー
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {errors.length}
                  </Typography>
                </Box>
              </StatItem>

              <StatItem>
                <WarningIcon color="warning" fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    警告
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {warnings.length}
                  </Typography>
                </Box>
              </StatItem>

              <StatItem>
                <InfoIcon color="info" fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    情報
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    0
                  </Typography>
                </Box>
              </StatItem>
            </StatsGrid>

            {/* アドバイス */}
            {!isValid && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'error.light', borderRadius: 1 }}>
                <Typography variant="body2" color="error.contrastText">
                  <strong>必須項目をすべて入力してください。</strong>
                  エラーがある項目を確認し、適切な値を入力してください。
                </Typography>
              </Box>
            )}

            {isValid && warnings.length > 0 && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="body2" color="warning.contrastText">
                  <strong>入力は完了していますが、推奨事項があります。</strong>
                  警告内容を確認し、可能であれば改善することをお勧めします。
                </Typography>
              </Box>
            )}

            {isValid && warnings.length === 0 && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="body2" color="success.contrastText">
                  <strong>すべての入力が完了しています。</strong>
                  フォームを保存して処理を完了してください。
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </StatusCard>
  );
};

export default ValidationSummaryCard;