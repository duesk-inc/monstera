import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { AccessTime as AccessTimeIcon } from '@mui/icons-material';
import ActionButton from '@/components/common/ActionButton';

interface WeeklyWorkSummaryProps {
  totalHours: number;
  clientTotalHours: number;
  isSubmitted: boolean;
  loading: boolean;
  onBulkSettings: () => void;
  onDefaultSettings: () => void;
}

export default function WeeklyWorkSummary({
  totalHours,
  clientTotalHours,
  isSubmitted,
  loading,
  onBulkSettings,
  onDefaultSettings,
}: WeeklyWorkSummaryProps) {
  return (
    <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, mb: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        gap: 2 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTimeIcon sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight="bold">
            今週の勤務時間
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1 
        }}>
          <ActionButton
            buttonType="secondary"
            onClick={onBulkSettings}
            sx={{ borderRadius: 2, height: 36, whiteSpace: 'nowrap' }}
            disabled={isSubmitted}
          >
            一括設定
          </ActionButton>

          <ActionButton
            buttonType="default"
            onClick={onDefaultSettings}
            sx={{ borderRadius: 2, height: 36, whiteSpace: 'nowrap' }}
            disabled={loading}
          >
            デフォルト設定
          </ActionButton>
        </Box>
      </Box>
        
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-start', 
        alignItems: 'center', 
        pt: 1, 
        borderTop: '1px solid #eee' 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTimeIcon sx={{ color: 'primary.main' }} />
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: { xs: 0, sm: 3 }
          }}>
            <Typography variant="body2" fontWeight="medium">
              自社勤怠：{totalHours.toFixed(2)} 時間
            </Typography>
            {clientTotalHours > 0 && (
              <Typography variant="body2" fontWeight="medium" color="secondary">
                客先勤怠：{clientTotalHours.toFixed(2)} 時間
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
} 