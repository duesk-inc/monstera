import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import type { ValidationError } from '../../../hooks/workHistory/useWorkHistoryValidationEnhanced';

const ErrorList = styled(List)(({ theme }) => ({
  padding: 0,
  marginTop: theme.spacing(1),
}));

const ErrorItem = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(0.5, 0),
  alignItems: 'flex-start',
}));

interface ValidationAlertProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  title?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  showIcons?: boolean;
  maxHeight?: number;
}

export const ValidationAlert: React.FC<ValidationAlertProps> = ({
  errors = [],
  warnings = [],
  title,
  collapsible = false,
  defaultExpanded = true,
  showIcons = true,
  maxHeight,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  const severity = hasErrors ? 'error' : hasWarnings ? 'warning' : 'info';

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return null;
    }
  };

  const renderErrorList = (items: ValidationError[], severity: 'error' | 'warning' | 'info') => {
    if (items.length === 0) return null;

    return (
      <ErrorList>
        {items.map((item, index) => (
          <ErrorItem key={`${item.field}-${item.code}-${index}`}>
            {showIcons && (
              <ListItemIcon sx={{ minWidth: 32 }}>
                {getIcon(severity)}
              </ListItemIcon>
            )}
            <ListItemText
              primary={item.message}
              secondary={item.field !== 'general' ? `フィールド: ${item.field}` : undefined}
              primaryTypographyProps={{
                variant: 'body2',
                color: severity === 'error' ? 'error.main' : 
                       severity === 'warning' ? 'warning.main' : 'info.main',
              }}
              secondaryTypographyProps={{
                variant: 'caption',
                color: 'text.secondary',
              }}
            />
          </ErrorItem>
        ))}
      </ErrorList>
    );
  };

  const renderContent = () => (
    <Box sx={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined, overflow: 'auto' }}>
      {hasErrors && renderErrorList(errors, 'error')}
      {hasWarnings && renderErrorList(warnings, 'warning')}
    </Box>
  );

  const getTitle = () => {
    if (title) return title;
    
    const errorCount = errors.length;
    const warningCount = warnings.length;
    
    if (errorCount > 0 && warningCount > 0) {
      return `入力エラー ${errorCount}件、警告 ${warningCount}件`;
    } else if (errorCount > 0) {
      return `入力エラー ${errorCount}件`;
    } else if (warningCount > 0) {
      return `警告 ${warningCount}件`;
    }
    
    return '入力チェック結果';
  };

  const getSummary = () => {
    const totalItems = errors.length + warnings.length;
    if (totalItems === 1) {
      const item = errors[0] || warnings[0];
      return item.message;
    }
    
    const errorCount = errors.length;
    const warningCount = warnings.length;
    
    if (errorCount > 0 && warningCount > 0) {
      return `${errorCount}件のエラーと${warningCount}件の警告があります。詳細を確認してください。`;
    } else if (errorCount > 0) {
      return `${errorCount}件のエラーがあります。入力内容を確認してください。`;
    } else {
      return `${warningCount}件の警告があります。推奨事項を確認してください。`;
    }
  };

  return (
    <Alert
      severity={severity}
      action={
        collapsible ? (
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "詳細を非表示" : "詳細を表示"}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        ) : undefined
      }
    >
      <AlertTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getTitle()}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {errors.length > 0 && (
              <Chip
                label={`エラー ${errors.length}`}
                size="small"
                color="error"
                variant="outlined"
              />
            )}
            {warnings.length > 0 && (
              <Chip
                label={`警告 ${warnings.length}`}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </AlertTitle>
      
      {!collapsible && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          {getSummary()}
        </Typography>
      )}
      
      {collapsible ? (
        <Collapse in={expanded}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {getSummary()}
          </Typography>
          {renderContent()}
        </Collapse>
      ) : (
        renderContent()
      )}
    </Alert>
  );
};

export default ValidationAlert;