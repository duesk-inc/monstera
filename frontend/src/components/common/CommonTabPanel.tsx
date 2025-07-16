import React from 'react';
import { Box } from '@mui/material';

/**
 * 共通タブパネルコンポーネントのプロパティ
 */
export interface CommonTabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  prefix?: string; // タブのプレフィックス（デフォルト: 'common'）
  padding?: number; // パディング値（デフォルト: 3）
}

/**
 * 共通タブパネルコンポーネント
 * 全ページで統一されたタブパネル実装を提供
 */
export const CommonTabPanel: React.FC<CommonTabPanelProps> = ({ 
  children, 
  value, 
  index, 
  prefix = 'common',
  padding = 3,
  ...other 
}) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`${prefix}-tabpanel-${index}`}
      aria-labelledby={`${prefix}-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: padding }}>
          {children}
        </Box>
      )}
    </div>
  );
};

/**
 * タブのアクセシビリティ属性を生成する関数を作成
 * @param prefix タブのプレフィックス
 * @returns アクセシビリティ属性を返す関数
 */
export const createA11yProps = (prefix: string) => {
  return (index: number) => {
    return {
      id: `${prefix}-tab-${index}`,
      'aria-controls': `${prefix}-tabpanel-${index}`,
    };
  };
};

/**
 * デフォルトのa11yProps関数（後方互換性のため）
 */
export const a11yProps = createA11yProps('common'); 