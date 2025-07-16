import React from 'react';
import {
  Paper,
} from '@mui/material';

import { DailyRecord } from '@/types/weeklyReport';
import { CommonAccordion } from '@/components/common/CommonAccordion';
import { DailyRecordHeader } from './DailyRecordHeader';
import { DailyRecordContent } from './DailyRecordContent';

interface DailyRecordAccordionProps {
  date: Date;
  dayOfWeek: string;
  isWeekend: boolean;
  record: DailyRecord;
  recordIndex: number;
  isExpanded: boolean;
  isSubmitted: boolean;
  onToggleExpand: () => void;
  onHolidayWorkToggle: () => void;
  onClientWorkToggle: (checked: boolean) => void;
  onTimeChange: (field: 'startTime' | 'endTime', time: Date | null) => void;
  onClientTimeChange: (field: 'clientStartTime' | 'clientEndTime', time: Date | null) => void;
  onBreakTimeChange: (value: string) => void;
  onClientBreakTimeChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
}

/**
 * 日別記録アコーディオンコンポーネント
 * 改修: CommonAccordionを使用した統一実装
 * 分離されたコンポーネントを統合して表示
 */
const DailyRecordAccordion: React.FC<DailyRecordAccordionProps> = ({
  date,
  dayOfWeek,
  isWeekend,
  record,
  recordIndex,
  isExpanded,
  isSubmitted,
  onToggleExpand,
  onHolidayWorkToggle,
  onClientWorkToggle,
  onTimeChange,
  onClientTimeChange,
  onBreakTimeChange,
  onClientBreakTimeChange,
  onRemarksChange
}) => {
  return (
    <Paper 
      sx={{ 
        p: 3, 
        borderRadius: 2, 
        boxShadow: 2,
        bgcolor: isWeekend ? (record.isHolidayWork ? 'white' : '#e8e8e8') : 'white',
        border: isWeekend && !record.isHolidayWork ? '1px solid #ddd' : 'none',
      }}
    >
      <CommonAccordion
        title=""  // カスタムヘッダーを使用するため空文字
        customHeader={
          <DailyRecordHeader
            date={date}
            dayOfWeek={dayOfWeek}
            isWeekend={isWeekend}
            record={record}
            recordIndex={recordIndex}
            isExpanded={isExpanded}
            isSubmitted={isSubmitted}
            onToggleExpand={onToggleExpand}
          />
        }
        variant="custom"
        expanded={isExpanded}
        onToggle={onToggleExpand}
        disabled={isSubmitted}
        sx={{
          border: 'none',
          boxShadow: 'none',
          bgcolor: 'transparent',
          borderRadius: 0,
          m: 0,
          '& .MuiCard-root': {
            boxShadow: 'none',
            bgcolor: 'transparent',
          },
          '& .MuiCardContent-root': {
            p: 0,
            '&:last-child': {
              pb: 0
            }
          }
        }}
        headerSx={{
          p: 0,
          mb: isExpanded ? 2 : 0
        }}
        contentSx={{
          pt: 2
        }}
        data-testid={`daily-record-accordion-${recordIndex}`}
      >
        <DailyRecordContent
          isWeekend={isWeekend}
          record={record}
          isSubmitted={isSubmitted}
          onHolidayWorkToggle={onHolidayWorkToggle}
          onClientWorkToggle={onClientWorkToggle}
          onTimeChange={onTimeChange}
          onClientTimeChange={onClientTimeChange}
          onBreakTimeChange={onBreakTimeChange}
          onClientBreakTimeChange={onClientBreakTimeChange}
          onRemarksChange={onRemarksChange}
        />
      </CommonAccordion>
    </Paper>
  );
};

export default DailyRecordAccordion; 