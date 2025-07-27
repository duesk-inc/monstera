import React, { useMemo } from 'react';
import { HistoryTable, createExpenseHistoryColumns, type HistoryItem } from '@/components/common';
import { useCategories } from '@/hooks/expense/useCategories';

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
  // カテゴリ情報を取得
  const { categories } = useCategories();
  
  // カテゴリコードから名前へのマッピングを作成
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(cat => {
      map[cat.code] = cat.name;
    });
    return map;
  }, [categories]);
  
  // カテゴリコードを名前に変換したデータを作成
  const transformedData = useMemo(() => {
    return historyData.map(item => ({
      ...item,
      category: categoryMap[item.category] || item.category, // マッピングがない場合はコードをそのまま表示
    }));
  }, [historyData, categoryMap]);
  
  // 履歴テーブルのカラム設定
  const historyColumns = createExpenseHistoryColumns();

  return (
    <HistoryTable
      data={transformedData}
      columns={historyColumns}
      keyField="id"
      emptyMessage="該当する申請履歴がありません"
    />
  );
}; 