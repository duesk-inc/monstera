import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  Divider,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  School as SchoolIcon,
  CalendarMonth as CalendarIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { CreateEngineerInput, UpdateEngineerInput, EngineerDetail } from '@/types/engineer';

interface EngineerFormProps {
  mode: 'create' | 'edit';
  initialData?: EngineerDetail;
  onSubmit: (data: CreateEngineerInput | UpdateEngineerInput) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  submitButtonIcon?: React.ReactNode;
}

export const EngineerForm: React.FC<EngineerFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = '保存',
  submitButtonIcon,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
  } = useForm<CreateEngineerInput | UpdateEngineerInput>({
    defaultValues: mode === 'edit' && initialData ? {
      email: initialData.user.email,
      firstName: initialData.user.firstName,
      lastName: initialData.user.lastName,
      firstNameKana: initialData.user.firstNameKana || '',
      lastNameKana: initialData.user.lastNameKana || '',
      sei: initialData.user.sei,
      mei: initialData.user.mei,
      phoneNumber: initialData.user.phoneNumber || '',
      hireDate: initialData.user.hireDate || '',
      education: initialData.user.education || '',
    } : {
      email: '',
      password: '', // 新規登録時のみ
      firstName: '',
      lastName: '',
      firstNameKana: '',
      lastNameKana: '',
      sei: '',
      mei: '',
      phoneNumber: '',
      hireDate: '',
      education: '',
    },
  });

  const email = watch('email');

  const onSubmitForm = async (data: CreateEngineerInput | UpdateEngineerInput) => {
    // 新規登録時、パスワードが未入力の場合はメールアドレスを設定
    if (mode === 'create' && !('password' in data && data.password)) {
      (data as CreateEngineerInput).password = email;
    }
    
    // 新規登録時の固定値を設定
    if (mode === 'create') {
      data.engineerStatus = 'standby'; // 待機中
      data.department = 'システムソリューション事業部';
      data.position = 'メンバー';
    }
    
    await onSubmit(data);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmitForm)} noValidate>
      <Grid container spacing={3}>
        {/* アカウント情報 */}
        <Grid size={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            アカウント情報
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="email"
            control={control}
            rules={{
              required: 'メールアドレスは必須です',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: '有効なメールアドレスを入力してください',
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="メールアドレス"
                fullWidth
                required
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={mode === 'edit'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        </Grid>

        {mode === 'create' && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="パスワード"
                  type="password"
                  fullWidth
                  helperText="未入力の場合、メールアドレスが初期パスワードになります"
                />
              )}
            />
          </Grid>
        )}

        {/* 名前（英語） */}
        <Grid size={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            名前（英語）
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Controller
            name="firstName"
            control={control}
            rules={{ required: '名（英語）は必須です' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="名（英語）"
                fullWidth
                required
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
                placeholder="Taro"
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Controller
            name="lastName"
            control={control}
            rules={{ required: '姓（英語）は必須です' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="姓（英語）"
                fullWidth
                required
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
                placeholder="Yamada"
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Controller
            name="firstNameKana"
            control={control}
            rules={{ required: '名（カナ）は必須です' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="名（カナ）"
                fullWidth
                required
                error={!!errors.firstNameKana}
                helperText={errors.firstNameKana?.message}
                placeholder="タロウ"
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Controller
            name="lastNameKana"
            control={control}
            rules={{ required: '姓（カナ）は必須です' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="姓（カナ）"
                fullWidth
                required
                error={!!errors.lastNameKana}
                helperText={errors.lastNameKana?.message}
                placeholder="ヤマダ"
              />
            )}
          />
        </Grid>


        {/* 名前（日本語） */}
        <Grid size={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            名前（日本語）
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="sei"
            control={control}
            rules={{ required: '姓は必須です' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="姓"
                fullWidth
                required
                error={!!errors.sei}
                helperText={errors.sei?.message}
                placeholder="山田"
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="mei"
            control={control}
            rules={{ required: '名は必須です' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="名"
                fullWidth
                required
                error={!!errors.mei}
                helperText={errors.mei?.message}
                placeholder="太郎"
              />
            )}
          />
        </Grid>


        {/* 連絡先情報 */}
        <Grid size={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
            <PhoneIcon />
            連絡先情報
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="電話番号"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="090-1234-5678"
              />
            )}
          />
        </Grid>


        {/* その他情報 */}
        <Grid size={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
            <SchoolIcon />
            その他情報
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <Controller
              name="hireDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="入社日"
                  value={field.value ? new Date(field.value) : null}
                  onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      InputProps: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarIcon />
                          </InputAdornment>
                        ),
                      },
                    },
                  }}
                />
              )}
            />
          </LocalizationProvider>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="education"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="学歴"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SchoolIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="〇〇大学 情報工学科"
              />
            )}
          />
        </Grid>
      </Grid>

      {/* アクションボタン */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={isSubmitting}
          startIcon={<CancelIcon />}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || (mode === 'edit' && !isDirty)}
          startIcon={submitButtonIcon}
        >
          {isSubmitting ? '処理中...' : submitButtonText}
        </Button>
      </Box>
    </Box>
  );
};