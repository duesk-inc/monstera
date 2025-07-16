import React from 'react';
import {
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Switch,
  Typography,
  Stack,
  Box,
  FormHelperText,
  SelectChangeEvent,
} from '@mui/material';
import { InfoAlert } from '@/components/common';

interface LeaveTypeSelectorProps {
  selectedLeaveType: string;
  isHourlyBased: boolean;
  leaveTypes: Array<{ value: string; label: string }>;
  remainingLeaves: Record<string, { remaining: number }>;
  isSubmitting: boolean;
  errors: {
    leaveTypeId?: { message?: string };
  };
  onLeaveTypeChange: (event: SelectChangeEvent<string>) => void;
  onHourlyToggle: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function LeaveTypeSelector({
  selectedLeaveType,
  isHourlyBased,
  leaveTypes,
  remainingLeaves,
  isSubmitting,
  errors,
  onLeaveTypeChange,
  onHourlyToggle,
}: LeaveTypeSelectorProps) {
  return (
    <>
      {/* 休暇種別選択 */}
      <FormControl fullWidth>
        <FormLabel>休暇種別</FormLabel>
        <Select
          value={selectedLeaveType}
          onChange={onLeaveTypeChange}
          error={!!errors.leaveTypeId}
          disabled={isSubmitting}
        >
          {leaveTypes.map(type => (
            <MenuItem 
              key={type.value} 
              value={type.value}
              disabled={remainingLeaves[type.value]?.remaining <= 0}
            >
              {type.label} （残 {remainingLeaves[type.value]?.remaining?.toFixed(1) || 0} 日）
            </MenuItem>
          ))}
        </Select>
        {errors.leaveTypeId && (
          <FormHelperText error>
            休暇種別を選択してください
          </FormHelperText>
        )}
      </FormControl>
      
      {/* 時間単位/日単位切り替え */}
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Switch
            checked={isHourlyBased}
            onChange={onHourlyToggle}
            color="primary"
          />
          <Typography 
            component="span" 
            variant="body1" 
            sx={{ ml: 1 }}
          >
            時間単位
          </Typography>
        </Box>
        
        {/* 時間単位がONの場合のみアラート表示 */}
        {isHourlyBased && (
          <InfoAlert message="8時間で1日換算になります。昼休憩（12:00-13:00）は自動的に除外されます。" />
        )}
      </Stack>
    </>
  );
} 