'use client';

import React, { useEffect, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

/**
 * 認証エラーハンドラーコンポーネント
 * アプリケーション全体で発生する認証エラーを検知し、統一されたエラーメッセージを表示します
 */
const AuthErrorHandler: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 認証エラーイベントリスナーを設定
    const handleAuthError = (event: CustomEvent<{ message: string }>) => {
      if (event.detail && event.detail.message) {
        setMessage(event.detail.message);
        setOpen(true);
      }
    };

    // イベントリスナーを追加
    window.addEventListener('auth-error', handleAuthError as EventListener);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('auth-error', handleAuthError as EventListener);
    };
  }, []);

  // トースト閉じる処理
  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert 
        onClose={handleClose} 
        severity="error" 
        variant="filled"
        elevation={6}
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default AuthErrorHandler; 