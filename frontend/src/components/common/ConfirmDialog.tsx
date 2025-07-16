import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  Typography,
} from '@mui/material';
import type { Breakpoint } from '@mui/material/styles';
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import ActionButton from './ActionButton';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  severity?: 'info' | 'warning' | 'error';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  maxWidth?: Breakpoint | false;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  severity = 'info',
  onConfirm,
  onCancel,
  loading = false,
  maxWidth = 'xs',
}) => {
  // アイコンと色の設定
  const getIconAndColor = () => {
    switch (severity) {
      case 'warning':
        return {
          icon: <WarningIcon sx={{ fontSize: 20, color: 'warning.main' }} />,
          iconBgColor: 'warning.light',
        };
      case 'error':
        return {
          icon: <ErrorIcon sx={{ fontSize: 20, color: 'error.main' }} />,
          iconBgColor: 'error.light',
        };
      default:
        return {
          icon: <InfoIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          iconBgColor: 'primary.light',
        };
    }
  };

  const { icon, iconBgColor } = getIconAndColor();

  // ボタンタイプの決定
  const confirmButtonType = severity === 'error' ? 'danger' : 'primary';

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth={maxWidth}
      PaperProps={{
        sx: {
          borderRadius: 1,
          minWidth: 320,
          maxWidth: maxWidth === 'xs' ? 400 : undefined,
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 3,
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: iconBgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              mt: 0.25,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              component="h2"
              sx={{
                fontSize: '1.125rem',
                fontWeight: 500,
                lineHeight: 1.4,
                color: 'text.primary',
                mb: 0,
              }}
            >
              {title}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ px: 3, py: 0, pb: 2 }}>
        <DialogContentText
          sx={{
            color: 'text.secondary',
            lineHeight: 1.5,
            fontSize: '0.875rem',
            ml: 7, // アイコン分のオフセット
          }}
        >
          {message}
        </DialogContentText>
      </DialogContent>
      
      <DialogActions
        sx={{
          px: 3,
          py: 3,
          gap: 1.5,
          justifyContent: 'flex-end',
        }}
      >
        <ActionButton
          buttonType="cancel"
          onClick={onCancel}
          disabled={loading}
          sx={{ 
            minWidth: 80,
            height: 36,
            fontSize: '0.875rem',
          }}
        >
          {cancelText}
        </ActionButton>
        <ActionButton
          buttonType={confirmButtonType}
          onClick={onConfirm}
          loading={loading}
          sx={{ 
            minWidth: 80,
            height: 36,
            fontSize: '0.875rem',
            px: 2,
          }}
        >
          {confirmText}
        </ActionButton>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog; 