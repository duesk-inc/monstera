import React from 'react';
import { Box, Typography, FormControl, TextField, FormHelperText } from '@mui/material';

interface WeeklySummaryProps {
  value: string;
  error?: string;
  isDisabled?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
}

export default function WeeklySummary({
  value,
  error,
  isDisabled = false,
  maxLength = 1000,
  onChange,
}: WeeklySummaryProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        週総括（任意）
      </Typography>
      <FormControl fullWidth error={!!error}>
        <TextField
          name="weeklyRemarks"
          multiline
          rows={4}
          value={value}
          onChange={handleChange}
          placeholder="週全体の振り返りや感想を記入してください。"
          error={!!error}
          inputProps={{ maxLength }}
          disabled={isDisabled}
        />
        <FormHelperText>
          {error || `${value.length}/${maxLength}文字`}
        </FormHelperText>
      </FormControl>
    </Box>
  );
} 