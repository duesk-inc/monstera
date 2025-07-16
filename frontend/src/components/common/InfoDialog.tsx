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
import {
  Close as CloseIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

export interface InfoDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: Breakpoint | false;
  actions?: React.ReactNode;
  showCloseButton?: boolean;
  fullScreen?: boolean;
}

const InfoDialog: React.FC<InfoDialogProps> = ({
  open,
  title,
  subtitle,
  icon,
  children,
  onClose,
  maxWidth = 'sm',
  actions,
  showCloseButton = true,
  fullScreen = false,
}) => {
  const displayIcon = icon || <InfoIcon sx={{ fontSize: 20, color: 'primary.main' }} />;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={!fullScreen}
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 1,
          maxHeight: fullScreen ? '100vh' : '90vh',
          minWidth: fullScreen ? 'auto' : 480,
        },
      }}
    >
      <DialogTitle sx={{ p: 3, pb: subtitle ? 2 : 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {subtitle && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {displayIcon}
                </Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {subtitle}
                </Typography>
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
                ml: subtitle ? 5.5 : 0, // アイコン分のオフセット
              }}
            >
              {title}
            </Typography>
          </Box>
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ 
                mt: -0.5, 
                mr: -1,
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

      <DialogContent 
        sx={{ 
          px: 3, 
          py: 0,
          '&.MuiDialogContent-dividers': {
            borderTop: 'none',
            borderBottom: 'none',
          },
        }}
      >
        <Box sx={{ pb: 2 }}>
          {children}
        </Box>
      </DialogContent>

      {actions && (
        <DialogActions 
          sx={{ 
            px: 3, 
            py: 3,
            gap: 1.5,
            justifyContent: 'flex-end',
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default InfoDialog; 