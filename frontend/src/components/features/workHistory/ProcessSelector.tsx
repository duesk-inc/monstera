import React from 'react';
import {
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  FormHelperText,
  Checkbox,
  Box,
  Chip,
  Typography,
  Grid,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Assignment as AssignmentIcon,
  Architecture as ArchitectureIcon,
  Code as CodeIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const ProcessContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}));

const ProcessCheckboxGroup = styled(FormGroup)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
}));

const ProcessChip = styled(Chip)<{ selected?: boolean }>(({ theme, selected }) => ({
  margin: theme.spacing(0.25),
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  border: selected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
  backgroundColor: selected ? theme.palette.primary.light : 'transparent',
  '&:hover': {
    backgroundColor: selected ? theme.palette.primary.light : theme.palette.action.hover,
    transform: 'translateY(-1px)',
  },
}));

const SelectedProcessesContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(1),
  padding: theme.spacing(1),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.shape.borderRadius,
}));

// 工程マスターデータ
const PROCESS_OPTIONS = [
  {
    id: 1,
    name: '要件定義',
    icon: <AssignmentIcon />,
    description: 'システムの要件を分析・定義',
    color: 'primary' as const,
  },
  {
    id: 2,
    name: '基本設計',
    icon: <ArchitectureIcon />,
    description: 'システム全体の基本的な設計',
    color: 'secondary' as const,
  },
  {
    id: 3,
    name: '詳細設計',
    icon: <BuildIcon />,
    description: '機能の詳細設計・仕様決定',
    color: 'info' as const,
  },
  {
    id: 4,
    name: '製造・実装',
    icon: <CodeIcon />,
    description: 'プログラムの実装・コーディング',
    color: 'success' as const,
  },
  {
    id: 5,
    name: 'テスト',
    icon: <BugReportIcon />,
    description: '単体・結合・システムテスト',
    color: 'warning' as const,
  },
  {
    id: 6,
    name: '保守・運用',
    icon: <SettingsIcon />,
    description: 'システムの保守・運用・改善',
    color: 'error' as const,
  },
];

interface ProcessSelectorProps {
  value: number[];
  onChange: (processes: number[]) => void;
  label?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  variant?: 'checkbox' | 'chip';
  showIcons?: boolean;
  showDescriptions?: boolean;
  maxSelections?: number;
  minSelections?: number;
}

