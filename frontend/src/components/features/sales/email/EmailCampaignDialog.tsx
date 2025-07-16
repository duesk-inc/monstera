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
  Chip,
  FormControlLabel,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Avatar
} from '@mui/material';
import {
  Close,
  Send,
  Delete,
  Preview,
  Email,
  Group,
  Schedule,
  Add,
  Remove
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useTheme } from '@mui/material/styles';

import { StatusChip } from '@/components/common';
import { CAMPAIGN_STATUS, CAMPAIGN_STATUS_COLORS } from '@/constants/sales';
import { SPACING } from '@/constants/dimensions';
import type { EmailCampaign, EmailTemplate, Proposal } from '@/types/sales';

interface EmailCampaignDialogProps {
  open: boolean;
  campaign?: EmailCampaign;
  isEdit?: boolean;
  templates?: EmailTemplate[];
  proposals?: Proposal[];
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
  onSend?: (id: string) => void;
  onPreview?: (campaign: any) => void;
  isLoading?: boolean;
}

/**
 * メール一斉送信キャンペーン作成・編集ダイアログ
 */
export const EmailCampaignDialog: React.FC<EmailCampaignDialogProps> = ({
  open,
  campaign,
  isEdit = false,
  templates = [],
  proposals = [],
  onClose,
  onSave,
  onDelete,
  onSend,
  onPreview,
  isLoading = false
}) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<any>({
    name: '',
    templateId: '',
    scheduledDate: null,
    recipientType: 'manual',
    selectedProposals: [],
    customRecipients: [],
    settings: {
      sendImmediately: false,
      trackOpens: true,
      trackClicks: true,
      autoFollowUp: false
    }
  });

  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '' });
  const [validationErrors, setValidationErrors] = useState<any>({});

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        templateId: campaign.templateId,
        scheduledDate: campaign.scheduledDate ? new Date(campaign.scheduledDate) : null,
        recipientType: campaign.recipientType || 'manual',
        selectedProposals: campaign.recipients?.filter(r => r.proposalId).map(r => r.proposalId) || [],
        customRecipients: campaign.recipients?.filter(r => !r.proposalId) || [],
        settings: campaign.settings || {
          sendImmediately: false,
          trackOpens: true,
          trackClicks: true,
          autoFollowUp: false
        }
      });

      if (campaign.recipients) {
        setSelectedProposalIds(campaign.recipients.filter(r => r.proposalId).map(r => r.proposalId!));
      }
    }
  }, [campaign]);

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

  const handleProposalSelect = (proposalId: string, checked: boolean) => {
    setSelectedProposalIds(prev => {
      if (checked) {
        return [...prev, proposalId];
      } else {
        return prev.filter(id => id !== proposalId);
      }
    });
  };

  const handleAddCustomRecipient = () => {
    if (!newRecipient.name.trim() || !newRecipient.email.trim()) {
      return;
    }

    setFormData((prev: any) => ({
      ...prev,
      customRecipients: [...prev.customRecipients, { ...newRecipient }]
    }));

    setNewRecipient({ name: '', email: '' });
  };

  const handleRemoveCustomRecipient = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      customRecipients: prev.customRecipients.filter((_: any, i: number) => i !== index)
    }));
  };

  const validateForm = () => {
    const errors: any = {};

    if (!formData.name.trim()) {
      errors.name = 'キャンペーン名は必須です';
    }

    if (!formData.templateId) {
      errors.templateId = 'テンプレートを選択してください';
    }

    if (!formData.settings.sendImmediately && !formData.scheduledDate) {
      errors.scheduledDate = '送信日時を設定してください';
    }

    const totalRecipients = selectedProposalIds.length + formData.customRecipients.length;
    if (totalRecipients === 0) {
      errors.recipients = '送信対象を選択してください';
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
      selectedProposals: selectedProposalIds,
      scheduledDate: formData.scheduledDate?.toISOString() || null
    };
    onSave(saveData);
  };

  const handleDelete = () => {
    if (campaign?.id && onDelete) {
      onDelete(campaign.id);
    }
  };

  const handleSend = () => {
    if (campaign?.id && onSend) {
      onSend(campaign.id);
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview({
        ...formData,
        selectedProposals: selectedProposalIds
      });
    }
  };

  const canEdit = !campaign || ['draft', 'scheduled'].includes(campaign.status);
  const canSend = campaign && ['draft', 'scheduled'].includes(campaign.status);
  const isCreate = !campaign;
  const title = isCreate ? 'メール一斉送信作成' : isEdit ? 'キャンペーン編集' : 'キャンペーン詳細';

  const selectedTemplate = templates.find(t => t.id === formData.templateId);
  const selectedProposals = proposals.filter(p => selectedProposalIds.includes(p.id));
  const totalRecipients = selectedProposalIds.length + formData.customRecipients.length;

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
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isCreate && (
              <Button
                variant="outlined"
                startIcon={<Preview />}
                onClick={handlePreview}
                disabled={isLoading}
              >
                プレビュー
              </Button>
            )}
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
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

          <Grid item xs={12} md={6}>
            <TextField
              label="キャンペーン名"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={!canEdit}
              fullWidth
              required
              error={!!validationErrors.name}
              helperText={validationErrors.name}
              placeholder="例: 2024年1月新規提案"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="メールテンプレート"
              select
              value={formData.templateId}
              onChange={(e) => handleInputChange('templateId', e.target.value)}
              disabled={!canEdit}
              fullWidth
              required
              error={!!validationErrors.templateId}
              helperText={validationErrors.templateId}
            >
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 送信設定 */}
          <Grid item xs={12}>
            <Divider sx={{ my: SPACING.md }} />
            <Typography variant="h6" gutterBottom>
              送信設定
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.sendImmediately || false}
                  onChange={(e) => handleInputChange('settings.sendImmediately', e.target.checked)}
                  disabled={!canEdit}
                />
              }
              label="即座に送信"
            />
          </Grid>

          {!formData.settings?.sendImmediately && (
            <Grid item xs={12} md={6}>
              <DateTimePicker
                label="送信予定日時"
                value={formData.scheduledDate}
                onChange={(date) => handleInputChange('scheduledDate', date)}
                disabled={!canEdit}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: !formData.settings?.sendImmediately,
                    error: !!validationErrors.scheduledDate,
                    helperText: validationErrors.scheduledDate
                  }
                }}
              />
            </Grid>
          )}

          {/* 送信対象 */}
          <Grid item xs={12}>
            <Divider sx={{ my: SPACING.md }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                送信対象 ({totalRecipients}件)
              </Typography>
              {validationErrors.recipients && (
                <Typography variant="caption" color="error">
                  {validationErrors.recipients}
                </Typography>
              )}
            </Box>
          </Grid>

          {/* 提案から選択 */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              提案から選択 ({selectedProposalIds.length}件)
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
              <List dense>
                {proposals.map((proposal) => (
                  <ListItem
                    key={proposal.id}
                    dense
                    button
                    onClick={() => handleProposalSelect(proposal.id, !selectedProposalIds.includes(proposal.id))}
                    disabled={!canEdit}
                  >
                    <Checkbox
                      checked={selectedProposalIds.includes(proposal.id)}
                      tabIndex={-1}
                      disableRipple
                      disabled={!canEdit}
                    />
                    <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}>
                      {proposal.engineerName.charAt(0)}
                    </Avatar>
                    <ListItemText
                      primary={`${proposal.engineerName} - ${proposal.clientName}`}
                      secondary={`${proposal.proposalAmount.toLocaleString()}円`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Grid>

          {/* カスタム受信者 */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              カスタム受信者 ({formData.customRecipients.length}件)
            </Typography>
            
            {canEdit && (
              <Box sx={{ mb: 2, p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                <Grid container spacing={1} alignItems="flex-end">
                  <Grid item xs={5}>
                    <TextField
                      label="名前"
                      size="small"
                      value={newRecipient.name}
                      onChange={(e) => setNewRecipient(prev => ({ ...prev, name: e.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      label="メールアドレス"
                      size="small"
                      type="email"
                      value={newRecipient.email}
                      onChange={(e) => setNewRecipient(prev => ({ ...prev, email: e.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <IconButton
                      onClick={handleAddCustomRecipient}
                      disabled={!newRecipient.name.trim() || !newRecipient.email.trim()}
                    >
                      <Add />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            )}

            <Box sx={{ maxHeight: 200, overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
              <List dense>
                {formData.customRecipients.map((recipient: any, index: number) => (
                  <ListItem key={index} dense>
                    <ListItemText
                      primary={recipient.name}
                      secondary={recipient.email}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    {canEdit && (
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleRemoveCustomRecipient(index)}
                        >
                          <Remove />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>
          </Grid>

          {/* 詳細設定 */}
          <Grid item xs={12}>
            <Divider sx={{ my: SPACING.md }} />
            <Typography variant="h6" gutterBottom>
              詳細設定
            </Typography>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.trackOpens || false}
                  onChange={(e) => handleInputChange('settings.trackOpens', e.target.checked)}
                  disabled={!canEdit}
                />
              }
              label="開封追跡"
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.trackClicks || false}
                  onChange={(e) => handleInputChange('settings.trackClicks', e.target.checked)}
                  disabled={!canEdit}
                />
              }
              label="クリック追跡"
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.autoFollowUp || false}
                  onChange={(e) => handleInputChange('settings.autoFollowUp', e.target.checked)}
                  disabled={!canEdit}
                />
              }
              label="自動フォローアップ"
            />
          </Grid>

          {/* テンプレートプレビュー */}
          {selectedTemplate && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2" gutterBottom>
                  <strong>選択中のテンプレート:</strong> {selectedTemplate.name}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>件名:</strong> {selectedTemplate.subject}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line', maxHeight: 100, overflow: 'auto' }}>
                  {selectedTemplate.body.substring(0, 200)}
                  {selectedTemplate.body.length > 200 ? '...' : ''}
                </Typography>
              </Alert>
            </Grid>
          )}

          {/* ステータス表示 */}
          {campaign && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">ステータス:</Typography>
                <StatusChip
                  status={campaign.status}
                  statusLabels={CAMPAIGN_STATUS}
                  statusColors={CAMPAIGN_STATUS_COLORS}
                  size="small"
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          キャンセル
        </Button>
        
        {campaign && canEdit && onDelete && (
          <Button
            onClick={handleDelete}
            color="error"
            startIcon={<Delete />}
          >
            削除
          </Button>
        )}
        
        {campaign && canSend && onSend && (
          <Button
            onClick={handleSend}
            color="primary"
            startIcon={<Send />}
            disabled={isLoading}
          >
            送信開始
          </Button>
        )}
        
        {canEdit && (
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isLoading}
            startIcon={<Email />}
          >
            {isCreate ? '作成' : '更新'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};