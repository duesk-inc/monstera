import React from 'react';
import {
  Box,
} from '@mui/material';
import { DailyRecord } from '@/types/weeklyReport';
import { HolidayWorkControls } from './HolidayWorkControls';
import { CompanyTimeInput } from './CompanyTimeInput';
import { ClientTimeInput } from './ClientTimeInput';
import { RemarksInput } from './RemarksInput';

interface DailyRecordContentProps {
  isWeekend: boolean;
  record: DailyRecord;
  isSubmitted: boolean;
  onHolidayWorkToggle: () => void;
  onClientWorkToggle: (checked: boolean) => void;
  onTimeChange: (field: 'startTime' | 'endTime', time: Date | null) => void;
  onClientTimeChange: (field: 'clientStartTime' | 'clientEndTime', time: Date | null) => void;
  onBreakTimeChange: (value: string) => void;
  onClientBreakTimeChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
}

/**
 * 日別記録コンテンツコンポーネント
 * 各種入力コンポーネントを統合して表示
 */
export const DailyRecordContent: React.FC<DailyRecordContentProps> = ({
  isWeekend,
  record,
  isSubmitted,
  onHolidayWorkToggle,
  onClientWorkToggle,
  onTimeChange,
  onClientTimeChange,
  onBreakTimeChange,
  onClientBreakTimeChange,
  onRemarksChange,
}) => {
  return (
    <>
      <HolidayWorkControls
        isWeekend={isWeekend}
        record={record}
        isSubmitted={isSubmitted}
        onHolidayWorkToggle={onHolidayWorkToggle}
        onClientWorkToggle={onClientWorkToggle}
      />
      
      <Box>
        <CompanyTimeInput
          record={record}
          isWeekend={isWeekend}
          isSubmitted={isSubmitted}
          onTimeChange={onTimeChange}
          onBreakTimeChange={onBreakTimeChange}
        />
        
        <ClientTimeInput
          record={record}
          isWeekend={isWeekend}
          isSubmitted={isSubmitted}
          onClientTimeChange={onClientTimeChange}
          onClientBreakTimeChange={onClientBreakTimeChange}
        />
        
        <RemarksInput
          record={record}
          isWeekend={isWeekend}
          isSubmitted={isSubmitted}
          onRemarksChange={onRemarksChange}
        />
      </Box>
    </>
  );
}; 