import React from 'react';
import {
  FormControl,
  FormLabel,
  TextField,
} from '@mui/material';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { AttendanceFormData } from '@/hooks/leave/useLeave';

interface LeaveReasonFieldProps {
  isReasonRequired: boolean;
  register: UseFormRegister<AttendanceFormData>;
  errors: FieldErrors<AttendanceFormData>;
}

export default function LeaveReasonField({
  isReasonRequired,
  register,
  errors,
}: LeaveReasonFieldProps) {
  if (!isReasonRequired) {
    return null;
  }

  return (
    <FormControl fullWidth>
      <FormLabel required>理由</FormLabel>
      <TextField
        {...register('reason', { 
          required: isReasonRequired ? '理由を入力してください' : false 
        })}
        multiline
        rows={3}
        placeholder="理由を入力してください"
        error={!!errors.reason}
        helperText={errors.reason?.message || '休暇申請の理由を具体的に入力してください'}
        required
      />
    </FormControl>
  );
} 