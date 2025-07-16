'use client';

import React from 'react';
import {
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CalendarMonth as CalendarMonthIcon,
  CalendarViewWeek as CalendarViewWeekIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';

interface PeriodSelectorProps {
  selectedPeriod: 'week' | 'month' | 'quarter';
  onPeriodChange: (period: 'week' | 'month' | 'quarter') => void;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
  showLabel = true,
  size = 'medium',
}: PeriodSelectorProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newPeriod: 'week' | 'month' | 'quarter' | null,
  ) => {
    if (newPeriod !== null) {
      onPeriodChange(newPeriod);
    }
  };

  const getPeriodLabel = (period: 'week' | 'month' | 'quarter'): string => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);
    
    // 今週の開始日（月曜日）を計算
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    switch (period) {
      case 'week':
        const weekEnd = new Date(monday);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${monday.getMonth() + 1}/${monday.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
      case 'month':
        return `${currentYear}年${currentMonth}月`;
      case 'quarter':
        return `${currentYear}年Q${currentQuarter}`;
    }
  };

  const buttons = [
    {
      value: 'week' as const,
      label: isMobile ? '週' : '今週',
      icon: <CalendarViewWeekIcon />,
    },
    {
      value: 'month' as const,
      label: isMobile ? '月' : '今月',
      icon: <CalendarMonthIcon />,
    },
    {
      value: 'quarter' as const,
      label: isMobile ? '四半期' : '今四半期',
      icon: <TimelineIcon />,
    },
  ];

  return (
    <Box>
      {showLabel && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            集計期間
          </Typography>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'medium' }}>
            {getPeriodLabel(selectedPeriod)}
          </Typography>
        </Box>
      )}
      
      <ToggleButtonGroup
        value={selectedPeriod}
        exclusive
        onChange={handleChange}
        size={size}
        sx={{
          '& .MuiToggleButton-root': {
            border: '1px solid',
            borderColor: 'divider',
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            },
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          },
        }}
      >
        {buttons.map((button) => (
          <ToggleButton 
            key={button.value} 
            value={button.value}
            sx={{
              px: isMobile ? 1.5 : 2.5,
              py: 1,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              gap: isMobile ? 0.5 : 1,
              minWidth: isMobile ? 60 : 80,
            }}
          >
            {button.icon}
            <Typography 
              variant={isMobile ? 'caption' : 'body2'} 
              sx={{ 
                fontWeight: selectedPeriod === button.value ? 'bold' : 'normal',
                fontSize: isMobile ? '0.7rem' : undefined,
              }}
            >
              {button.label}
            </Typography>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}