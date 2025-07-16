import React from 'react';
import { Box } from '@mui/material';
import { WorkHistoryLoadingState } from './WorkHistoryLoadingState';
import { WorkHistoryErrorState } from './WorkHistoryErrorState';
import { WorkHistoryEmptyState } from './WorkHistoryEmptyState';

interface WorkHistoryStateManagerProps {
  // 状態
  isLoading?: boolean;
  error?: Error | unknown;
  isEmpty?: boolean;
  isFiltered?: boolean;
  hasSearchQuery?: boolean;
  
  // ローディング設定
  loadingVariant?: 'list' | 'grid' | 'card' | 'stats' | 'form';
  loadingItemCount?: number;
  showLoadingHeader?: boolean;
  
  // エラー設定
  errorType?: 'fetch' | 'network' | 'permission' | 'notFound' | 'validation' | 'generic';
  errorTitle?: string;
  errorMessage?: string;
  showErrorDetails?: boolean;
  onErrorRetry?: () => void;
  errorRetryText?: string;
  
  // 空状態設定
  emptyType?: 'noData' | 'noResults' | 'filtered' | 'error';
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIllustration?: 'folder' | 'search' | 'filter' | 'custom';
  emptyCustomIllustration?: React.ReactNode;
  emptyPrimaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  emptySecondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  showEmptySuggestions?: boolean;
  
  // 子要素（正常時の表示内容）
  children: React.ReactNode;
}

export const WorkHistoryStateManager: React.FC<WorkHistoryStateManagerProps> = ({
  // 状態
  isLoading = false,
  error,
  isEmpty = false,
  isFiltered = false,
  hasSearchQuery = false,
  
  // ローディング設定
  loadingVariant = 'list',
  loadingItemCount = 3,
  showLoadingHeader = true,
  
  // エラー設定
  errorType = 'generic',
  errorTitle,
  errorMessage,
  showErrorDetails = false,
  onErrorRetry,
  errorRetryText = '再試行',
  
  // 空状態設定
  emptyType,
  emptyTitle,
  emptyMessage,
  emptyIllustration,
  emptyCustomIllustration,
  emptyPrimaryAction,
  emptySecondaryAction,
  showEmptySuggestions = true,
  
  // 子要素
  children,
}) => {
  // ローディング状態
  if (isLoading) {
    return (
      <WorkHistoryLoadingState
        variant={loadingVariant}
        itemCount={loadingItemCount}
        showHeader={showLoadingHeader}
      />
    );
  }

  // エラー状態
  if (error) {
    return (
      <WorkHistoryErrorState
        error={error}
        type={errorType}
        title={errorTitle}
        message={errorMessage}
        showDetails={showErrorDetails}
        onRetry={onErrorRetry}
        retryText={errorRetryText}
      />
    );
  }

  // 空状態
  if (isEmpty) {
    // 空状態のタイプを自動判定
    let detectedEmptyType = emptyType;
    if (!detectedEmptyType) {
      if (hasSearchQuery) {
        detectedEmptyType = 'noResults';
      } else if (isFiltered) {
        detectedEmptyType = 'filtered';
      } else {
        detectedEmptyType = 'noData';
      }
    }

    return (
      <WorkHistoryEmptyState
        type={detectedEmptyType}
        title={emptyTitle}
        message={emptyMessage}
        illustration={emptyIllustration}
        customIllustration={emptyCustomIllustration}
        primaryAction={emptyPrimaryAction}
        secondaryAction={emptySecondaryAction}
        showSuggestions={showEmptySuggestions}
      />
    );
  }

  // 正常状態
  return <Box>{children}</Box>;
};

export default WorkHistoryStateManager;