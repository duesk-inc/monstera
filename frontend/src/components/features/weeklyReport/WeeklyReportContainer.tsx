import React from 'react';
import { Paper, Divider, Box } from '@mui/material';
import { Save as SaveIcon, Send as SendIcon } from '@mui/icons-material';
import ActionButton from '@/components/common/ActionButton';
import MoodSelector from './MoodSelector';
import WeeklySummary from './WeeklySummary';
import { WeeklyReportMoodType } from '@/constants/weeklyMood';

interface WeeklyReportContainerProps {
  mood: WeeklyReportMoodType | null;
  weeklyRemarks: string;
  weeklyRemarksError?: string;
  isSubmitted: boolean;
  loading: boolean;
  onMoodChange: (mood: WeeklyReportMoodType) => void;
  onWeeklyRemarksChange: (value: string) => void;
  onSave: () => void;
  onSubmit: () => void;
}

export default function WeeklyReportContainer({
  mood,
  weeklyRemarks,
  weeklyRemarksError,
  isSubmitted,
  loading,
  onMoodChange,
  onWeeklyRemarksChange,
  onSave,
  onSubmit,
}: WeeklyReportContainerProps) {
  return (
    <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
      <MoodSelector
        selectedMood={mood}
        isDisabled={isSubmitted}
        onMoodChange={onMoodChange}
      />
      
      <Divider sx={{ my: 3 }} />

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