'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  MenuItem,
  IconButton,
  Alert,
  Divider,
  FormControlLabel,
  Switch,
  InputAdornment
} from '@mui/material';
import {
  Close,
  Save,
  Delete,
  Euro,
  Schedule,
  Person,
  Business
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTheme } from '@mui/material/styles';

import { StatusChip } from '@/components/common';
import { EXTENSION_STATUS, EXTENSION_STATUS_COLORS, EXTENSION_TYPE } from '@/constants/sales';
import { SPACING } from '@/constants/dimensions';
import type { ContractExtension, ExtensionType } from '@/types/sales';

interface ExtensionDialogProps {
  open: boolean;
  extension?: ContractExtension;
  isEdit?: boolean;
  engineerId?: string;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

/**
 * 契約延長詳細・編集ダイアログ
 */
export const ExtensionDialog: React.FC<ExtensionDialogProps> = ({
  open,
  extension,
  isEdit = false,
  engineerId,
  onClose,
  onSave,
  onDelete,
  isLoading = false
}) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<any>({
    engineerId: engineerId || '',
    engineerName: '',
    currentClientName: '',
    currentRate: 0,
    currentRateType: 'monthly',
    extensionStartDate: new Date(),
    extensionEndDate: new Date(),
    extensionType: 'renewal',
    proposedRate: 0,
    proposedRateType: 'monthly',
    deadlineDate: null,
    assignedTo: '',
    notes: '',
    settings: {
      autoReminder: true,
      reminderDays: [7, 3, 1],
      requireApproval: true,
      notifySlack: true
    }
  });

  const [validationErrors, setValidationErrors] = useState<any>({});

