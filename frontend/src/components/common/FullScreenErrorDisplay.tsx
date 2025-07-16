import React from 'react';
import {
  Container,
  Box,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { ErrorAlert } from './Alert';
import ActionButton from './ActionButton';

export interface FullScreenErrorDisplayProps {
  error: {
    title: string;
    message: string;
    details?: string;
    retryAction?: () => void;
  };
  showHomeButton?: boolean;
  containerMaxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

/**
 * 全画面エラー表示コンポーネント
 * システムエラーやクリティカルなエラー時に画面全体を使用してエラーを表示
 * Error Boundaryと組み合わせて使用されることを想定
 */
export const FullScreenErrorDisplay: React.FC<FullScreenErrorDisplayProps> = ({
  error,
  showHomeButton = true,
  containerMaxWidth = 'md',
}) => {
  const handleGoHome = () => {
    // ホームページ（ダッシュボード）に遷移
    window.location.href = '/dashboard';
  };

  const handlePageRefresh = () => {
    // ページ全体を再読み込み
    window.location.reload();
  };

  return (
    <Container maxWidth={containerMaxWidth}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          px: 2,
        }}
      >
        {/* メインエラー表示 */}
        <Box sx={{ width: '100%', maxWidth: 600, mb: 4 }}>
          <ErrorAlert
            title={error.title}
            message={error.message}
            details={error.details}
            retryAction={error.retryAction}
            sx={{ 
              mb: 3,
              textAlign: 'center',
              '& .MuiAlert-message': {
                width: '100%',
              },
            }}
          />
        </Box>

        {/* 追加のアクションボタン */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* ページ再読み込みボタン */}
          <ActionButton
            buttonType="primary"
            onClick={handlePageRefresh}
            startIcon={<RefreshIcon />}
            sx={{ minWidth: 160 }}
          >
            ページを再読み込み
          </ActionButton>

          {/* ホームボタン */}
          {showHomeButton && (
            <ActionButton
              buttonType="secondary"
              onClick={handleGoHome}
              startIcon={<HomeIcon />}
              sx={{ minWidth: 160 }}
            >
              ダッシュボードに戻る
            </ActionButton>
          )}
        </Box>

        {/* 追加情報 */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            問題が継続する場合は、システム管理者にお問い合わせください。
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default FullScreenErrorDisplay; 