import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Typography,
  InputAdornment,
  Divider,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { object, string, number, boolean } from 'yup';
import {
  CreateAlertSettingsRequest,
  UpdateAlertSettingsRequest,
  AlertSettings,
} from '@/types/admin/alert';
import { usePermission, Permission } from '@/hooks/common/usePermission';

// バリデーションスキーマ
const alertSettingsSchema = object({
  name: string()
    .required('設定名は必須です')
    .min(1, '設定名は1文字以上入力してください')
    .max(100, '設定名は100文字以内で入力してください'),
  weeklyHoursLimit: number()
    .required('週間時間上限は必須です')
    .min(1, '週間時間上限は1時間以上で設定してください')
    .max(168, '週間時間上限は168時間以内で設定してください'),
  weeklyHoursChangeLimit: number()
    .required('週間変動率上限は必須です')
    .min(1, '週間変動率上限は1%以上で設定してください')
    .max(100, '週間変動率上限は100%以内で設定してください'),
  consecutiveHolidayWorkLimit: number()
    .required('連続休日出勤上限は必須です')
    .min(0, '連続休日出勤上限は0日以上で設定してください')
    .max(30, '連続休日出勤上限は30日以内で設定してください'),
  monthlyOvertimeLimit: number()
    .required('月間残業時間上限は必須です')
    .min(0, '月間残業時間上限は0時間以上で設定してください')
    .max(300, '月間残業時間上限は300時間以内で設定してください'),
  isActive: boolean().required(),
});

type FormData = CreateAlertSettingsRequest;

interface AlertSettingsFormProps {
  initialData?: AlertSettings;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export const AlertSettingsForm: React.FC<AlertSettingsFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
}) => {
  const { hasPermission } = usePermission();
  
  // 権限チェック - アラート設定管理権限がない場合
  if (!hasPermission(Permission.ALERT_SETTINGS_MANAGE)) {
    return (
      <Card>
        <CardContent>
          <Typography color="error" align="center">
            アラート設定を管理する権限がありません
          </Typography>
        </CardContent>
      </Card>
    );
  }
  
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<FormData>({
    resolver: yupResolver(alertSettingsSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          weeklyHoursLimit: initialData.weeklyHoursLimit,
          weeklyHoursChangeLimit: initialData.weeklyHoursChangeLimit,
          consecutiveHolidayWorkLimit: initialData.consecutiveHolidayWorkLimit,
          monthlyOvertimeLimit: initialData.monthlyOvertimeLimit,
          isActive: initialData.isActive,
        }
      : {
          name: '',
          weeklyHoursLimit: 60,
          weeklyHoursChangeLimit: 20,
          consecutiveHolidayWorkLimit: 3,
          monthlyOvertimeLimit: 80,
          isActive: true,
        },
    mode: 'onChange',
  });

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit(data);
      if (mode === 'create') {
        reset();
      }
    } catch (error) {
      // エラーハンドリングは上位コンポーネントで処理
    }
  };

  const handleReset = () => {
    reset();
  };

  return (
    <Card>
      <CardHeader
        title={mode === 'create' ? 'アラート設定新規作成' : 'アラート設定編集'}
        subheader={
          mode === 'create'
            ? '新しいアラート設定を作成します'
            : 'アラート設定を編集します'
        }
      />
      <CardContent>
        <Box component="form" onSubmit={handleSubmit(handleFormSubmit)}>
          <Grid container spacing={3}>
            {/* 基本設定 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                基本設定
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="設定名"
                    required
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    placeholder="例: 基本アラート設定"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="この設定を有効化する"
                  />
                )}
              />
            </Grid>

            {/* 時間管理設定 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                時間管理設定
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="weeklyHoursLimit"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="週間労働時間上限"
                    type="number"
                    required
                    fullWidth
                    error={!!errors.weeklyHoursLimit}
                    helperText={
                      errors.weeklyHoursLimit?.message ||
                      '週間労働時間がこの値を超えるとアラートが発生します'
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">時間</InputAdornment>,
                    }}
                    inputProps={{ min: 1, max: 168 }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="weeklyHoursChangeLimit"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="週間労働時間変動率上限"
                    type="number"
                    required
                    fullWidth
                    error={!!errors.weeklyHoursChangeLimit}
                    helperText={
                      errors.weeklyHoursChangeLimit?.message ||
                      '前週比でこの値を超える変動があるとアラートが発生します'
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    inputProps={{ min: 1, max: 100 }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="consecutiveHolidayWorkLimit"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="連続休日出勤上限"
                    type="number"
                    required
                    fullWidth
                    error={!!errors.consecutiveHolidayWorkLimit}
                    helperText={
                      errors.consecutiveHolidayWorkLimit?.message ||
                      'この日数を超える連続休日出勤でアラートが発生します'
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">日</InputAdornment>,
                    }}
                    inputProps={{ min: 0, max: 30 }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="monthlyOvertimeLimit"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="月間残業時間上限"
                    type="number"
                    required
                    fullWidth
                    error={!!errors.monthlyOvertimeLimit}
                    helperText={
                      errors.monthlyOvertimeLimit?.message ||
                      '月間残業時間がこの値を超えるとアラートが発生します'
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">時間</InputAdornment>,
                    }}
                    inputProps={{ min: 0, max: 300 }}
                  />
                )}
              />
            </Grid>

            {/* ボタン */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                {mode === 'create' && (
                  <Button
                    variant="outlined"
                    onClick={handleReset}
                    disabled={isLoading}
                  >
                    リセット
                  </Button>
                )}
                {onCancel && (
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={isLoading}
                  >
                    キャンセル
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!isValid || isLoading}
                >
                  {isLoading
                    ? mode === 'create'
                      ? '作成中...'
                      : '更新中...'
                    : mode === 'create'
                    ? '作成'
                    : '更新'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};