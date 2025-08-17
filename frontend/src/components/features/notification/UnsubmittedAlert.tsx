'use client';

// Migrated to new API client system
import React from 'react';
import { Alert, Box, Typography, Button } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createPresetApiClient } from '@/lib/api';

interface UnsubmittedAlertProps {
  onClose?: () => void;
}

export const UnsubmittedAlert: React.FC<UnsubmittedAlertProps> = ({ onClose }) => {
  const router = useRouter();

  // 未提出者数を取得
  const { data: unsubmittedData } = useQuery({
    queryKey: ['unsubmitted', 'summary'],
    queryFn: async () => {
      const client = createPresetApiClient('auth');
      const response = await client.get('/weekly-reports/unsubmitted/summary');
      return response.data;
    },
    refetchInterval: 60000, // 1分ごとに更新
  });

  if (!unsubmittedData || unsubmittedData.total_unsubmitted === 0) {
    return null;
  }

  const handleViewDetails = () => {
    router.push('/admin/weekly-reports?tab=unsubmitted');
  };

  return (
    <Alert
      severity="warning"
      icon={<WarningIcon />}
      onClose={onClose}
      action={
        <Button color="inherit" size="small" onClick={handleViewDetails}>
          詳細を見る
        </Button>
      }
      sx={{
        mb: 2,
        '& .MuiAlert-message': {
          width: '100%',
        },
      }}
    >
      <Box>
        <Typography variant="body2" fontWeight="medium">
          週報未提出者がいます
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {unsubmittedData.total_unsubmitted}名の未提出者がいます。
          {unsubmittedData.overdue_14days_plus > 0 && (
            <>
              うち{unsubmittedData.overdue_14days_plus}名は14日以上未提出です。
            </>
          )}
        </Typography>
      </Box>
    </Alert>
  );
};