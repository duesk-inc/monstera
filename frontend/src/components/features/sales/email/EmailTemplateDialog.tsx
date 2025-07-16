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
  Divider
} from '@mui/material';
import {
  Close,
  Save,
  Delete,
  Preview,
  Send,
  Code,
  Subject,
  Email
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

import { SPACING } from '@/constants/dimensions';
import { EMAIL_TEMPLATE_TYPE, EMAIL_TEMPLATE_VARIABLES } from '@/constants/sales';
import type { EmailTemplate, EmailTemplateType } from '@/types/sales';

interface EmailTemplateDialogProps {
  open: boolean;
  template?: EmailTemplate;
  isEdit?: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
  onPreview?: (template: any) => void;
  isLoading?: boolean;
}

/**
 * メールテンプレート編集ダイアログ
 */
export const EmailTemplateDialog: React.FC<EmailTemplateDialogProps> = ({
  open,
  template,
  isEdit = false,
  onClose,
  onSave,
  onDelete,
  onPreview,
  isLoading = false
}) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<any>({
    name: '',
    type: 'proposal_notification',
    subject: '',
    body: '',
    variables: [],
    isActive: true,
    isDefault: false
  });

  const [validationErrors, setValidationErrors] = useState<any>({});
  const [showVariables, setShowVariables] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        type: template.type,
        subject: template.subject,
        body: template.body,
        variables: template.variables || [],
        isActive: template.isActive !== false,
        isDefault: template.isDefault || false
      });
    }
  }, [template]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));

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

    if (!formData.name.trim()) {
      errors.name = 'テンプレート名は必須です';
    }

    if (!formData.subject.trim()) {
      errors.subject = '件名は必須です';
    }

    if (!formData.body.trim()) {
      errors.body = '本文は必須です';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    onSave(formData);
  };

  const handleDelete = () => {
    if (template?.id && onDelete) {
      onDelete(template.id);
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(formData);
    }
  };

  const insertVariable = (variable: string) => {
    const textArea = document.getElementById('template-body') as HTMLTextAreaElement;
    if (textArea) {
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;
      const currentBody = formData.body;
      const newBody = currentBody.substring(0, start) + `{{${variable}}}` + currentBody.substring(end);
      
      handleInputChange('body', newBody);
      
      // カーソル位置を調整
      setTimeout(() => {
        textArea.focus();
        textArea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  const isCreate = !template;
  const title = isCreate ? 'メールテンプレート作成' : isEdit ? 'メールテンプレート編集' : 'メールテンプレート詳細';

  const templateTypeOptions = Object.entries(EMAIL_TEMPLATE_TYPE).map(([value, label]) => ({
    value,
    label
  }));

  const availableVariables = EMAIL_TEMPLATE_VARIABLES[formData.type] || [];

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
              label="テンプレート名"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              fullWidth
              required
              error={!!validationErrors.name}
              helperText={validationErrors.name}
              placeholder="例: 提案書送付メール"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="テンプレートタイプ"
              select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as EmailTemplateType)}
              fullWidth
              required
            >
              {templateTypeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                />
              }
              label="有効"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                />
              }
              label="デフォルトテンプレート"
            />
          </Grid>

          {/* 件名 */}
          <Grid item xs={12}>
            <TextField
              label="件名"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              fullWidth
              required
              error={!!validationErrors.subject}
              helperText={validationErrors.subject}
              InputProps={{
                startAdornment: <Subject sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              placeholder="例: 【{{clientName}}】エンジニア提案のご案内"
            />
          </Grid>

          {/* 本文 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body1" component="label" htmlFor="template-body">
                本文 *
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Code />}
                onClick={() => setShowVariables(!showVariables)}
              >
                変数一覧
              </Button>
            </Box>
            
            <TextField
              id="template-body"
              multiline
              rows={12}
              value={formData.body}
              onChange={(e) => handleInputChange('body', e.target.value)}
              fullWidth
              required
              error={!!validationErrors.body}
              helperText={validationErrors.body}
              placeholder="メール本文を入力してください。変数は {{変数名}} の形式で使用できます。"
            />
          </Grid>

          {/* 変数一覧 */}
          {showVariables && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: SPACING.md }}>
                <Typography variant="body2" gutterBottom>
                  利用可能な変数一覧（クリックで本文に挿入）
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {availableVariables.map((variable) => (
                    <Chip
                      key={variable}
                      label={`{{${variable}}}`}
                      size="small"
                      clickable
                      onClick={() => insertVariable(variable)}
                      sx={{
                        '&:hover': {
                          backgroundColor: theme.palette.primary.light + '40'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Alert>
            </Grid>
          )}

          {/* テンプレート例 */}
          {isCreate && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2" gutterBottom>
                  <strong>テンプレート例:</strong>
                </Typography>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-line', fontSize: '0.875rem' }}>
{`{{clientName}} 様

いつもお世話になっております。
{{senderName}}です。

{{engineerName}}の件でご連絡いたします。

詳細については添付の資料をご確認ください。

ご不明な点がございましたら、お気軽にお声がけください。

よろしくお願いいたします。`}
                </Typography>
              </Alert>
            </Grid>
          )}

          {/* プレビュー警告 */}
          {formData.body.includes('{{') && (
            <Grid item xs={12}>
              <Alert severity="warning">
                <Typography variant="body2">
                  変数が含まれています。実際の送信時は変数が適切な値に置換されます。
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
        
        {template && onDelete && (
          <Button
            onClick={handleDelete}
            color="error"
            startIcon={<Delete />}
          >
            削除
          </Button>
        )}
        
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isLoading}
          startIcon={<Save />}
        >
          {isCreate ? '作成' : '更新'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};