import React from 'react';
import {
  Grid,
  TextField,
  Typography,
  Box,
  Alert,
  FormHelperText,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { ProcessSelector } from '../ProcessSelector';
import type { WorkHistoryFormData, ProcessMasterData } from '../../../../types/workHistory';
import type { ValidationError } from '../../../../hooks/workHistory/useWorkHistoryValidationEnhanced';

const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
}));

const TextFieldWithCounter = styled(Box)(() => ({
  position: 'relative',
}));

const CharCounter = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  bottom: -20,
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
}));

interface WorkHistoryDetailFormProps {
  formData: WorkHistoryFormData;
  errors: Record<string, ValidationError[]>;
  processes: ProcessMasterData[];
  onFieldChange: <K extends keyof WorkHistoryFormData>(field: K, value: WorkHistoryFormData[K]) => void;
  getFieldError: (field: string) => ValidationError[];
}

const MAX_LENGTHS = {
  projectOverview: 1000,
  responsibilities: 1000,
  achievements: 1000,
  notes: 500,
};

const ValidationDisplay: React.FC<{ 
  errors: ValidationError[];
}> = ({ errors }) => {
  if (!errors || errors.length === 0) return null;

  const errorMessages = errors.filter(e => e.severity === 'error');
  const warningMessages = errors.filter(e => e.severity === 'warning');

  return (
    <Box sx={{ mt: 0.5 }}>
      {errorMessages.length > 0 && (
        <Alert severity="error" size="small" sx={{ mb: 0.5 }}>
          {errorMessages.map(error => error.message).join(', ')}
        </Alert>
      )}
      {warningMessages.length > 0 && (
        <Alert severity="warning" size="small">
          {warningMessages.map(warning => warning.message).join(', ')}
        </Alert>
      )}
    </Box>
  );
};

export const WorkHistoryDetailForm: React.FC<WorkHistoryDetailFormProps> = ({
  formData,
  errors,
  processes,
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
  const getCharCount = (field: keyof typeof MAX_LENGTHS): string => {
    const value = formData[field] || '';
    const current = value.length;
    const max = MAX_LENGTHS[field];
    return `${current} / ${max}`;
  };

  const isOverLimit = (field: keyof typeof MAX_LENGTHS): boolean => {
    const value = formData[field] || '';
    return value.length > MAX_LENGTHS[field];
  };

  return (
    <Box>
      <FormSection>
        <SectionTitle variant="h6">プロジェクト概要</SectionTitle>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box>
              <TextFieldWithCounter>
                <TextField
                  label="プロジェクト概要"
                  value={formData.projectOverview}
                  onChange={(e) => onFieldChange('projectOverview', e.target.value)}
                  error={hasErrors('projectOverview') || isOverLimit('projectOverview')}
                  helperText={getInlineErrorText('projectOverview') || getInlineWarningText('projectOverview')}
                  fullWidth
                  required
                  multiline
                  rows={4}
                  placeholder="プロジェクトの概要を記入してください。システムの目的、規模、特徴などを含めると良いでしょう。"
                  FormHelperTextProps={{
                    sx: hasWarnings('projectOverview') && !hasErrors('projectOverview') ? { 
                      color: 'warning.main' 
                    } : undefined
                  }}
                />
                <CharCounter color={isOverLimit('projectOverview') ? 'error' : 'textSecondary'}>
                  {getCharCount('projectOverview')}
                </CharCounter>
              </TextFieldWithCounter>
              <ValidationDisplay errors={getFieldError('projectOverview')} />
            </Box>
          </Grid>
        </Grid>
      </FormSection>

      <FormSection>
        <SectionTitle variant="h6">担当業務・役割</SectionTitle>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box>
              <TextFieldWithCounter>
                <TextField
                  label="担当業務"
                  value={formData.responsibilities}
                  onChange={(e) => onFieldChange('responsibilities', e.target.value)}
                  error={hasErrors('responsibilities') || isOverLimit('responsibilities')}
                  helperText={getInlineErrorText('responsibilities') || getInlineWarningText('responsibilities')}
                  fullWidth
                  required
                  multiline
                  rows={4}
                  placeholder="あなたが担当した具体的な業務内容を記入してください。"
                  FormHelperTextProps={{
                    sx: hasWarnings('responsibilities') && !hasErrors('responsibilities') ? { 
                      color: 'warning.main' 
                    } : undefined
                  }}
                />
                <CharCounter color={isOverLimit('responsibilities') ? 'error' : 'textSecondary'}>
                  {getCharCount('responsibilities')}
                </CharCounter>
              </TextFieldWithCounter>
              <ValidationDisplay errors={getFieldError('responsibilities')} />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box>
              <ProcessSelector
                value={formData.processes}
                onChange={(processes) => onFieldChange('processes', processes)}
                label="担当工程"
                required
                error={hasErrors('processes')}
                helperText={getInlineErrorText('processes') || getInlineWarningText('processes')}
                variant="chip"
                showIcons
                showDescriptions
              />
              <ValidationDisplay errors={getFieldError('processes')} />
            </Box>
          </Grid>
        </Grid>
      </FormSection>

      <FormSection>
        <SectionTitle variant="h6">成果・実績（任意）</SectionTitle>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box>
              <TextFieldWithCounter>
                <TextField
                  label="成果・実績"
                  value={formData.achievements || ''}
                  onChange={(e) => onFieldChange('achievements', e.target.value)}
                  error={hasErrors('achievements') || isOverLimit('achievements')}
                  helperText={getInlineErrorText('achievements') || getInlineWarningText('achievements')}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="プロジェクトでの成果や実績があれば記入してください。数値化できる成果があると効果的です。"
                  FormHelperTextProps={{
                    sx: hasWarnings('achievements') && !hasErrors('achievements') ? { 
                      color: 'warning.main' 
                    } : undefined
                  }}
                />
                <CharCounter color={isOverLimit('achievements') ? 'error' : 'textSecondary'}>
                  {getCharCount('achievements')}
                </CharCounter>
              </TextFieldWithCounter>
              <ValidationDisplay errors={getFieldError('achievements')} />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box>
              <TextFieldWithCounter>
                <TextField
                  label="備考"
                  value={formData.notes || ''}
                  onChange={(e) => onFieldChange('notes', e.target.value)}
                  error={hasErrors('notes') || isOverLimit('notes')}
                  helperText={getInlineErrorText('notes') || getInlineWarningText('notes')}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="その他、補足事項があれば記入してください。"
                  FormHelperTextProps={{
                    sx: hasWarnings('notes') && !hasErrors('notes') ? { 
                      color: 'warning.main' 
                    } : undefined
                  }}
                />
                <CharCounter color={isOverLimit('notes') ? 'error' : 'textSecondary'}>
                  {getCharCount('notes')}
                </CharCounter>
              </TextFieldWithCounter>
              <ValidationDisplay errors={getFieldError('notes')} />
            </Box>
          </Grid>
        </Grid>
      </FormSection>

      {/* 入力のヒント */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          <strong>効果的な記入のポイント:</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2 }}>
          <li>担当業務は具体的に記入しましょう（例：要件定義から基本設計まで担当）</li>
          <li>成果・実績は数値を含めると説得力が増します（例：処理速度を50%改善）</li>
          <li>使用した手法やツールも含めると技術力がアピールできます</li>
        </Typography>
      </Box>
    </Box>
  );
};

export default WorkHistoryDetailForm;