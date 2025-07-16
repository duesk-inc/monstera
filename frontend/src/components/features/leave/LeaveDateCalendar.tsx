import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  FormLabel,
  Chip,
  FormHelperText,
  useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { DateCalendar } from '@mui/x-date-pickers';
import { useTheme } from '@mui/material/styles';
import { format, isBefore, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Controller, Control } from 'react-hook-form';
import ActionButton from '@/components/common/ActionButton';
import { CustomPickersDay, getConsistentDateKey } from '@/utils/calendarUtils';
import type { AttendanceFormData } from '@/hooks/leave/useLeave';

interface LeaveDateCalendarProps {
  control: Control<AttendanceFormData>;
  selectedDates: Date[];
  calendarMonths: Date[];
  takenLeaveDates: string[];
  today: Date;
  errors: {
    selectedDates?: { message?: string };
  };
  onDateSelect: (date: Date) => void;
  onClearAll: () => void;
  onUpdateCalendars: (action: 'prev' | 'next' | 'today') => void;
}

const styles = {
  clearButton: {
    py: 0.5,
    fontSize: '0.75rem',
    borderRadius: 1.5
  },
  calendar: {
    width: '100%',
    '.MuiPickersCalendarHeader-label': {
      textAlign: 'center',
      width: '100%',
      marginRight: '0',
      marginLeft: '0',
    },
    '.MuiPickersArrowSwitcher-root': {
      display: 'none',
    },
    // 表示月外の日付のクリックを無効化
    '.MuiPickersDay-root.MuiPickersDay-dayOutsideMonth': {
      pointerEvents: 'none',
      opacity: 0.5,
    },
  },
};

export default function LeaveDateCalendar({
  control,
  selectedDates,
  calendarMonths,
  takenLeaveDates,
  today,
  errors,
  onDateSelect,
  onClearAll,
  onUpdateCalendars,
}: LeaveDateCalendarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const shouldDisableDate = (date: Date, calendarIndex: number) => {
    // 表示月の条件
    const month = date.getMonth();
    const year = date.getFullYear();
    const isWrongMonth = !(month === calendarMonths[calendarIndex].getMonth() && 
      year === calendarMonths[calendarIndex].getFullYear());
    
    // 土日の条件
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // 取得済み休暇日の条件
    const dateStr = format(date, 'yyyy-MM-dd');
    const isAlreadyTaken = takenLeaveDates.includes(dateStr);
    
    // 過去日付の条件（当日を含む今日より前の日付）
    const isPastDate = isBefore(date, startOfDay(today));
    
    // いずれかの条件に該当する場合は選択不可
    return isWrongMonth || isWeekend || isAlreadyTaken || isPastDate;
  };

  return (
    <Box>
      <FormLabel>取得日</FormLabel>
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          選択可能な日付（クリックで選択/解除）
        </Typography>
        
        {/* カレンダーの切り替えボタン */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => onUpdateCalendars('prev')} color="primary">
            <PrevIcon />
          </IconButton>
          <Typography variant="h6">
            {format(calendarMonths[0], 'yyyy年M月')}
            {!isMobile && ` - ${format(calendarMonths[1], 'yyyy年M月')}`}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ActionButton
              buttonType="ghost"
              size="small"
              onClick={() => onUpdateCalendars('today')}
              startIcon={<TodayIcon />}
              sx={{ mr: 1 }}
            >
              今日
            </ActionButton>
            <IconButton onClick={() => onUpdateCalendars('next')} color="primary">
              <NextIcon />
            </IconButton>
          </Box>
        </Box>
        
        <Controller
          name="selectedDates"
          control={control}
          rules={{ required: '取得日を選択してください' }}
          render={() => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {/* 1つ目のカレンダー（常に表示） */}
              <Box sx={{ width: isMobile ? '100%' : 'calc(50% - 8px)' }}>
                <DateCalendar 
                  key={`cal-0-${calendarMonths[0].getTime()}-${selectedDates.length}`}
                  showDaysOutsideCurrentMonth
                  fixedWeekNumber={6}
                  displayWeekNumber={false}
                  views={['day']}
                  onChange={(date) => date && onDateSelect(date)}
                  defaultValue={null}
                  referenceDate={calendarMonths[0]}
                  onMonthChange={() => {
                    // カレンダーの自動月変更を防止するため、何もしない
                    return calendarMonths[0];
                  }}
                  shouldDisableDate={(date) => shouldDisableDate(date, 0)}
                  disableHighlightToday={false}
                  slots={{
                    day: (props) => (
                      <CustomPickersDay 
                        {...props} 
                        selectedDates={selectedDates}
                        takenLeaveDates={takenLeaveDates}
                        key={`day-${getConsistentDateKey(props.day)}`}
                      />
                    ),
                  }}
                  sx={styles.calendar}
                />
              </Box>
              
              {/* 2つ目のカレンダー（モバイル以外で表示） */}
              {!isMobile && (
                <Box sx={{ width: 'calc(50% - 8px)' }}>
                  <DateCalendar
                    key={`cal-1-${calendarMonths[1].getTime()}-${selectedDates.length}`}
                    showDaysOutsideCurrentMonth
                    fixedWeekNumber={6}
                    displayWeekNumber={false}
                    views={['day']}
                    onChange={(date) => date && onDateSelect(date)}
                    defaultValue={null}
                    referenceDate={calendarMonths[1]}
                    onMonthChange={() => {
                      // カレンダーの自動月変更を防止するため、何もしない
                      return calendarMonths[1];
                    }}
                    shouldDisableDate={(date) => shouldDisableDate(date, 1)}
                    disableHighlightToday={false}
                    slots={{
                      day: (props) => (
                        <CustomPickersDay 
                          {...props} 
                          selectedDates={selectedDates}
                          takenLeaveDates={takenLeaveDates}
                          key={`day-${getConsistentDateKey(props.day)}`}
                        />
                      ),
                    }}
                    sx={styles.calendar}
                  />
                </Box>
              )}
            </Box>
          )}
        />
        
        {/* 選択された日付の表示 */}
        <Box sx={{ mt: 2 }}>
          {selectedDates.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">
                選択された日付: {selectedDates.length}日
              </Typography>
              <ActionButton
                buttonType="secondary"
                size="small"
                onClick={onClearAll}
                startIcon={<CloseIcon fontSize="small" />}
                sx={styles.clearButton}
              >
                全てクリア
              </ActionButton>
            </Box>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedDates.length > 0 ? (
              selectedDates.map((date, index) => (
                <Chip
                  key={index}
                  label={format(typeof date === 'string' ? new Date(date) : date, 'yyyy/MM/dd (EEE)', { locale: ja })}
                  onDelete={() => {
                    // 日付削除は onDateSelect を通じて実行
                    onDateSelect(typeof date === 'string' ? new Date(date) : date);
                  }}
                  color="success"
                  variant="filled"
                  size="small"
                  sx={{
                    fontWeight: 'medium',
                    height: '28px',
                    '& .MuiChip-label': {
                      px: 1.5,
                      py: 0.5,
                    },
                    '& .MuiChip-deleteIcon': {
                      color: 'white',
                      '&:hover': {
                        color: 'rgba(255, 255, 255, 0.8)',
                      },
                    },
                  }}
                />
              ))
            ) : (
              <Typography color="text.secondary">選択された日付はありません</Typography>
            )}
          </Box>
          {errors.selectedDates && (
            <FormHelperText error>
              取得日を選択してください
            </FormHelperText>
          )}
        </Box>
      </Box>
    </Box>
  );
} 