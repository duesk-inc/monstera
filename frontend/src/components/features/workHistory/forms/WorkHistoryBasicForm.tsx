import React from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  FormHelperText,
  Alert,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { PeriodInput } from '../PeriodInput';
import type { WorkHistoryFormData, IndustryMasterData } from '../../../../types/workHistory';
import type { ValidationError } from '../../../../hooks/workHistory/useWorkHistoryValidationEnhanced';

const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
}));

interface WorkHistoryBasicFormProps {
  formData: WorkHistoryFormData;
  errors: Record<string, ValidationError[]>;
  industries: IndustryMasterData[];
  onFieldChange: <K extends keyof WorkHistoryFormData>(field: K, value: WorkHistoryFormData[K]) => void;
  getFieldError: (field: string) => ValidationError[];
}

const ValidationDisplay: React.FC<{ 
  errors: ValidationError[];
  showInline?: boolean;
}> = ({ errors, showInline = false }) => {
  if (!errors || errors.length === 0) return null;

  const errorMessages = errors.filter(e => e.severity === 'error');
  const warningMessages = errors.filter(e => e.severity === 'warning');
  const infoMessages = errors.filter(e => e.severity === 'info');

  if (showInline) {
    // インラインエラー表示（フィールド直下）
    return (
      <Box>
        {errorMessages.map((error, index) => (
          <FormHelperText key={index} error>
            {error.message}
          </FormHelperText>
        ))}
        {warningMessages.map((warning, index) => (
          <FormHelperText key={index} sx={{ color: 'warning.main' }}>
            {warning.message}
          </FormHelperText>
        ))}
        {infoMessages.map((info, index) => (
          <FormHelperText key={index} sx={{ color: 'info.main' }}>
            {info.message}
          </FormHelperText>
        ))}
      </Box>
    );
  }

  // アラート形式の表示
  return (
    <Box sx={{ mt: 1 }}>
      {errorMessages.length > 0 && (
        <Alert severity="error" size="small" sx={{ mb: 0.5 }}>
          {errorMessages.map(error => error.message).join(', ')}
        </Alert>
      )}
      {warningMessages.length > 0 && (
        <Alert severity="warning" size="small" sx={{ mb: 0.5 }}>
          {warningMessages.map(warning => warning.message).join(', ')}
        </Alert>
      )}
      {infoMessages.length > 0 && (
        <Alert severity="info" size="small">
          {infoMessages.map(info => info.message).join(', ')}
        </Alert>
      )}
    </Box>
  );
};

