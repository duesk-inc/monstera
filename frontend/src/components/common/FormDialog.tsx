import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import type { Breakpoint } from '@mui/material/styles';
import { Close as CloseIcon } from '@mui/icons-material';
import ActionButton from './ActionButton';

export interface FormDialogProps {
  open: boolean;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  maxWidth?: Breakpoint | false;
  submitButtonType?: 'primary' | 'submit' | 'save';
  submitDisabled?: boolean;
  showCloseButton?: boolean;
}

const FormDialog: React.FC<FormDialogProps> = ({
  open,
  title,
  icon,
  children,
  onClose,
  onSubmit,
  submitText = '保存',
  cancelText = 'キャンセル',
  loading = false,
  maxWidth = 'sm',
  submitButtonType = 'submit',
  submitDisabled = false,
  showCloseButton = true,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      PaperProps={{
        sx: {
          borderRadius: 1,
          minWidth: maxWidth === 'xs' ? 320 : maxWidth === 'sm' ? 480 : 600,
          maxWidth: maxWidth === 'xs' ? 400 : undefined,
        },
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
            {icon && (
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  bgcolor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  '& svg': {
                    fontSize: 20,
                    color: 'primary.main',
                  },
                }}
              >
                {icon}
              </Box>
            )}
            <Typography
              variant="h6"
              component="h2"
              sx={{
                fontSize: '1.25rem',
                fontWeight: 500,
                lineHeight: 1.3,
                color: 'text.primary',
              }}
            >
              {title}
            </Typography>
          </Box>
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              size="small"
              disabled={loading}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 0 }}>
        <Box sx={{ pb: 2 }}>
          {children}
        </Box>
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
          onClick={onClose}
          disabled={loading}
          sx={{
            minWidth: 80,
            height: 36,
            fontSize: '0.875rem',
          }}
        >
          {cancelText}
        </ActionButton>
        {onSubmit && (
          <ActionButton
            buttonType={submitButtonType}
            onClick={onSubmit}
            loading={loading}
            disabled={submitDisabled}
            sx={{
              minWidth: 80,
              height: 36,
              fontSize: '0.875rem',
              px: 2,
            }}
          >
            {submitText}
          </ActionButton>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FormDialog; 