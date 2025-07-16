import React from 'react';
import { format } from 'date-fns';
import { DataTable, DataTableColumn, DataTableProps } from './DataTable';
import { StatusChip, type ApplicationStatus } from './StatusChip';
import { CommonPagination, type CommonPaginationProps } from './CommonPagination';
import { Box } from '@mui/material';

export interface HistoryItem {
  id: string | number;
  date: Date | string;
  status: string;
  processedAt?: Date | string | null;
  [key: string]: unknown;
}

export interface PaginationConfig {
  /** ページネーションを有効にするかどうか */
  enabled: boolean;
  /** 現在のページ番号 (1ベース) */
  page: number;
  /** 1ページあたりの表示件数 */
  pageSize: number;
  /** 総アイテム数 */
  totalCount: number;
  /** ページ変更時のコールバック */
  onPageChange: (page: number) => void;
  /** ページサイズ変更時のコールバック */
  onPageSizeChange?: (pageSize: number) => void;
  /** ページサイズの選択肢 */
  pageSizeOptions?: number[];
  /** ページサイズセレクターを表示するかどうか */
  showPageSizeSelector?: boolean;
  /** 総件数表示を表示するかどうか */
  showTotalCount?: boolean;
  /** ページネーションのローディング状態 */
  loading?: boolean;
}

export interface HistoryTableProps<T extends HistoryItem> extends Omit<DataTableProps<T>, 'columns'> {
  columns: DataTableColumn<T>[];
  dateFormat?: string;
  statusConverter?: (status: string) => ApplicationStatus;
  showProcessedDate?: boolean;
  processedDateLabel?: string;
  /** ページネーション設定 */
  pagination?: PaginationConfig;
}

export const HistoryTable = <T extends HistoryItem>({
  data,
  columns: customColumns,
  dateFormat = 'yyyy/MM/dd',
  statusConverter,
  showProcessedDate = true,
  processedDateLabel = '処理日',
  emptyMessage = '申請データがありません',
  pagination,
  ...props
}: HistoryTableProps<T>) => {
  
  // 日付フォーマット関数
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '—';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, dateFormat);
    } catch {
      return '—';
    }
  };

  // ステータス表示用のフォーマット関数
  const formatStatus = (status: string): React.ReactNode => {
    if (statusConverter) {
      return <StatusChip status={statusConverter(status)} />;
    }
    return status;
  };

  // 処理日カラムを自動追加する場合の処理
  const enhancedColumns = React.useMemo(() => {
    const baseColumns = [...customColumns];
    
    // ステータスカラムにStatusChipを適用
    const statusColumnIndex = baseColumns.findIndex(col => col.id === 'status');
    if (statusColumnIndex !== -1 && statusConverter) {
      baseColumns[statusColumnIndex] = {
        ...baseColumns[statusColumnIndex],
        format: (value: unknown) => formatStatus(String(value))
      };
    }

    // 日付カラムにフォーマットを適用
    const dateColumnIndex = baseColumns.findIndex(col => col.id === 'date');
    if (dateColumnIndex !== -1) {
      baseColumns[dateColumnIndex] = {
        ...baseColumns[dateColumnIndex],
        format: (value: unknown) => formatDate(value as Date | string)
      };
    }

    // 処理日カラムを表示する場合
    if (showProcessedDate && !baseColumns.find(col => col.id === 'processedAt')) {
      baseColumns.push({
        id: 'processedAt' as keyof T,
        label: processedDateLabel,
        format: (value: unknown) => formatDate(value as Date | string)
      });
    }

    return baseColumns;
  }, [customColumns, statusConverter, showProcessedDate, processedDateLabel, dateFormat]);

  // ページネーション設定からCommonPaginationのpropsを生成
  const paginationProps: Omit<CommonPaginationProps, 'onPageChange'> & { onPageChange: (page: number) => void } = pagination ? {
    page: pagination.page,
    totalPages: Math.ceil(pagination.totalCount / pagination.pageSize),
    totalCount: pagination.totalCount,
    pageSize: pagination.pageSize,
    onPageChange: pagination.onPageChange,
    onPageSizeChange: pagination.onPageSizeChange,
    pageSizeOptions: pagination.pageSizeOptions,
    showPageSizeSelector: pagination.showPageSizeSelector,
    showTotalCount: pagination.showTotalCount,
    loading: pagination.loading,
  } : {
    page: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 10,
    onPageChange: () => {},
  };

  return (
    <Box>
      <DataTable<T>
        {...props}
        columns={enhancedColumns}
        data={data}
        emptyMessage={emptyMessage}
        loading={pagination?.loading || props.loading}
      />
      
      {/* ページネーションが有効な場合のみ表示 */}
      {pagination?.enabled && (
        <CommonPagination
          {...paginationProps}
          data-testid="history-table-pagination"
        />
      )}
    </Box>
  );
};

// 申請履歴用のプリセット列定義
export const createHistoryColumns = <T extends HistoryItem>(): DataTableColumn<T>[] => [
  { id: 'date' as keyof T, label: '申請日' },
  { id: 'status' as keyof T, label: 'ステータス' },
];

// 経費申請履歴用のプリセット列定義
export const createExpenseHistoryColumns = <T extends HistoryItem & { category: string; amount: number }>(): DataTableColumn<T>[] => [
  { id: 'date' as keyof T, label: '申請日' },
  { id: 'category' as keyof T, label: 'カテゴリ' },
  { 
    id: 'amount' as keyof T, 
    label: '金額', 
    align: 'right',
    format: (value: unknown) => `¥${Number(value || 0).toLocaleString()}`
  },
  { id: 'status' as keyof T, label: '状態' },
];

// 休暇申請履歴用のプリセット列定義  
export const createLeaveHistoryColumns = <T extends HistoryItem & { leaveTypeName: string; leaveDate?: string }>(): DataTableColumn<T>[] => [
  { id: 'date' as keyof T, label: '申請日' },
  { id: 'leaveTypeName' as keyof T, label: '休暇種別' },
  { id: 'leaveDate' as keyof T, label: '休暇日' },
  { id: 'status' as keyof T, label: 'ステータス' },
]; 