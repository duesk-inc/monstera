import React from 'react';
import { HistoryTable, createExpenseHistoryColumns, type HistoryItem } from '@/components/common';

// 経費申請履歴項目の型定義 (HistoryItemを拡張)
interface ExpenseHistoryItem extends HistoryItem {
  category: string;
  amount: number;
  processedAt?: Date | string | null;
  rejectionReason?: string;
}

interface ExpenseHistoryViewProps {
  historyData: ExpenseHistoryItem[];
}

/**
 * 経費申請履歴表示コンポーネント
 * 履歴テーブルを管理
 */
export const ExpenseHistoryView: React.FC<ExpenseHistoryViewProps> = ({
  historyData,
}) => {
  // 履歴テーブルのカラム設定
  const historyColumns = createExpenseHistoryColumns();

  return (
    <HistoryTable
      data={historyData}
      columns={historyColumns}
      keyField="id"
      emptyMessage="該当する申請履歴がありません"
    />
  );
}; 