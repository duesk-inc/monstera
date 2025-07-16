'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  useTheme
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Add,
  VideoCall,
  LocationOn,
  Group,
  AccessTime
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';

import { StatusChip } from '@/components/common';
import { INTERVIEW_STATUS, INTERVIEW_STATUS_COLORS, MEETING_TYPE } from '@/constants/sales';
import { SPACING } from '@/constants/dimensions';
import type { InterviewSchedule, CalendarEvent } from '@/types/sales';

interface InterviewCalendarProps {
  interviews: InterviewSchedule[];
  isLoading?: boolean;
  onDateClick?: (date: Date) => void;
  onInterviewClick?: (interview: InterviewSchedule) => void;
  onCreateInterview?: (date: Date) => void;
}

/**
 * 面談スケジュールカレンダーコンポーネント
 */
export const InterviewCalendar: React.FC<InterviewCalendarProps> = ({
  interviews,
  isLoading = false,
  onDateClick,
  onInterviewClick,
  onCreateInterview
}) => {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayDetail, setShowDayDetail] = useState(false);

  // カレンダーに表示する日付の配列を生成
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // 月曜始まり
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // 指定日の面談を取得
  const getInterviewsForDate = (date: Date) => {
    return interviews.filter(interview => 
      isSameDay(new Date(interview.scheduledDate), date)
    );
  };

  // 面談の表示用イベントに変換
  const getCalendarEvents = (date: Date): CalendarEvent[] => {
    const dayInterviews = getInterviewsForDate(date);
    return dayInterviews.map(interview => ({
      id: interview.id,
      title: `${interview.engineerName} - ${interview.clientName}`,
      start: interview.scheduledDate,
      end: interview.scheduledDate,
      type: 'interview',
      status: interview.status,
      attendees: [...interview.clientAttendees, ...interview.engineerAttendees],
      location: interview.location,
      meetingUrl: interview.meetingUrl
    }));
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowDayDetail(true);
    onDateClick?.(date);
  };

  const handleCreateInterview = (date: Date) => {
    onCreateInterview?.(date);
    setShowDayDetail(false);
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: ja });
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <VideoCall fontSize="small" />;
      case 'onsite':
        return <LocationOn fontSize="small" />;
      default:
        return <Group fontSize="small" />;
    }
  };

  const selectedDateInterviews = selectedDate ? getInterviewsForDate(selectedDate) : [];

  return (
    <Box>
      {/* カレンダーヘッダー */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: SPACING.md 
        }}
      >
        <Typography variant="h5" component="h2">
          {format(currentDate, 'yyyy年M月', { locale: ja })}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Today />}
            onClick={handleToday}
            size="small"
          >
            今日
          </Button>
          
          <IconButton onClick={handlePrevMonth}>
            <ChevronLeft />
          </IconButton>
          
          <IconButton onClick={handleNextMonth}>
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>

      {/* カレンダーグリッド */}
      <Paper sx={{ p: SPACING.md }}>
        {/* 曜日ヘッダー */}
        <Grid container sx={{ mb: 1 }}>
          {['月', '火', '水', '木', '金', '土', '日'].map((day) => (
            <Grid item xs key={day}>
              <Typography 
                variant="body2" 
                align="center" 
                sx={{ 
                  py: 1, 
                  fontWeight: 600,
                  color: theme.palette.text.secondary
                }}
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* カレンダー日付 */}
        <Grid container>
          {calendarDays.map((date, index) => {
            const dayInterviews = getInterviewsForDate(date);
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            return (
              <Grid item xs key={index}>
                <Card
                  sx={{
                    minHeight: 120,
                    m: 0.5,
                    cursor: 'pointer',
                    backgroundColor: isSelected 
                      ? theme.palette.primary.light + '20'
                      : isCurrentMonth 
                      ? 'background.paper' 
                      : theme.palette.action.hover,
                    border: isToday(date) 
                      ? `2px solid ${theme.palette.primary.main}` 
                      : '1px solid',
                    borderColor: isToday(date) 
                      ? theme.palette.primary.main 
                      : theme.palette.divider,
                    '&:hover': {
                      boxShadow: theme.shadows[2]
                    }
                  }}
                  onClick={() => handleDateClick(date)}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    {/* 日付 */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isToday(date) ? 700 : 400,
                        color: isCurrentMonth 
                          ? theme.palette.text.primary 
                          : theme.palette.text.disabled,
                        mb: 0.5
                      }}
                    >
                      {format(date, 'd')}
                    </Typography>

                    {/* 面談一覧 */}
                    <Box sx={{ minHeight: 60 }}>
                      {dayInterviews.slice(0, 3).map((interview) => (
                        <Tooltip
                          key={interview.id}
                          title={`${formatTime(interview.scheduledDate)} - ${interview.engineerName}`}
                        >
                          <Chip
                            label={interview.engineerName}
                            size="small"
                            sx={{
                              fontSize: '0.625rem',
                              height: 20,
                              mb: 0.25,
                              display: 'block',
                              '& .MuiChip-label': {
                                px: 0.5,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              },
                              backgroundColor: INTERVIEW_STATUS_COLORS[interview.status] + '40',
                              color: INTERVIEW_STATUS_COLORS[interview.status],
                              border: `1px solid ${INTERVIEW_STATUS_COLORS[interview.status]}`
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onInterviewClick?.(interview);
                            }}
                          />
                        </Tooltip>
                      ))}
                      
                      {dayInterviews.length > 3 && (
                        <Typography variant="caption" color="textSecondary">
                          +{dayInterviews.length - 3}件
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* 日付詳細ダイアログ */}
      <Dialog
        open={showDayDetail}
        onClose={() => setShowDayDetail(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedDate && format(selectedDate, 'M月d日(E)', { locale: ja })}の面談
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => selectedDate && handleCreateInterview(selectedDate)}
            >
              面談追加
            </Button>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedDateInterviews.length > 0 ? (
            <Box sx={{ mt: 1 }}>
              {selectedDateInterviews.map((interview) => (
                <Card 
                  key={interview.id} 
                  sx={{ 
                    mb: 2, 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: theme.shadows[2] }
                  }}
                  onClick={() => onInterviewClick?.(interview)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {interview.engineerName} - {interview.clientName}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <AccessTime fontSize="small" />
                          <Typography variant="body2">
                            {formatTime(interview.scheduledDate)} ({interview.durationMinutes}分)
                          </Typography>
                        </Box>
                      </Box>
                      
                      <StatusChip
                        status={interview.status}
                        statusLabels={INTERVIEW_STATUS}
                        statusColors={INTERVIEW_STATUS_COLORS}
                        size="small"
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {getMeetingTypeIcon(interview.meetingType)}
                      <Typography variant="body2">
                        {MEETING_TYPE[interview.meetingType]}
                        {interview.location && ` - ${interview.location}`}
                      </Typography>
                    </Box>

                    {interview.clientAttendees.length > 0 && (
                      <Typography variant="body2" color="textSecondary">
                        参加者: {interview.clientAttendees.map(a => a.name).join(', ')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="textSecondary">
                この日の面談はありません
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                sx={{ mt: 2 }}
                onClick={() => selectedDate && handleCreateInterview(selectedDate)}
              >
                面談を追加
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};