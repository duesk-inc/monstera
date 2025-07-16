import React from 'react';
import {
  Stack,
  FormControl,
  FormLabel,
  TextField,
} from '@mui/material';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { AttendanceFormData } from '@/hooks/leave/useLeave';
import { DEFAULT_WORK_TIME } from '@/constants/defaultWorkTime';
import { TIME_PICKER } from '@/constants/ui';

interface LeaveTimeSelectorProps {
  isHourlyBased: boolean;
  register: UseFormRegister<AttendanceFormData>;
  errors: FieldErrors<AttendanceFormData>;
}

const styles = {
  timePickerContainer: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
  },
};

export default function LeaveTimeSelector({
  isHourlyBased,
  register,
  errors,
}: LeaveTimeSelectorProps) {
  if (!isHourlyBased) {
    return null;
  }

  return (
    <Stack spacing={2} sx={styles.timePickerContainer}>
      <FormControl sx={{ flex: 1 }}>
        <FormLabel>開始時間</FormLabel>
        <TextField
          {...register('startTime')}
          type="time"
          defaultValue={DEFAULT_WORK_TIME.START_TIME}
          InputLabelProps={{
            shrink: true,
          }}
          inputProps={{
            step: TIME_PICKER.STEP_SECONDS,
          }}
          error={!!errors.startTime}
        />
      </FormControl>
      <FormControl sx={{ flex: 1 }}>
        <FormLabel>終了時間</FormLabel>
        <TextField
          {...register('endTime')}
          type="time"
          defaultValue={DEFAULT_WORK_TIME.END_TIME}
          InputLabelProps={{
            shrink: true,
          }}
          inputProps={{
            step: TIME_PICKER.STEP_SECONDS,
          }}
          error={!!errors.endTime}
        />
      </FormControl>
    </Stack>
  );
} 