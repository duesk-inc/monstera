import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CloudOff as CloudOffIcon,
  SearchOff as SearchOffIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useResponsive } from '../../../hooks/common/useResponsive';

const ErrorCard = styled(Card)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(4),
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
}));

const IconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
}));

interface WorkHistoryErrorStateProps {
  error?: Error | unknown;
  type?: 'fetch' | 'network' | 'permission' | 'notFound' | 'validation' | 'generic';
  title?: string;
  message?: string;
  showDetails?: boolean;
  onRetry?: () => void;
  retryText?: string;
  actionButtons?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'text' | 'outlined' | 'contained';
    color?: 'primary' | 'secondary' | 'error';
  }>;
}

export const WorkHistoryErrorState: React.FC<WorkHistoryErrorStateProps> = ({
  error,
  type = 'generic',
  title,
  message,
  showDetails = false,
  onRetry,
  retryText = '再試行',
  actionButtons = [],
}) => {
  const { isMobile } = useResponsive();

  // エラータイプに応じたアイコンを取得
  const getErrorIcon = () => {
    const iconProps = { sx: { fontSize: isMobile ? 48 : 64, color: 'error.main' } };
    
    switch (type) {
      case 'network':
        return <CloudOffIcon {...iconProps} />;
      case 'permission':
        return <WarningIcon {...iconProps} color="warning" />;
      case 'notFound':
        return <SearchOffIcon {...iconProps} />;
      case 'validation':
        return <WarningIcon {...iconProps} color="warning" />;
      default:
        return <ErrorIcon {...iconProps} />;
    }
  };

  // エラータイプに応じたタイトルとメッセージを取得
  const getErrorContent = () => {
    if (title && message) {
      return { title, message };
    }

    switch (type) {
      case 'fetch':
        return {
          title: 'データの取得に失敗しました',
          message: 'データを読み込めませんでした。しばらく待ってから再度お試しください。',
        };
      case 'network':
        return {
          title: 'ネットワークエラー',
          message: 'インターネット接続を確認してください。',
        };
      case 'permission':
        return {
          title: 'アクセス権限がありません',
          message: 'このページを表示する権限がありません。管理者にお問い合わせください。',
        };
      case 'notFound':
        return {
          title: 'データが見つかりません',
          message: '指定されたデータが見つかりませんでした。',
        };
      case 'validation':
        return {
          title: '入力エラー',
          message: '入力内容に問題があります。確認して再度お試しください。',
        };
      default:
        return {
          title: 'エラーが発生しました',
          message: '予期しないエラーが発生しました。しばらく待ってから再度お試しください。',
        };
    }
  };

  const { title: errorTitle, message: errorMessage } = getErrorContent();

  // エラー詳細の取得
  const getErrorDetails = () => {
    if (!error) return null;
    
    if (error instanceof Error) {
      return error.message;
    }
    
    if (typeof error === 'object' && error !== null) {
      return JSON.stringify(error, null, 2);
    }
    
    return String(error);
  };

  return (
    <ErrorCard>
      <CardContent>
        <IconContainer>
          {getErrorIcon()}
        </IconContainer>
        
        <Typography 
          variant={isMobile ? 'h6' : 'h5'} 
          component="h2" 
          gutterBottom
          sx={{ fontWeight: 'medium', mb: 2 }}
        >
          {errorTitle}
        </Typography>
        
        <Typography 
          variant="body1" 
          color="text.secondary" 
          paragraph
          sx={{ mb: 3, fontSize: isMobile ? '0.9rem' : undefined }}
        >
          {errorMessage}
        </Typography>

        {showDetails && error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              textAlign: 'left',
              '& .MuiAlert-message': {
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              },
            }}
          >
            <AlertTitle>エラー詳細</AlertTitle>
            {getErrorDetails()}
          </Alert>
        )}

        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2, 
          justifyContent: 'center',
          mt: 3,
        }}>
          {onRetry && (
            <Button
              variant="contained"
              color="primary"
              onClick={onRetry}
              startIcon={<RefreshIcon />}
              fullWidth={isMobile}
              size={isMobile ? 'large' : 'medium'}
            >
              {retryText}
            </Button>
          )}
          
          {actionButtons.map((button, index) => (
            <Button
              key={index}
              variant={button.variant || 'outlined'}
              color={button.color || 'primary'}
              onClick={button.onClick}
              fullWidth={isMobile}
              size={isMobile ? 'large' : 'medium'}
            >
              {button.label}
            </Button>
          ))}
        </Box>
      </CardContent>
    </ErrorCard>
  );
};

export default WorkHistoryErrorState;