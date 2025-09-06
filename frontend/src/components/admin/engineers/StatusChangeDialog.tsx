import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  SwapHoriz as StatusChangeIcon,
  Warning as WarningIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { EngineerStatus } from '@/types/engineer';
import { 
  ENGINEER_STATUS,
  ENGINEER_STATUS_LABELS,
  ENGINEER_STATUS_COLORS
} from '@/constants/engineer';
import FormSelect from '@/components/common/forms/FormSelect';

interface StatusChangeFormData {
  newStatus: EngineerStatus;
  reason: string;
}

interface StatusChangeDialogProps {
  open: boolean;
  currentStatus: EngineerStatus;
  engineerName: string;
  onClose: () => void;
  onConfirm: (newStatus: EngineerStatus, reason: string) => void | Promise<void>;
  isSubmitting?: boolean;
}

export const StatusChangeDialog: React.FC<StatusChangeDialogProps> = ({
  open,
  currentStatus,
  engineerName,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<StatusChangeFormData>({
    defaultValues: {
      newStatus: currentStatus,
      reason: '',
    },
  });

  const newStatus = watch('newStatus');

  // 旧Enum(EngineerStatus) -> 新定数系のキーへマッピング
  const mapStatusToConstKey = (status: EngineerStatus) => {
    switch (status) {
      case EngineerStatus.ACTIVE:
        return ENGINEER_STATUS.ASSIGNED;
      case EngineerStatus.STANDBY:
        return ENGINEER_STATUS.AVAILABLE;
      case EngineerStatus.LONG_LEAVE:
        return ENGINEER_STATUS.ON_LEAVE;
      case EngineerStatus.RESIGNED:
      default:
        return ENGINEER_STATUS.INACTIVE;
    }
  };

  const STATUS_LABEL_BY_ENUM: Record<EngineerStatus, string> = {
    [EngineerStatus.STANDBY]: ENGINEER_STATUS_LABELS[ENGINEER_STATUS.AVAILABLE],
    [EngineerStatus.ACTIVE]: ENGINEER_STATUS_LABELS[ENGINEER_STATUS.ASSIGNED],
    [EngineerStatus.LONG_LEAVE]: ENGINEER_STATUS_LABELS[ENGINEER_STATUS.ON_LEAVE],
    [EngineerStatus.RESIGNED]: ENGINEER_STATUS_LABELS[ENGINEER_STATUS.INACTIVE],
  };

  const STATUS_COLOR_BY_ENUM: Record<EngineerStatus, string> = {
    [EngineerStatus.STANDBY]: ENGINEER_STATUS_COLORS[ENGINEER_STATUS.AVAILABLE],
    [EngineerStatus.ACTIVE]: ENGINEER_STATUS_COLORS[ENGINEER_STATUS.ASSIGNED],
    [EngineerStatus.LONG_LEAVE]: ENGINEER_STATUS_COLORS[ENGINEER_STATUS.ON_LEAVE],
    [EngineerStatus.RESIGNED]: ENGINEER_STATUS_COLORS[ENGINEER_STATUS.INACTIVE],
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: StatusChangeFormData) => {
    await onConfirm(data.newStatus, data.reason);
    handleClose();
  };

  // 現在のステータスを除外したオプションを作成
  const statusOptions = Object.entries(STATUS_LABEL_BY_ENUM)
    .filter(([value]) => value !== currentStatus)
    .map(([value, label]) => ({ value, label }));

  const getStatusColor = (status: EngineerStatus): string => {
    return STATUS_COLOR_BY_ENUM[status] || 'default';
  };

  // ステータス変更時の注意事項
  const getStatusChangeWarning = (from: EngineerStatus, to: EngineerStatus): string | null => {
    if (to === EngineerStatus.RESIGNED) {
      return '退職ステータスに変更すると、このエンジニアはシステムにログインできなくなります。';
    }
    if (to === EngineerStatus.LONG_LEAVE) {
      return '長期休暇ステータスに変更すると、プロジェクトへのアサインができなくなります。';
    }
    if (from === EngineerStatus.RESIGNED && to === EngineerStatus.ACTIVE) {
      return '退職済みのエンジニアを稼働中に戻す場合は、アカウントの再有効化が必要です。';
    }
    return null;
  };

  const warning = getStatusChangeWarning(currentStatus, newStatus);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StatusChangeIcon />
        ステータス変更
      </DialogTitle>
      
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              エンジニア: <strong>{engineerName}</strong>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                現在のステータス:
              </Typography>
              <Chip
                label={STATUS_LABEL_BY_ENUM[currentStatus]}
                color={getStatusColor(currentStatus) as any}
                size="small"
              />
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <FormSelect
            name="newStatus"
            control={control}
            label="新しいステータス"
            options={statusOptions}
            required
            rules={{ 
              required: '新しいステータスを選択してください',
              validate: (value) => value !== currentStatus || '現在と同じステータスは選択できません'
            }}
            error={errors.newStatus}
            fullWidth
          />

          <Controller
            name="reason"
            control={control}
            rules={{
              required: '変更理由を入力してください',
              minLength: {
                value: 10,
                message: '変更理由は10文字以上で入力してください',
              },
              maxLength: {
                value: 500,
                message: '変更理由は500文字以内で入力してください',
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="変更理由"
                multiline
                rows={4}
                fullWidth
                required
                error={!!errors.reason}
                helperText={errors.reason?.message || `${field.value.length}/500文字`}
                sx={{ mt: 3 }}
                placeholder="ステータスを変更する理由を詳しく記載してください"
              />
            )}
          />

          {warning && (
            <Alert 
              severity="warning" 
              icon={<WarningIcon />}
              sx={{ mt: 3 }}
            >
              {warning}
            </Alert>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ステータス変更は履歴に記録され、後から確認できます。
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            startIcon={<CancelIcon />}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || newStatus === currentStatus}
            startIcon={<SaveIcon />}
          >
            {isSubmitting ? '処理中...' : '変更を保存'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
// @ts-nocheck
