import React from 'react';
import { Box, Typography } from '@mui/material';
import { SentimentSatisfied } from '@mui/icons-material';
import { WeeklyReportMood } from '@/constants/weeklyMood';
import { moodOptions } from '@/constants/moodOptions';

interface MoodSelectorProps {
  selectedMood: WeeklyReportMood | null;
  isDisabled?: boolean;
  onMoodChange: (mood: WeeklyReportMood) => void;
}

export default function MoodSelector({
  selectedMood,
  isDisabled = false,
  onMoodChange,
}: MoodSelectorProps) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
        <SentimentSatisfied sx={{ mr: 1, color: 'primary.main' }} />
        今週の気分は？
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'space-between' }}>
        {moodOptions.map((option) => (
          <Box
            key={option.value}
            onClick={() => !isDisabled && onMoodChange(option.value as WeeklyReportMood)}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
              borderRadius: 3,
              cursor: isDisabled ? 'default' : 'pointer',
              bgcolor: selectedMood === option.value ? option.bgColor : 'white',
              border: '2px solid',
              borderColor: selectedMood === option.value ? option.borderColor : '#e0e0e0',
              boxShadow: selectedMood === option.value ? `0 4px 12px rgba(0, 0, 0, 0.1)` : 'none',
              transition: 'all 0.2s ease',
              opacity: isDisabled && selectedMood !== option.value ? 0.5 : 1,
              '&:hover': {
                bgcolor: !isDisabled ? (selectedMood === option.value ? option.bgColor : '#f5f5f5') : undefined,
                transform: !isDisabled ? 'translateY(-2px)' : undefined,
                boxShadow: !isDisabled ? '0 6px 16px rgba(0, 0, 0, 0.1)' : undefined,
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: selectedMood === option.value ? option.color : '#f5f5f5',
                color: selectedMood === option.value ? 'white' : 'text.secondary',
                fontSize: 32,
                mb: 1.5,
              }}
            >
              {option.emoji}
            </Box>
            <Typography
              variant="body1"
              fontWeight={selectedMood === option.value ? 'bold' : 'medium'}
              color={selectedMood === option.value ? option.color : 'text.primary'}
            >
              {option.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
} 