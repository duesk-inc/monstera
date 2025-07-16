import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
} from '@mui/material';
import type { Breakpoint } from '@mui/material/styles';
import ActionButton from './ActionButton';

export interface SimpleDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel: () => void;
  loading?: boolean;
  maxWidth?: Breakpoint | false;
  showCancel?: boolean;
}

const SimpleDialog: React.FC<SimpleDialogProps> = ({
  open,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'キャンセル',
  onConfirm,
  onCancel,
  loading = false,
  maxWidth = 'xs',
  showCancel = false,
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onCancel();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth={maxWidth}
      PaperProps={{
        sx: {
          borderRadius: 1,
          minWidth: 280,
          maxWidth: 360,
        },
      }}
    >
      {title && (
        <DialogTitle sx={{ px: 3, py: 2.5, pb: 1 }}>
          <Typography
            variant="h6"
            component="h2"
            sx={{
              fontSize: '1.125rem',
              fontWeight: 500,
              lineHeight: 1.4,
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
        </DialogTitle>
      )}
      
      <DialogContent sx={{ px: 3, py: title ? 0 : 2.5, pb: 2 }}>
        <DialogContentText
          sx={{
            color: 'text.primary',
            lineHeight: 1.5,
            fontSize: '0.875rem',
            margin: 0,
          }}
        >
          {message}
        </DialogContentText>
      </DialogContent>
      
      <DialogActions
        sx={{
          px: 3,
          py: 2.5,
          gap: 1.5,
          justifyContent: showCancel ? 'flex-end' : 'center',
        }}
      >
        {showCancel && (
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
        )}
        <ActionButton
          buttonType="primary"
          onClick={handleConfirm}
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

export default SimpleDialog; 