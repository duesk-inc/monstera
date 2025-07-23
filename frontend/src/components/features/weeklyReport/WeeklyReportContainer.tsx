import React from 'react';
import { Paper, Divider, Box } from '@mui/material';
import { Save as SaveIcon, Send as SendIcon } from '@mui/icons-material';
import ActionButton from '@/components/common/ActionButton';
import WeeklySummary from './WeeklySummary';

interface WeeklyReportContainerProps {
  weeklyRemarks: string;
  weeklyRemarksError?: string;
  isSubmitted: boolean;
  loading: boolean;
  onWeeklyRemarksChange: (value: string) => void;
  onSave: () => void;
  onSubmit: () => void;
}

export default function WeeklyReportContainer({
  weeklyRemarks,
  weeklyRemarksError,
  isSubmitted,
  loading,
  onWeeklyRemarksChange,
  onSave,
  onSubmit,
}: WeeklyReportContainerProps) {
  return (
    <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
      <WeeklySummary
        value={weeklyRemarks}
        error={weeklyRemarksError}
        isDisabled={isSubmitted}
        onChange={onWeeklyRemarksChange}
      />
      
      {/* PCサイズでも表示する送信ボタン */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <ActionButton
          buttonType="save"
          icon={<SaveIcon />}
          onClick={onSave}
          disabled={loading || isSubmitted}
        >
          下書き保存
        </ActionButton>
        <ActionButton
          buttonType="submit"
          icon={<SendIcon />}
          onClick={onSubmit}
          disabled={loading || isSubmitted}
        >
          提出する
        </ActionButton>
      </Box>
    </Paper>
  );
} 