  useEffect(() => {
    if (extension) {
      setFormData({
        engineerId: extension.engineerId,
        engineerName: extension.engineerName,
        currentClientName: extension.currentClientName,
        currentRate: extension.currentRate,
        currentRateType: extension.currentRateType,
        extensionStartDate: new Date(extension.extensionStartDate),
        extensionEndDate: new Date(extension.extensionEndDate),
        extensionType: extension.extensionType,
        proposedRate: extension.proposedRate || extension.currentRate,
        proposedRateType: extension.proposedRateType || extension.currentRateType,
        deadlineDate: extension.deadlineDate ? new Date(extension.deadlineDate) : null,
        assignedTo: extension.assignedTo || '',
        notes: extension.notes || '',
        settings: extension.settings || {
          autoReminder: true,
          reminderDays: [7, 3, 1],
          requireApproval: true,
          notifySlack: true
        }
      });
    }
  }, [extension]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });

    // バリデーションエラーをクリア
    if (validationErrors[field]) {
      setValidationErrors((prev: any) => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const errors: any = {};

    if (!formData.engineerName.trim()) {
      errors.engineerName = 'エンジニア名は必須です';
    }

    if (!formData.currentClientName.trim()) {
      errors.currentClientName = 'クライアント名は必須です';
    }

    if (formData.currentRate <= 0) {
      errors.currentRate = '現在単価は0より大きい値を入力してください';
    }

    if (formData.proposedRate <= 0) {
      errors.proposedRate = '延長単価は0より大きい値を入力してください';
    }

    if (formData.extensionEndDate <= formData.extensionStartDate) {
      errors.extensionEndDate = '延長終了日は開始日より後の日付を選択してください';
    }

    if (formData.deadlineDate && formData.deadlineDate < new Date()) {
      errors.deadlineDate = '期限日は今日以降の日付を選択してください';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const saveData = {
      ...formData,
      extensionStartDate: formData.extensionStartDate.toISOString(),
      extensionEndDate: formData.extensionEndDate.toISOString(),
      deadlineDate: formData.deadlineDate?.toISOString() || null
    };
    onSave(saveData);
  };

  const handleDelete = () => {
    if (extension?.id && onDelete) {
      onDelete(extension.id);
    }
  };

  const canEdit = !extension || ['pending', 'in_progress'].includes(extension.status);
  const isCreate = !extension;
  const title = isCreate ? '契約延長作成' : isEdit ? '契約延長編集' : '契約延長詳細';

  const rateTypeOptions = [
    { value: 'monthly', label: '月額' },
    { value: 'daily', label: '日額' },
    { value: 'hourly', label: '時給' }
  ];

  const extensionTypeOptions = Object.entries(EXTENSION_TYPE).map(([value, label]) => ({
    value,
    label
  }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={SPACING.md}>
          {/* 基本情報 */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              基本情報
            </Typography>
          </Grid>

          {/* エンジニア情報 */}
          <Grid item xs={12} md={6}>
            <TextField
              label="エンジニア名"
              value={formData.engineerName}
              onChange={(e) => handleInputChange('engineerName', e.target.value)}
              disabled={!canEdit}
              fullWidth
              required
              error={!!validationErrors.engineerName}
              helperText={validationErrors.engineerName}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="現在のクライアント"
              value={formData.currentClientName}
              onChange={(e) => handleInputChange('currentClientName', e.target.value)}
              disabled={!canEdit}
              fullWidth
              required
              error={!!validationErrors.currentClientName}
              helperText={validationErrors.currentClientName}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Business />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* 現在の契約情報 */}
          <Grid item xs={12}>
            <Divider sx={{ my: SPACING.md }} />
            <Typography variant="h6" gutterBottom>
              現在の契約情報
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="現在単価"
              type="number"
              value={formData.currentRate}
              onChange={(e) => handleInputChange('currentRate', parseFloat(e.target.value) || 0)}
              disabled={!canEdit}
              fullWidth
              required
              error={!!validationErrors.currentRate}
              helperText={validationErrors.currentRate}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Euro />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="現在単価種別"
              select
              value={formData.currentRateType}
              onChange={(e) => handleInputChange('currentRateType', e.target.value)}
              disabled={!canEdit}
              fullWidth
              required
            >
              {rateTypeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 延長契約情報 */}
          <Grid item xs={12}>
            <Divider sx={{ my: SPACING.md }} />
            <Typography variant="h6" gutterBottom>
              延長契約情報
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <DatePicker
              label="延長開始日"
              value={formData.extensionStartDate}
              onChange={(date) => handleInputChange('extensionStartDate', date)}
              disabled={!canEdit}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  error: !!validationErrors.extensionStartDate,
                  helperText: validationErrors.extensionStartDate
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <DatePicker
              label="延長終了日"
              value={formData.extensionEndDate}
              onChange={(date) => handleInputChange('extensionEndDate', date)}
              disabled={!canEdit}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  error: !!validationErrors.extensionEndDate,
                  helperText: validationErrors.extensionEndDate
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="延長種別"
              select
              value={formData.extensionType}
              onChange={(e) => handleInputChange('extensionType', e.target.value as ExtensionType)}
              disabled={!canEdit}
              fullWidth
              required
            >
              {extensionTypeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="延長単価"
              type="number"
              value={formData.proposedRate}
              onChange={(e) => handleInputChange('proposedRate', parseFloat(e.target.value) || 0)}
              disabled={!canEdit}
              fullWidth
              required
              error={!!validationErrors.proposedRate}
              helperText={validationErrors.proposedRate}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Euro />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="延長単価種別"
              select
              value={formData.proposedRateType}
              onChange={(e) => handleInputChange('proposedRateType', e.target.value)}
              disabled={!canEdit}
              fullWidth
              required
            >
              {rateTypeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 管理情報 */}
          <Grid item xs={12}>
            <Divider sx={{ my: SPACING.md }} />
            <Typography variant="h6" gutterBottom>
              管理情報
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <DatePicker
              label="回答期限日"
              value={formData.deadlineDate}
              onChange={(date) => handleInputChange('deadlineDate', date)}
              disabled={!canEdit}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!validationErrors.deadlineDate,
                  helperText: validationErrors.deadlineDate,
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Schedule />
                      </InputAdornment>
                    ),
                  }
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="担当者"
              value={formData.assignedTo}
              onChange={(e) => handleInputChange('assignedTo', e.target.value)}
              disabled={!canEdit}
              fullWidth
            />
          </Grid>

          {/* 設定 */}
          <Grid item xs={12}>
            <Divider sx={{ my: SPACING.md }} />
            <Typography variant="h6" gutterBottom>
              通知設定
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.autoReminder || false}
                  onChange={(e) => handleInputChange('settings.autoReminder', e.target.checked)}
                  disabled={!canEdit}
                />
              }
              label="自動リマインダー"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.notifySlack || false}
                  onChange={(e) => handleInputChange('settings.notifySlack', e.target.checked)}
                  disabled={!canEdit}
                />
              }
              label="Slack通知"
            />
          </Grid>

          {/* メモ */}
          <Grid item xs={12}>
            <TextField
              label="メモ"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              disabled={!canEdit}
              fullWidth
            />
          </Grid>

          {/* ステータス表示 */}
          {extension && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">ステータス:</Typography>
                <StatusChip
                  status={extension.status}
                  statusLabels={EXTENSION_STATUS}
                  statusColors={EXTENSION_STATUS_COLORS}
                  size="small"
                />
              </Box>
            </Grid>
          )}

          {/* 単価変更の差額表示 */}
          {formData.proposedRate !== formData.currentRate && (
            <Grid item xs={12}>
              <Alert 
                severity={formData.proposedRate > formData.currentRate ? 'info' : 'warning'}
                sx={{ mt: SPACING.md }}
              >
                <Typography variant="body2">
                  単価変更: {formData.proposedRate > formData.currentRate ? '+' : ''}
                  {(formData.proposedRate - formData.currentRate).toLocaleString()}円
                  ({formData.proposedRate > formData.currentRate ? '増額' : '減額'})
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          キャンセル
        </Button>
        
        {extension && canEdit && onDelete && (
          <Button
            onClick={handleDelete}
            color="error"
            startIcon={<Delete />}
          >
            削除
          </Button>
        )}
        
        {canEdit && (
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isLoading}
            startIcon={<Save />}
          >
            {isCreate ? '作成' : '更新'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};