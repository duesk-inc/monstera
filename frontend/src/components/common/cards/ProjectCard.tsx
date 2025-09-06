import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  SxProps,
  Theme,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Money as MoneyIcon,
  Videocam as VideoIcon,
  Computer as RemoteIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

export interface ProjectCardProps {
  /** プロジェクトID */
  id: number;
  /** プロジェクト名 */
  name: string;
  /** カテゴリー */
  category: string;
  /** 開始日 */
  startDate: Date;
  /** 終了日 */
  endDate: Date;
  /** 応募期限 */
  applicationDeadline: Date;
  /** 想定単価 */
  expectedDailyRate: string;
  /** 面談回数 */
  interviewCount: number;
  /** 企業名 */
  company: string;
  /** 勤務地 */
  location: string;
  /** 最寄り駅 */
  nearestStation: string;
  /** フルリモート可能か */
  isFullRemote: boolean;
  /** プロジェクトステータス */
  status?: 'active' | 'closed' | 'pending';
  /** クリック可能かどうか */
  clickable?: boolean;
  /** クリック時のコールバック */
  onClick?: () => void;
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}

/**
 * プロジェクト一覧用の統一カードコンポーネント
 * 
 * 機能:
 * - プロジェクト情報の統一表示
 * - ステータス別のスタイリング
 * - レスポンシブ対応
 * - アクセシビリティ対応
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({
  id,
  name,
  category,
  startDate,
  endDate,
  applicationDeadline,
  expectedDailyRate,
  interviewCount,
  company,
  location,
  nearestStation,
  isFullRemote,
  status = 'active',
  clickable = true,
  onClick,
  sx,
  'data-testid': testId,
}) => {
  // 期間をフォーマット
  const formatProjectPeriod = (start: Date, end: Date): string => {
    return `${format(start, 'yyyy/MM')} - ${format(end, 'yyyy/MM')}`;
  };

  // ステータス別のスタイルを取得
  const getStatusStyles = (): SxProps<Theme> => {
    switch (status) {
      case 'closed':
        return {
          opacity: 0.7,
          bgcolor: 'rgba(0, 0, 0, 0.05)',
        };
      case 'pending':
        return {
          borderColor: 'warning.main',
          borderWidth: 2,
        };
      case 'active':
      default:
        return {
          bgcolor: 'background.paper',
        };
    }
  };

  // クリック可能な場合のスタイル
  const getClickableStyles = (): SxProps<Theme> => {
    if (!clickable || !onClick) return {};
    
    return {
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
      },
    };
  };

  return (
    <Card
      onClick={clickable && onClick ? onClick : undefined}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        ...(getStatusStyles() as any),
        ...(getClickableStyles() as any),
        ...(sx as any),
      }}
      data-testid={testId || `project-card-${id}`}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* ヘッダー：カテゴリーとステータス */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Chip
            label={category}
            color="primary"
            size="small"
            sx={{ borderRadius: 1 }}
          />
          {status === 'closed' && (
            <Chip
              label="募集終了"
              color="default"
              size="small"
              variant="outlined"
              sx={{ borderRadius: 1 }}
            />
          )}
        </Box>

        {/* プロジェクト名 */}
        <Typography 
          variant="h6" 
          component="h3" 
          fontWeight="bold"
          sx={{ 
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.3,
          }}
        >
          {name}
        </Typography>

        {/* 企業名 */}
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {company}
        </Typography>

        {/* プロジェクト詳細情報 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* 期間 */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CalendarIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {formatProjectPeriod(startDate, endDate)}
            </Typography>
          </Box>

          {/* 勤務地 */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {location}（{nearestStation}）
            </Typography>
          </Box>

          {/* 単価 */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <MoneyIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {expectedDailyRate}
            </Typography>
          </Box>

          {/* 面談回数とリモート情報 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <VideoIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                面談: {interviewCount}回
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <RemoteIcon 
                fontSize="small" 
                sx={{ 
                  color: isFullRemote ? 'success.main' : 'text.disabled',
                  mr: 0.5,
                }} 
              />
              <Typography 
                variant="caption" 
                color={isFullRemote ? 'success.main' : 'text.disabled'}
                sx={{ fontWeight: 500 }}
              >
                {isFullRemote ? 'リモート可' : '常駐'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>

      {/* フッター：応募期限 */}
      <Box sx={{ px: 2, pb: 2, mt: 'auto' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          py: 1,
          px: 2,
          bgcolor: status === 'closed' ? 'grey.100' : 'error.50',
          borderRadius: 1,
        }}>
          <TimeIcon 
            fontSize="small" 
            sx={{ 
              mr: 0.5, 
              color: status === 'closed' ? 'text.disabled' : 'error.main' 
            }} 
          />
          <Typography 
            variant="caption" 
            color={status === 'closed' ? 'text.disabled' : 'error.main'}
            sx={{ fontWeight: 500 }}
          >
            応募期限: {format(applicationDeadline, 'yyyy/MM/dd')}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}; 
