// 統一チップコンポーネントのエクスポート
export { StatusChip, type ApplicationStatus } from './StatusChip';
export { TypeChip, type NotificationType } from './TypeChip';
export { CategoryChip, type CategoryType, type ProjectCategory, type ExpenseCategory, type LeaveCategory } from './CategoryChip';

// パンくずリストコンポーネント
export { Breadcrumbs, type BreadcrumbsProps, type BreadcrumbItem } from './Breadcrumbs';

// 統一バッジコンポーネントのエクスポート
export { NotificationBadge, type NotificationVariant, type NotificationPosition } from './NotificationBadge';
export { StatusBadge, type StatusType, type StatusVariant, type StatusSize } from './StatusBadge';

// 統一通知コンポーネントのエクスポート
export { NotificationItem, type NotificationItemVariant } from './NotificationItem';

// 共通テーブル・ページネーションコンポーネントのエクスポート
export { DataTable, type DataTableProps, type DataTableColumn } from './DataTable';
export { HistoryTable, type HistoryTableProps, type HistoryItem, createExpenseHistoryColumns, createLeaveHistoryColumns, createHistoryColumns } from './HistoryTable';
export { CommonPagination, type CommonPaginationProps } from './CommonPagination';

// 統一通知・フィードバックコンポーネントのエクスポート
export { ToastProvider, useToast, type ToastOptions, type ToastProviderProps } from './Toast';
export { 
  UnifiedAlert, 
  SuccessAlert, 
  ErrorAlert, 
  WarningAlert, 
  InfoAlert,
  type UnifiedAlertProps,
  type SuccessAlertProps,
  type ErrorAlertProps,
  type WarningAlertProps,
  type InfoAlertProps
} from './Alert';

// 共通UIコンポーネントのエクスポート（後方互換性維持）
export { SuccessSnackbar, SuccessSnackbarV2, type SuccessSnackbarProps } from './SuccessSnackbar';
export { ErrorDisplay, ErrorDisplayV2, type ErrorDisplayProps, type ApiError } from './ErrorDisplay';
export { default as AuthErrorHandler } from './AuthErrorHandler';

// 統一アコーディオンコンポーネントのエクスポート
export { CommonAccordion, type CommonAccordionProps } from './CommonAccordion';

// 統一タブコンポーネントのエクスポート
export { CommonTabPanel, type CommonTabPanelProps, createA11yProps, a11yProps } from './CommonTabPanel';

// ローディングコンポーネントのエクスポート
export { default as PageLoader, type PageLoaderProps } from './PageLoader';
export { default as SectionLoader, type SectionLoaderProps } from './SectionLoader';
export { default as LoadingOverlay, type LoadingOverlayProps } from './LoadingOverlay';

// 統一コンテナコンポーネントのエクスポート
export { FormContainer, type FormContainerProps } from './containers';
export { ContentContainer, type ContentContainerProps } from './containers';

// 統一レイアウトコンポーネントのエクスポート
export { 
  PageContainer, 
  PageHeader, 
  ContentCard, 
  SectionHeader,
  type PageContainerProps,
  type PageHeaderProps,
  type ContentCardProps,
  type SectionHeaderProps
} from './layout';

// 新しいダイアログコンポーネントのエクスポート
export { default as ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';
export { default as InfoDialog, type InfoDialogProps } from './InfoDialog';
export { default as FormDialog, type FormDialogProps } from './FormDialog';
export { default as SimpleDialog } from './SimpleDialog';
export * from './DialogTheme';

// 共通フォームコンポーネントのエクスポート
export * from './forms';

// チップユーティリティ関数のエクスポート
export * from '../../utils/chipUtils';

// 新しいエラーハンドリングコンポーネント
export { 
  GlobalErrorBoundary, 
  PartialErrorBoundary 
} from './ErrorBoundary';
export { 
  FullScreenErrorDisplay, 
  type FullScreenErrorDisplayProps 
} from './FullScreenErrorDisplay';
export { 
  ValidationErrorAlert, 
  FieldValidationError,
  type ValidationErrorAlertProps,
  type FieldValidationErrorProps 
} from './ValidationErrorAlert';


// 新しい共通コンポーネント
export { DateRangePicker } from './DateRangePicker';
export { SearchField } from './SearchField';
export { BulkActionDialog } from './BulkActionDialog';
export { ExportMenu, type ExportFormat } from './ExportMenu';
export { StatusFilterChips, type StatusFilter } from './StatusFilterChips';
export { UserSelectField, type User } from './UserSelectField';

// テーブル関連コンポーネント
export * from './table'; 