import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

interface BulkActionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  selectedCount: number;
  selectedItems?: {
    primary: string;
    secondary?: string;
  }[];
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'warning';
  loading?: boolean;
  showWarning?: boolean;
  warningMessage?: string;
}

export const BulkActionDialog: React.FC<BulkActionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  selectedCount,
  selectedItems = [],
  confirmText = '実行',
  cancelText = 'キャンセル',
  confirmColor = 'primary',
  loading = false,
  showWarning = false,
  warningMessage,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      data-testid="bulk-reminder-dialog"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {message}
        </DialogContentText>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            選択されたアイテム（{selectedCount}件）
          </Typography>
        </Box>

        {selectedItems.length > 0 && (
          <>
            <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 1 }}>
              {selectedItems.map((item, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={item.primary}
                    secondary={item.secondary}
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {showWarning && warningMessage && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 2,
              bgcolor: 'warning.light',
              borderRadius: 1,
              mt: 2,
            }}
          >
            <WarningIcon color="warning" />
            <Typography variant="body2" color="warning.dark">
              {warningMessage}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          color={confirmColor}
          variant="contained"
          disabled={loading || selectedCount === 0}
          data-testid="confirm-bulk-send-button"
        >
          {confirmText}（{selectedCount}件）
        </Button>
      </DialogActions>
    </Dialog>
  );
};