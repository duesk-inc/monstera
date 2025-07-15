import React from 'react';
import {
  SentimentVeryDissatisfied as VeryDissatisfiedIcon,
  SentimentDissatisfied as DissatisfiedIcon,
  SentimentNeutral as NeutralIcon,
  SentimentSatisfied as SatisfiedIcon,
  SentimentVerySatisfied as VerySatisfiedIcon,
} from '@mui/icons-material';
import { WEEKLY_REPORT_MOOD, WEEKLY_REPORT_MOOD_LABEL, WeeklyReportMoodType } from '@/constants/weeklyMood';

export const moodOptions: {
  value: WeeklyReportMoodType;
  label: string;
  icon: React.ReactElement;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  { value: WEEKLY_REPORT_MOOD.TERRIBLE, label: WEEKLY_REPORT_MOOD_LABEL[WEEKLY_REPORT_MOOD.TERRIBLE], icon: React.createElement(VeryDissatisfiedIcon), color: '#f44336', bgColor: '#ffebee', borderColor: '#ef9a9a' },
  { value: WEEKLY_REPORT_MOOD.BAD, label: WEEKLY_REPORT_MOOD_LABEL[WEEKLY_REPORT_MOOD.BAD], icon: React.createElement(DissatisfiedIcon), color: '#ff9800', bgColor: '#fff3e0', borderColor: '#ffcc80' },
  { value: WEEKLY_REPORT_MOOD.NEUTRAL, label: WEEKLY_REPORT_MOOD_LABEL[WEEKLY_REPORT_MOOD.NEUTRAL], icon: React.createElement(NeutralIcon), color: '#ffb74d', bgColor: '#fff8e1', borderColor: '#ffe082' },
  { value: WEEKLY_REPORT_MOOD.GOOD, label: WEEKLY_REPORT_MOOD_LABEL[WEEKLY_REPORT_MOOD.GOOD], icon: React.createElement(SatisfiedIcon), color: '#8bc34a', bgColor: '#f1f8e9', borderColor: '#c5e1a5' },
  { value: WEEKLY_REPORT_MOOD.EXCELLENT, label: WEEKLY_REPORT_MOOD_LABEL[WEEKLY_REPORT_MOOD.EXCELLENT], icon: React.createElement(VerySatisfiedIcon), color: '#4caf50', bgColor: '#e8f5e9', borderColor: '#a5d6a7' },
]; 