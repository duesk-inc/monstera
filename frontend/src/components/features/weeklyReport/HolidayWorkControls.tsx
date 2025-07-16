import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Info as InfoIcon,
} from '@mui/icons-material';
import { DailyRecord } from '@/types/weeklyReport';

interface HolidayWorkControlsProps {
  isWeekend: boolean;
  record: DailyRecord;
  isSubmitted: boolean;
  onHolidayWorkToggle: () => void;
  onClientWorkToggle: (checked: boolean) => void;
}

/**
 * 休日出勤・客先勤怠コントロールコンポーネント
 * 休日出勤の切り替えと客先勤怠の有効/無効、注釈メッセージを管理
 */
export const HolidayWorkControls: React.FC<HolidayWorkControlsProps> = ({
  isWeekend,
  record,
  isSubmitted,
  onHolidayWorkToggle,
  onClientWorkToggle,
}) => {
  return (
    <>
      {isWeekend && (
        <Box sx={{ 
          mb: 2,
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2
        }}>
          <FormControlLabel
            control={
              <Switch
                checked={record.isHolidayWork}
                onChange={onHolidayWorkToggle}
                color="warning"
                disabled={isSubmitted}
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                休日出勤
              </Typography>
            }
          />
          
          {/* 客先勤怠表示切替トグル - 横並びにする */}
          <FormControlLabel
            control={
              <Switch
                checked={record.hasClientWork || false}
                onChange={(_, checked) => onClientWorkToggle(checked)}
                color="secondary"
                disabled={isSubmitted || !record.isHolidayWork}
              />
            }
            label={
              <Typography 
                variant="body2" 
                fontWeight="medium" 
                color={record.hasClientWork && !isSubmitted && record.isHolidayWork ? 'secondary.main' : 'text.secondary'}
              >
                客先勤怠
              </Typography>
            }
          />
        </Box>
      )}
      
      {/* 非休日の場合の客先勤怠表示切替トグル */}
      {!isWeekend && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={record.hasClientWork || false}
                onChange={(_, checked) => onClientWorkToggle(checked)}
                color="secondary"
                disabled={isSubmitted}
              />
            }
            label={
              <Typography variant="body2" fontWeight="medium" color={record.hasClientWork ? 'secondary.main' : 'text.secondary'}>
                客先勤怠
              </Typography>
            }
          />
        </Box>
      )}
      
      {/* 注釈メッセージ - 客先勤怠がONの場合に表示 */}
      {record.hasClientWork && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          mb: 2, 
          p: 2, 
          bgcolor: '#fff8e1', 
          borderRadius: 1, 
          border: '1px solid #ffe082' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff9800' }}>
            <InfoIcon fontSize="small" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            自社と客先で勤務時間が異なる場合(自社業務など)のみ、客先勤怠を入力してください。<br />
            自社の勤務時間と客先の勤務時間が同じ場合は、自社勤怠のみご入力ください。
          </Typography>
        </Box>
      )}
    </>
  );
}; 