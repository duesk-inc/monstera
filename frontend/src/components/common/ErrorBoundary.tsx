'use client';

import React from 'react';
import { FullScreenErrorDisplay } from './FullScreenErrorDisplay';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

/**
 * アプリケーション全体のエラーをキャッチするError Boundary
 * 予期しないJavaScriptエラーを捕捉し、ユーザーフレンドリーなエラー画面を表示
 */
export class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // エラーが発生したことを記録
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // エラーの詳細情報を保存
    this.setState({
      error,
      errorInfo,
    });

    // エラーログの出力（本番環境では外部サービスに送信可能）
    console.error('Global Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // 開発環境でのデバッグ情報
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Debug Info');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    // エラー状態をリセット
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // カスタムfallbackが提供されている場合はそれを使用
      if (this.props.fallback && this.state.error) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      // デフォルトの全画面エラー表示
      return (
        <FullScreenErrorDisplay
          error={{
            title: 'システムエラーが発生しました',
            message: '予期しないエラーが発生しました。ページを再読み込みするか、しばらく時間をおいてから再度お試しください。',
            details: process.env.NODE_ENV === 'development' && this.state.error
              ? `${this.state.error.name}: ${this.state.error.message}`
              : undefined,
            retryAction: this.handleRetry,
          }}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * より軽量なエラーバウンダリー（部分的なコンポーネント用）
 */
interface PartialErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class PartialErrorBoundary extends React.Component<
  PartialErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: PartialErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    console.error('Partial Error Boundary caught an error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '16px', textAlign: 'center', color: '#d32f2f' }}>
          この部分でエラーが発生しました。ページを再読み込みしてください。
        </div>
      );
    }

    return this.props.children;
  }
} 