export const ProcessSelector: React.FC<ProcessSelectorProps> = ({
  value = [],
  onChange,
  label = '担当工程',
  required = false,
  error = false,
  helperText,
  disabled = false,
  variant = 'chip',
  showIcons = true,
  showDescriptions = false,
  maxSelections,
  minSelections = 1,
}) => {
  const handleProcessChange = (processId: number) => {
    const isSelected = value.includes(processId);
    let newValue: number[];

    if (isSelected) {
      // 選択解除
      newValue = value.filter(id => id !== processId);
    } else {
      // 選択追加
      if (maxSelections && value.length >= maxSelections) {
        return; // 最大選択数に達している場合は追加しない
      }
      newValue = [...value, processId];
    }

    onChange(newValue);
  };

  const handleCheckboxChange = (processId: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      if (!maxSelections || value.length < maxSelections) {
        onChange([...value, processId]);
      }
    } else {
      onChange(value.filter(id => id !== processId));
    }
  };

  // バリデーション
  const validationError = React.useMemo(() => {
    if (required && value.length === 0) {
      return '担当工程を選択してください';
    }
    if (minSelections && value.length < minSelections) {
      return `最低${minSelections}つの工程を選択してください`;
    }
    if (maxSelections && value.length > maxSelections) {
      return `最大${maxSelections}つまで選択可能です`;
    }
    return null;
  }, [value, required, minSelections, maxSelections]);

  const isError = error || !!validationError;
  const errorMessage = helperText || validationError;

  // 選択された工程の名前を取得
  const selectedProcessNames = value
    .map(id => PROCESS_OPTIONS.find(option => option.id === id)?.name)
    .filter(Boolean) as string[];

  if (variant === 'checkbox') {
    return (
      <FormControl error={isError} disabled={disabled} required={required}>
        {label && <FormLabel component="legend">{label}</FormLabel>}
        
        <ProcessCheckboxGroup>
          <Grid container spacing={1}>
            {PROCESS_OPTIONS.map((process) => (
              <Grid item xs={12} sm={6} md={4} key={process.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={value.includes(process.id)}
                      onChange={handleCheckboxChange(process.id)}
                      disabled={
                        disabled || 
                        (maxSelections && value.length >= maxSelections && !value.includes(process.id))
                      }
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {showIcons && process.icon}
                      <Box>
                        <Typography variant="body2">{process.name}</Typography>
                        {showDescriptions && (
                          <Typography variant="caption" color="text.secondary">
                            {process.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  }
                />
              </Grid>
            ))}
          </Grid>
        </ProcessCheckboxGroup>

        {isError && errorMessage && (
          <FormHelperText>{errorMessage}</FormHelperText>
        )}
      </FormControl>
    );
  }

  return (
    <FormControl error={isError} disabled={disabled} required={required} fullWidth>
      {label && <FormLabel component="legend">{label}</FormLabel>}
      
      <ProcessContainer>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {PROCESS_OPTIONS.map((process) => {
            const isSelected = value.includes(process.id);
            const isDisabled = 
              disabled || 
              (maxSelections && value.length >= maxSelections && !isSelected);

            return (
              <ProcessChip
                key={process.id}
                label={process.name}
                icon={showIcons ? process.icon : undefined}
                selected={isSelected}
                onClick={() => !isDisabled && handleProcessChange(process.id)}
                variant={isSelected ? 'filled' : 'outlined'}
                color={isSelected ? process.color : 'default'}
                disabled={isDisabled}
                clickable={!isDisabled}
              />
            );
          })}
        </Box>

        {/* 選択された工程の表示 */}
        {selectedProcessNames.length > 0 && (
          <SelectedProcessesContainer>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              選択中 ({selectedProcessNames.length}個):
            </Typography>
            {selectedProcessNames.map((name, index) => (
              <Chip
                key={index}
                label={name}
                size="small"
                color="primary"
                variant="filled"
              />
            ))}
          </SelectedProcessesContainer>
        )}

        {/* 説明の表示 */}
        {showDescriptions && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              複数選択可能です。主に担当した工程を選択してください。
            </Typography>
            {maxSelections && (
              <Typography variant="caption" color="text.secondary" display="block">
                最大{maxSelections}つまで選択できます。
              </Typography>
            )}
          </Box>
        )}

        {isError && errorMessage && (
          <FormHelperText>{errorMessage}</FormHelperText>
        )}
      </ProcessContainer>
    </FormControl>
  );
};

interface ProcessDisplayProps {
  processIds: number[];
  showIcons?: boolean;
  variant?: 'chip' | 'text';
  size?: 'small' | 'medium';
  maxDisplay?: number;
}

export const ProcessDisplay: React.FC<ProcessDisplayProps> = ({
  processIds,
  showIcons = false,
  variant = 'chip',
  size = 'small',
  maxDisplay = 5,
}) => {
  const processes = processIds
    .map(id => PROCESS_OPTIONS.find(option => option.id === id))
    .filter(Boolean) as typeof PROCESS_OPTIONS;

  const displayProcesses = processes.slice(0, maxDisplay);
  const remainingCount = processes.length - maxDisplay;

  if (variant === 'text') {
    const processNames = processes.map(p => p.name);
    const displayNames = processNames.slice(0, maxDisplay);
    
    return (
      <Typography variant="body2" color="text.secondary">
        {displayNames.join('、')}
        {remainingCount > 0 && ` 他${remainingCount}件`}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {displayProcesses.map((process) => (
        <Chip
          key={process.id}
          label={process.name}
          icon={showIcons ? process.icon : undefined}
          size={size}
          color={process.color}
          variant="outlined"
        />
      ))}
      
      {remainingCount > 0 && (
        <Chip
          label={`+${remainingCount}個`}
          size={size}
          variant="outlined"
          color="default"
        />
      )}
    </Box>
  );
};

export default ProcessSelector;