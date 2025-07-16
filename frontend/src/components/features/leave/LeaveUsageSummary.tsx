import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import {
  Send as SendIcon,
  EventBusy as HolidayIcon,
} from '@mui/icons-material';
import ActionButton from '@/components/common/ActionButton';

interface LeaveUsageSummaryProps {
  calculatedDays: number;
  isSubmitting: boolean;
  isSubmitDisabled: boolean;
  onSubmit: () => void;
}

const styles = {
  usageSummary: {
    display: 'flex', 
    alignItems: 'center',
    justifyContent: 'space-between',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2,
    px: 3,
    py: 2,
    bgcolor: 'background.paper',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  dateIconContainer: {
    bgcolor: 'primary.main', 
    color: 'white',
    borderRadius: '50%', 
    width: 48, 
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    mr: 2.5
  },
  submitButton: {
    minWidth: 160,
    py: 1.5,
  },
};

export default function LeaveUsageSummary({
  calculatedDays,
  isSubmitting,
  isSubmitDisabled,
  onSubmit,
}: LeaveUsageSummaryProps) {
  return (
    <Box sx={styles.usageSummary}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={styles.dateIconContainer}>
          <HolidayIcon />
        </Box>
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            利用日数
          </Typography>
          <Typography 
            variant="h4" 
            color="primary.main" 
            fontWeight="bold"
            sx={{ lineHeight: 1 }}
          >
            {calculatedDays.toFixed(1)} 日
          </Typography>
        </Box>
      </Box>
      
      <ActionButton
        type="submit"
        buttonType="primary"
        size="large"
        loading={isSubmitting}
        disabled={isSubmitDisabled}
        icon={<SendIcon />}
        sx={styles.submitButton}
        onClick={onSubmit}
      >
        申請する
      </ActionButton>
    </Box>
  );
} 