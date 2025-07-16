'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  AccessTime as AccessTimeIcon,
  Repeat as RepeatIcon,
} from '@mui/icons-material';
import { 
  NotificationCondition, 
  NotificationConditionType, 
  NotificationOperator,
  NotificationType 
} from '@/types/notification';

interface NotificationConditionsSectionProps {
  notificationType: NotificationType;
  conditions: NotificationCondition[];
  onChange: (conditions: NotificationCondition[]) => void;
}

interface ConditionConfig {
  label: string;
  icon: React.ReactNode;
  operators: NotificationOperator[];
  valueType: 'text' | 'number' | 'time' | 'select';
  selectOptions?: { value: string; label: string }[];
  placeholder?: string;
  helperText?: string;
}

const CONDITION_CONFIGS: Record<NotificationConditionType, ConditionConfig> = {
  time_of_day: {
    label: '時刻条件',
    icon: <ScheduleIcon />,
    operators: ['equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
    valueType: 'time',
    placeholder: '09:00',
    helperText: '指定した時刻に基づいて通知を制御します',
  },
  day_of_week: {
    label: '曜日条件',
    icon: <CalendarIcon />,
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    valueType: 'select',
    selectOptions: [
      { value: '1', label: '月曜日' },
      { value: '2', label: '火曜日' },
      { value: '3', label: '水曜日' },
      { value: '4', label: '木曜日' },
      { value: '5', label: '金曜日' },
      { value: '6', label: '土曜日' },
      { value: '0', label: '日曜日' },
    ],
    helperText: '特定の曜日での通知を制御します',
  },
  urgency_level: {
    label: '緊急度レベル',
    icon: <PersonIcon />,
    operators: ['equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
    valueType: 'select',
    selectOptions: [
      { value: 'low', label: '低' },
      { value: 'medium', label: '中' },
      { value: 'high', label: '高' },
    ],
    helperText: '通知の緊急度に基づいて制御します',
  },
  user_role: {
    label: 'ユーザーロール',
    icon: <PersonIcon />,
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    valueType: 'select',
    selectOptions: [
      { value: 'engineer', label: 'エンジニア' },
      { value: 'manager', label: 'マネージャー' },
      { value: 'admin', label: '管理者' },
    ],
    helperText: 'ユーザーのロールに基づいて通知を制御します',
  },
  department: {
    label: '部署',
    icon: <BusinessIcon />,
    operators: ['equals', 'not_equals', 'contains', 'not_contains'],
    valueType: 'text',
    placeholder: '開発部',
    helperText: 'ユーザーの所属部署に基づいて通知を制御します',
  },
  working_hours: {
    label: '稼働時間',
    icon: <AccessTimeIcon />,
    operators: ['greater_than', 'less_than', 'greater_equal', 'less_equal'],
    valueType: 'number',
    placeholder: '40',
    helperText: '週の稼働時間（時間）に基づいて通知を制御します',
  },
  consecutive_days: {
    label: '連続日数',
    icon: <RepeatIcon />,
    operators: ['greater_than', 'less_than', 'greater_equal', 'less_equal'],
    valueType: 'number',
    placeholder: '5',
    helperText: '連続勤務日数に基づいて通知を制御します',
  },
};

const OPERATOR_LABELS: Record<NotificationOperator, string> = {
  equals: '等しい',
  not_equals: '等しくない',
  greater_than: 'より大きい',
  less_than: 'より小さい',
  greater_equal: '以上',
  less_equal: '以下',
  contains: '含む',
  not_contains: '含まない',
  in: 'いずれかに含まれる',
  not_in: 'いずれにも含まれない',
};

export default function NotificationConditionsSection({
  notificationType,
  conditions,
  onChange,
}: NotificationConditionsSectionProps) {
  const [newConditionType, setNewConditionType] = useState<NotificationConditionType>('time_of_day');

  const addCondition = () => {
    const config = CONDITION_CONFIGS[newConditionType];
    const newCondition: NotificationCondition = {
      id: `temp_${Date.now()}`,
      conditionType: newConditionType,
      operator: config.operators[0],
      value: '',
      isEnabled: true,
    };
    
    onChange([...conditions, newCondition]);
  };

  const updateCondition = (index: number, field: keyof NotificationCondition, value: any) => {
    const updatedConditions = conditions.map((condition, i) => 
      i === index ? { ...condition, [field]: value } : condition
    );
    onChange(updatedConditions);
  };

  const removeCondition = (index: number) => {
    const updatedConditions = conditions.filter((_, i) => i !== index);
    onChange(updatedConditions);
  };

  const renderValueInput = (condition: NotificationCondition, index: number) => {
    const config = CONDITION_CONFIGS[condition.conditionType];
    
    switch (config.valueType) {
      case 'time':
        return (
          <TextField
            type="time"
            value={condition.value}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            size="small"
            sx={{ minWidth: 120 }}
          />
        );
      
      case 'number':
        return (
          <TextField
            type="number"
            value={condition.value}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            placeholder={config.placeholder}
            size="small"
            sx={{ minWidth: 120 }}
          />
        );
      
      case 'select':
        return (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={condition.value}
              onChange={(e) => updateCondition(index, 'value', e.target.value)}
            >
              {config.selectOptions?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      
      default:
        return (
          <TextField
            value={condition.value}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            placeholder={config.placeholder}
            size="small"
            sx={{ minWidth: 120 }}
          />
        );
    }
  };

  const getRelevantConditionTypes = (): NotificationConditionType[] => {
    // 通知タイプに応じて関連する条件タイプを返す
    switch (notificationType) {
      case 'weekly_report_reminder':
      case 'weekly_report_overdue':
        return ['time_of_day', 'day_of_week', 'user_role', 'department'];
      case 'alert_triggered':
        return ['urgency_level', 'working_hours', 'consecutive_days', 'user_role'];
      case 'system_maintenance':
        return ['time_of_day', 'user_role', 'department'];
      default:
        return Object.keys(CONDITION_CONFIGS) as NotificationConditionType[];
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        通知条件設定
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        特定の条件に基づいて通知の送信を制御できます。複数の条件を設定した場合、すべての条件が満たされた時に通知が送信されます。
      </Typography>

      {conditions.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          条件が設定されていません。条件を追加すると、より細かい通知制御が可能になります。
        </Alert>
      ) : (
        <Box sx={{ mb: 3 }}>
          {conditions.map((condition, index) => {
            const config = CONDITION_CONFIGS[condition.conditionType];
            return (
              <Box key={condition.id} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: condition.isEnabled ? 'background.paper' : 'action.hover',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={condition.isEnabled}
                        onChange={(e) => updateCondition(index, 'isEnabled', e.target.checked)}
                        size="small"
                      />
                    }
                    label=""
                    sx={{ margin: 0 }}
                  />
                  
                  <Chip
                    icon={config.icon}
                    label={config.label}
                    size="small"
                    variant="outlined"
                  />
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                    >
                      {config.operators.map((operator) => (
                        <MenuItem key={operator} value={operator}>
                          {OPERATOR_LABELS[operator]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {renderValueInput(condition, index)}
                  
                  <IconButton
                    onClick={() => removeCondition(index)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                
                {config.helperText && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                    {config.helperText}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      <Divider sx={{ my: 2 }} />
      
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        新しい条件を追加
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>条件タイプ</InputLabel>
          <Select
            value={newConditionType}
            onChange={(e) => setNewConditionType(e.target.value as NotificationConditionType)}
            label="条件タイプ"
          >
            {getRelevantConditionTypes().map((type) => {
              const config = CONDITION_CONFIGS[type];
              return (
                <MenuItem key={type} value={type}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {config.icon}
                    {config.label}
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={addCondition}
          size="small"
        >
          条件を追加
        </Button>
      </Box>
    </Paper>
  );
}