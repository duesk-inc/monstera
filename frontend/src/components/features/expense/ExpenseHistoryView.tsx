import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { HistoryTable, createExpenseHistoryColumns, type HistoryItem } from '@/components/common';
import { useCategories } from '@/hooks/expense/useCategories';
import { IconButton, useTheme, useMediaQuery } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

// 経費申請履歴項目の型定義 (HistoryItemを拡張)
interface ExpenseHistoryItem extends HistoryItem {
  category: string;
  amount: number;
  processedAt?: Date | string | null;
  rejectionReason?: string;
  title?: string;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
        label: isMobile ? '編集' : 'アクション',
        align: 'center' as const,
        minWidth: isMobile ? 60 : undefined,
        format: (_: unknown, row: ExpenseHistoryItem) => {
          // 下書き状態の場合のみ編集ボタンを表示
          if (row.status === 'draft') {
            return (
              <IconButton
                size={isMobile ? "medium" : "small"}
                onClick={() => router.push(`/expenses/${row.id}/edit`)}
                title={`${row.title || '経費申請'}を編集`}
                aria-label={`${row.title || '経費申請'}を編集`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/expenses/${row.id}/edit`);
                  }
                }}
                sx={{
                  transition: 'all 0.2s',
                  // モバイルの場合はタッチターゲットを大きくする
                  ...(isMobile && {
                    minWidth: 48,
                    minHeight: 48,
                  }),
                  '&:hover': {
                    transform: 'scale(1.1)',
                    color: 'primary.main',
                  },
                  // キーボードフォーカス時の視覚的フィードバック
                  '&:focus': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                  // タッチデバイスでのフィードバック
                  '@media (hover: none)': {
                    '&:active': {
                      transform: 'scale(0.95)',
                      backgroundColor: 'action.selected',
                    },
                  },
                }}
              >
                <EditIcon fontSize={isMobile ? "medium" : "small"} />
              </IconButton>
            );
          }
          return null;
        },
      },
    ];
  }, [router, isMobile]);

  // 編集可能行の視覚的フィードバック
  const getRowStyles = (row: ExpenseHistoryItem) => ({
    // 下書き状態の行を視覚的に区別
    ...(row.status === 'draft' && {
      backgroundColor: 'primary.50',
      '&:hover': {
        backgroundColor: 'primary.100',
      },
    }),
  });

  const getRowClassName = (row: ExpenseHistoryItem) => {
    return row.status === 'draft' ? 'editable-row' : '';
  };

  // アクセシビリティ用のaria-label生成
  const getRowAriaLabel = (row: ExpenseHistoryItem) => {
    if (row.status === 'draft') {
      return `編集可能な経費申請: ${row.title || 'タイトルなし'}, 金額: ${row.amount}円, カテゴリ: ${categoryMap[row.category] || row.category}`;
    }
    return undefined;
  };

  return (
    <HistoryTable
      data={transformedData}
      columns={historyColumns}
      keyField="id"
      emptyMessage="該当する申請履歴がありません"
      getRowStyles={getRowStyles}
      getRowClassName={getRowClassName}
    />
  );
}; 