export const WorkHistoryBasicForm: React.FC<WorkHistoryBasicFormProps> = ({
  formData,
  errors,
  industries,
  onFieldChange,
  getFieldError,
}) => {
  const hasErrors = (field: string) => {
    const fieldErrors = getFieldError(field);
    return fieldErrors.some(error => error.severity === 'error');
  };

  const hasWarnings = (field: string) => {
    const fieldErrors = getFieldError(field);
    return fieldErrors.some(error => error.severity === 'warning');
  };

  const getInlineErrorText = (field: string) => {
    const fieldErrors = getFieldError(field);
    const errorMessages = fieldErrors.filter(e => e.severity === 'error');
    return errorMessages.length > 0 ? errorMessages[0].message : null;
  };

  const getInlineWarningText = (field: string) => {
    const fieldErrors = getFieldError(field);
    const warningMessages = fieldErrors.filter(e => e.severity === 'warning');
    return warningMessages.length > 0 ? warningMessages[0].message : null;
  };
  return (
    <Box>
      <FormSection>
        <SectionTitle variant="h6">プロジェクト基本情報</SectionTitle>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box>
              <TextField
                label="プロジェクト名"
                value={formData.projectName}
                onChange={(e) => onFieldChange('projectName', e.target.value)}
                error={hasErrors('projectName')}
                helperText={getInlineErrorText('projectName') || getInlineWarningText('projectName')}
                fullWidth
                required
                placeholder="例: ECサイトリニューアルプロジェクト"
                FormHelperTextProps={{
                  sx: hasWarnings('projectName') && !hasErrors('projectName') ? { 
                    color: 'warning.main' 
                  } : undefined
                }}
              />
              <ValidationDisplay errors={getFieldError('projectName')} />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box>
              <PeriodInput
                startDate={formData.startDate}
                endDate={formData.endDate}
                onStartDateChange={(date) => onFieldChange('startDate', date)}
                onEndDateChange={(date) => onFieldChange('endDate', date)}
                label="プロジェクト期間"
                required
                error={hasErrors('startDate') || hasErrors('endDate')}
                helperText={getInlineErrorText('startDate') || getInlineErrorText('endDate')}
                allowCurrentProject
                showDuration
              />
              <ValidationDisplay errors={[...getFieldError('startDate'), ...getFieldError('endDate')]} />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box>
              <FormControl fullWidth required error={hasErrors('industry')}>
                <InputLabel>業種</InputLabel>
                <Select
                  value={formData.industry || ''}
                  onChange={(e) => onFieldChange('industry', e.target.value ? Number(e.target.value) : null)}
                  label="業種"
                >
                  <MenuItem value="">選択してください</MenuItem>
                  {industries.map((industry) => (
                    <MenuItem key={industry.id} value={industry.id}>
                      {industry.displayName}
                    </MenuItem>
                  ))}
                </Select>
                {(getInlineErrorText('industry') || getInlineWarningText('industry')) && (
                  <FormHelperText sx={{
                    color: hasErrors('industry') ? 'error.main' : 'warning.main'
                  }}>
                    {getInlineErrorText('industry') || getInlineWarningText('industry')}
                  </FormHelperText>
                )}
              </FormControl>
              <ValidationDisplay errors={getFieldError('industry')} />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box>
              <TextField
                label="会社名"
                value={formData.companyName || ''}
                onChange={(e) => onFieldChange('companyName', e.target.value)}
                error={hasErrors('companyName')}
                helperText={getInlineErrorText('companyName') || getInlineWarningText('companyName')}
                fullWidth
                placeholder="例: 株式会社〇〇"
                FormHelperTextProps={{
                  sx: hasWarnings('companyName') && !hasErrors('companyName') ? { 
                    color: 'warning.main' 
                  } : undefined
                }}
              />
              <ValidationDisplay errors={getFieldError('companyName')} />
            </Box>
          </Grid>
        </Grid>
      </FormSection>

      <FormSection>
        <SectionTitle variant="h6">チーム・役割情報</SectionTitle>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box>
              <TextField
                label="チーム規模"
                type="number"
                value={formData.teamSize || ''}
                onChange={(e) => onFieldChange('teamSize', e.target.value ? Number(e.target.value) : null)}
                error={hasErrors('teamSize')}
                helperText={getInlineErrorText('teamSize') || getInlineWarningText('teamSize')}
                fullWidth
                required
                placeholder="例: 10"
                inputProps={{ min: 1, max: 1000 }}
                InputProps={{
                  endAdornment: <Typography variant="body2">名</Typography>,
                }}
                FormHelperTextProps={{
                  sx: hasWarnings('teamSize') && !hasErrors('teamSize') ? { 
                    color: 'warning.main' 
                  } : undefined
                }}
              />
              <ValidationDisplay errors={getFieldError('teamSize')} />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box>
              <TextField
                label="役割・ポジション"
                value={formData.role}
                onChange={(e) => onFieldChange('role', e.target.value)}
                error={hasErrors('role')}
                helperText={getInlineErrorText('role') || getInlineWarningText('role')}
                fullWidth
                required
                placeholder="例: リードエンジニア、プロジェクトマネージャー"
                FormHelperTextProps={{
                  sx: hasWarnings('role') && !hasErrors('role') ? { 
                    color: 'warning.main' 
                  } : undefined
                }}
              />
              <ValidationDisplay errors={getFieldError('role')} />
            </Box>
          </Grid>
        </Grid>
      </FormSection>

      {/* 入力のヒント */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          ヒント: プロジェクト名は具体的に記入すると、後で見返した時にわかりやすくなります。
          現在進行中のプロジェクトの場合は、終了日を空欄にしてください。
        </Typography>
      </Box>
    </Box>
  );
};

export default WorkHistoryBasicForm;