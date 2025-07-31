import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { HistoryTable, createExpenseHistoryColumns, type HistoryItem } from '@/components/common';
import { useCategories } from '@/hooks/expense/useCategories';
import { IconButton } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

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
  const router = useRouter();
  
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
  
  // 履歴テーブルのカラム設定（アクション列を追加）
  const historyColumns = useMemo(() => {
    const baseColumns = createExpenseHistoryColumns<ExpenseHistoryItem>();
    return [
      ...baseColumns,
      {
        id: 'actions' as keyof ExpenseHistoryItem,
        label: 'アクション',
        align: 'center' as const,
        format: (_: unknown, row: ExpenseHistoryItem) => {
          // 下書き状態の場合のみ編集ボタンを表示
          if (row.status === 'draft') {
            return (
              <IconButton
                size="small"
                onClick={() => router.push(`/expenses/${row.id}/edit`)}
                title="編集"
                aria-label="編集"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            );
          }
          return null;
        },
      },
    ];
  }, [router]);

  return (
    <HistoryTable
      data={transformedData}
      columns={historyColumns}
      keyField="id"
      emptyMessage="該当する申請履歴がありません"
    />
  );
}; 