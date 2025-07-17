'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Alert,
  Divider,
  CircularProgress,
  Link as MuiLink,
  IconButton,
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import ActionButton from '@/components/common/ActionButton';
import { 
  PageContainer, 
  PageHeader, 
  ContentCard,
} from '@/components/common/layout';
import {
  Login as LoginIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { login } from '@/lib/api/auth';
import type { LoginRequest, ErrorResponse } from '@/types/auth';
import { UI_DELAYS } from '@/constants/delays';
import { useEnhancedErrorHandler } from '../../../hooks/common/useEnhancedErrorHandler';

// ローディング用コンポーネント
function LoginPageLoading() {
  return (
    <PageContainer maxWidth="sm">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    </PageContainer>
  );
}

// LoginPageContentコンポーネントを分離
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToastMessage, getFieldErrors, getRecommendedAction } = useEnhancedErrorHandler();
  
  
  
  // 状態管理
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  // URLパラメータから認証エラーやリダイレクト先を取得
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const redirectParam = searchParams.get('redirect');
    
    if (errorParam === 'unauthorized') {
      setError('認証が必要です。ログインしてください。');
    } else if (errorParam === 'session_expired') {
      setError('セッションが期限切れです。再度ログインしてください。');
    }
    
    if (redirectParam) {
      setRedirectPath(decodeURIComponent(redirectParam));
    }
  }, [searchParams]);

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setFieldErrors(null);


      // Cognito認証処理
      console.log('認証タイプ: Cognitoでログインを実行');
      
      const credentials: LoginRequest = { email, password };
      const response = await login(credentials);
      
      // ログイン成功
      console.log('ログイン成功:', response.message || 'ログインが完了しました');
      
      // リダイレクト先の決定
      // ユーザーのロールに基づいてデフォルトのリダイレクト先を決定
      let defaultPath = '/dashboard';
      if (response.user && response.user.roles && response.user.roles.length > 0) {
        // 最高権限のロールを取得（数値が小さいほど高権限）
        const highestRole = Math.min(...response.user.roles);
        if (highestRole <= 3) { // 1:super_admin, 2:admin, 3:manager
          defaultPath = '/admin/dashboard';
        }
      }
      
      const targetPath = response.redirect_to || redirectPath || defaultPath;
      router.push(targetPath);
      
    } catch (err) {
      console.error('ログインエラー:', err);
      
      // 新しいエラーハンドリングシステムでエラーを処理
      const errorMessage = getToastMessage(err, 'ログイン', 'LoginPage');
      const fieldErrorsData = getFieldErrors(err);
      const recommendation = getRecommendedAction(err);
      
      // エラーメッセージの設定
      if (errorMessage) {
        setError(errorMessage);
      } else {
        // フォールバック: 従来のエラーハンドリング（デグレード防止）
        const errorMsg = (err as ErrorResponse).error || 'ログインに失敗しました。メールアドレスとパスワードを確認してください。';
        setError(errorMsg);
      }
      
      // フィールド別エラーがある場合は設定
      if (fieldErrorsData) {
        setFieldErrors(fieldErrorsData);
      } else {
        setFieldErrors(null);
      }
      
      // 開発環境では推奨アクションもログ出力
      if (process.env.NODE_ENV === 'development') {
        console.info('推奨アクション:', recommendation);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="sm">
      <PageHeader
        title="ログイン"
        subtitle="アカウントにログインしてください"
      />

      <ContentCard variant="elevated">

        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} data-testid="login-error">
            {error}
          </Alert>
        )}

        {/* リダイレクト先の表示 */}
        {redirectPath && (
          <Alert severity="info" sx={{ mb: 3 }}>
            ログイン後、{redirectPath}にリダイレクトします。
          </Alert>
        )}

        {/* 認証サービス情報の表示（開発環境のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight="bold">
              認証サービス: AWS Cognito
            </Typography>
          </Alert>
        )}

        {/* ログインフォーム */}
        <form onSubmit={handleLogin} data-testid="login-form">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              autoComplete="email"
              disabled={isLoading}
              error={!!fieldErrors?.email}
              helperText={fieldErrors?.email}
              data-testid="email-input"
            />

            <TextField
              label="パスワード"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              autoComplete="current-password"
              disabled={isLoading}
              error={!!fieldErrors?.password}
              helperText={fieldErrors?.password}
              data-testid="password-input"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    edge="end"
                    aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                ),
              }}
            />

            <ActionButton
              type="submit"
              buttonType="primary"
              size="large"
              fullWidth
              startIcon={<LoginIcon />}
              loading={isLoading}
              disabled={!email || !password}
              data-testid="login-button"
            >
              ログイン
            </ActionButton>
          </Box>
        </form>

        <Divider sx={{ my: 3 }} />

        {/* 追加リンク */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            パスワードを忘れた場合は
            <MuiLink component={Link} href="/forgot-password" sx={{ ml: 0.5 }} data-testid="forgot-password-link">
              こちら
            </MuiLink>
          </Typography>
        </Box>
      </ContentCard>
    </PageContainer>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPageContent />
    </Suspense>
  );
} 