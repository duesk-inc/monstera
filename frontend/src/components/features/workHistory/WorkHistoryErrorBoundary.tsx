import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Container } from '@mui/material';
import { WorkHistoryErrorState } from './WorkHistoryErrorState';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class WorkHistoryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WorkHistoryErrorBoundary caught an error:', error, errorInfo);
    
    // エラー情報を状態に保存
    this.setState({
      error,
      errorInfo,
    });

    // カスタムエラーハンドラーがあれば呼び出す
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックが提供されている場合
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラー表示
      return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <WorkHistoryErrorState
            error={this.state.error}
            type="generic"
            title="予期しないエラーが発生しました"
            message="アプリケーションでエラーが発生しました。問題が続く場合は、ページを再読み込みしてください。"
            showDetails={process.env.NODE_ENV === 'development'}
            onRetry={this.handleReset}
            retryText="再試行"
            actionButtons={[
              {
                label: 'ページを再読み込み',
                onClick: () => window.location.reload(),
                variant: 'outlined',
              },
            ]}
          />
        </Container>
      );
    }

    return this.props.children;
  }
}

export default WorkHistoryErrorBoundary;