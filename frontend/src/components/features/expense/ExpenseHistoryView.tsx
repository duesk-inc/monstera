import React from 'react';
import {
  Box,
} from '@mui/material';
import { FormRadioGroup, HistoryTable, createExpenseHistoryColumns, type HistoryItem } from '@/components/common';

// 年度オプション
const FISCAL_YEARS = [
  { value: '2023', label: '2023年度' },
  { value: '2022', label: '2022年度' },
  { value: '2021', label: '2021年度' },
];

// 経費申請履歴項目の型定義 (HistoryItemを拡張)
interface ExpenseHistoryItem extends HistoryItem {
  category: string;
  amount: number;
  processedAt?: Date | string | null;
  rejectionReason?: string;
}

interface ExpenseHistoryViewProps {
  fiscalYear: string;
  onFiscalYearChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  historyData: ExpenseHistoryItem[];
}

/**
 * 経費申請履歴表示コンポーネント
 * 年度フィルター、履歴テーブルを管理
 */
export const ExpenseHistoryView: React.FC<ExpenseHistoryViewProps> = ({
  fiscalYear,
  onFiscalYearChange,
  historyData,
}) => {
  // 履歴テーブルのカラム設定
  const historyColumns = createExpenseHistoryColumns();

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <FormRadioGroup
          name="fiscalYear"
          value={fiscalYear}
          onChange={onFiscalYearChange}
          label="年度"
          options={FISCAL_YEARS}
          direction="row"
        />
      </Box>
      
      <HistoryTable
        data={historyData}
        columns={historyColumns}
        keyField="id"
        emptyMessage="該当する申請履歴がありません"
      />
    </>
  );
}; 