import React from 'react';
import { Chip, ChipProps } from '@mui/material';

// カテゴリタイプの型定義
export type CategoryType = 'project' | 'expense' | 'leave';

// プロジェクトカテゴリの型定義
export type ProjectCategory = 'フロントエンド' | 'バックエンド' | 'インフラ' | 'デザイン' | 'PM' | 'その他';

// 経費カテゴリの型定義  
export type ExpenseCategory = 'transport' | 'entertainment' | 'supplies' | 'books' | 'seminar' | 'other';

// 休暇カテゴリの型定義
export type LeaveCategory = 'paid' | 'sick' | 'special' | 'condolence' | 'maternity' | 'childcare' | 'nursing';

interface CategoryChipProps extends Omit<ChipProps, 'label' | 'color'> {
  category: string;
  type: CategoryType;
}

// 経費カテゴリラベルの統一定義
const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transport: '旅費交通費',
  entertainment: '交際費',
  supplies: '備品',
  books: '書籍',
  seminar: 'セミナー',
  other: 'その他',
};

// 休暇カテゴリラベルの統一定義
const LEAVE_CATEGORY_LABELS: Record<LeaveCategory, string> = {
  paid: '有給休暇',
  sick: '病気休暇',
  special: '特別休暇',
  condolence: '慶弔休暇',
  maternity: '産前産後休暇',
  childcare: '育児休暇',
  nursing: '介護休暇',
};

// カテゴリタイプ別の色定義
const CATEGORY_TYPE_COLORS: Record<CategoryType, ChipProps['color']> = {
  project: 'primary',
  expense: 'warning',
  leave: 'info',
};

/**
 * カテゴリ表示名を取得する関数
 */
const getCategoryLabel = (category: string, type: CategoryType): string => {
  switch (type) {
    case 'expense':
      return EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] || category;
    case 'leave':
      return LEAVE_CATEGORY_LABELS[category as LeaveCategory] || category;
    case 'project':
    default:
      return category; // プロジェクトカテゴリはそのまま表示
  }
};

/**
 * 統一されたカテゴリチップコンポーネント
 * 
 * @param category - カテゴリ値
 * @param type - カテゴリタイプ
 * @param props - その他のChipProps
 */
export const CategoryChip: React.FC<CategoryChipProps> = ({
  category,
  type,
  size = 'small',
  ...props
}) => {
  const label = getCategoryLabel(category, type);
  const color = CATEGORY_TYPE_COLORS[type];

  return (
    <Chip
      label={label}
      color={color}
      size={size}
      {...props}
      sx={{
        borderRadius: 1,
        ...props.sx,
      }}
    />
  );
};

export default CategoryChip; 