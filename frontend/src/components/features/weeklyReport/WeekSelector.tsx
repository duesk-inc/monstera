import React from 'react';
import { format } from 'date-fns';
import { Box } from '@mui/material';
import { CalendarToday as CalendarIcon, ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import ActionButton from '@/components/common/ActionButton';
import { FormSelect, type SelectOption } from '@/components/common';
import { useForm } from 'react-hook-form';

interface WeekSelectorProps {
  currentStartDate: Date;
  currentEndDate: Date;
  availableWeeks: { startDate: Date; endDate: Date }[];
  onWeekSelect: (startDate: string, endDate: string) => void;
  onSelectPreviousWeek: () => void;
  onSelectCurrentWeek: () => void;
  onSelectNextWeek: () => void;
  disabled?: boolean;
}

/**
 * 週報の週選択コンポーネント
 */
const WeekSelector: React.FC<WeekSelectorProps> = ({
  currentStartDate,
  currentEndDate,
  availableWeeks,
  onWeekSelect,
  onSelectPreviousWeek,
  onSelectCurrentWeek,
  onSelectNextWeek,
  disabled = false
}) => {
  // React Hook Form の設定
  const { control } = useForm({
    defaultValues: {
      selectedWeek: `${format(currentStartDate, 'yyyy-MM-dd')}|${format(currentEndDate, 'yyyy-MM-dd')}`
    }
  });

  // 週のオプションを生成
  const weekOptions: SelectOption[] = availableWeeks.map((week) => ({
    value: `${format(week.startDate, 'yyyy-MM-dd')}|${format(week.endDate, 'yyyy-MM-dd')}`,
    label: `${format(week.startDate, 'yyyy年MM月dd日')} 〜 ${format(week.endDate, 'yyyy年MM月dd日')}`
  }));

  // 週選択変更ハンドラー
  const handleWeekSelectChange = (value: string) => {
    const [startStr, endStr] = value.split('|');
    if (startStr && endStr) {
      onWeekSelect(startStr, endStr);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* 週選択 */}
      <Box sx={{ width: { xs: 'auto', sm: 340 }, flex: { xs: 1, sm: 'none' } }}>
        <FormSelect
          name="selectedWeek"
          control={control}
          label=""
          options={weekOptions}
          size="small"
          disabled={disabled}
          selectProps={{
            displayEmpty: true,
            renderValue: () => `${format(currentStartDate, 'yyyy年MM月dd日')} 〜 ${format(currentEndDate, 'yyyy年MM月dd日')}`,
            sx: { borderRadius: 2, height: 36 },
            onChange: (event) => handleWeekSelectChange(event.target.value as string)
          }}
        />
      </Box>
      
      {/* 週移動ボタングループ */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* 前週ボタン */}
        <ActionButton
          buttonType="default"
          onClick={onSelectPreviousWeek}
          sx={{ 
            borderRadius: 2, 
            height: 36, 
            minWidth: { xs: 'auto', sm: 40 },
            px: { xs: 1, sm: 2 }
          }}
          disabled={disabled}
        >
          <ArrowBackIcon fontSize="small" />
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.5 }}>前週</Box>
        </ActionButton>
        
        {/* 今週ボタン */}
        <ActionButton
          buttonType="submit"
          onClick={onSelectCurrentWeek}
          sx={{ 
            borderRadius: 2, 
            height: 36, 
            whiteSpace: 'nowrap',
            px: { xs: 1, sm: 2 }
          }}
          disabled={disabled}
        >
          <CalendarIcon fontSize="small" sx={{ mr: { xs: 0, sm: 0.5 } }} />
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>今週</Box>
        </ActionButton>
        
        {/* 次週ボタン */}
        <ActionButton
          buttonType="default"
          onClick={onSelectNextWeek}
          sx={{ 
            borderRadius: 2, 
            height: 36, 
            minWidth: { xs: 'auto', sm: 40 },
            px: { xs: 1, sm: 2 }
          }}
          disabled={disabled}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, mr: 0.5 }}>次週</Box>
          <ArrowForwardIcon fontSize="small" />
        </ActionButton>
      </Box>
    </Box>
  );
};

export default WeekSelector; 