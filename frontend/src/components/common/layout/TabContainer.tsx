'use client';

import React from 'react';
import { Paper, Box, Tabs, Tab, SxProps, Theme } from '@mui/material';

export interface TabItem {
  /** タブのラベル */
  label: React.ReactNode;
  /** タブの値 */
  value: string | number;
  /** タブが無効かどうか */
  disabled?: boolean;
}

export interface TabContainerProps {
  /** タブアイテムの配列 */
  tabs: TabItem[];
  /** 現在選択されているタブの値 */
  value: string | number;
  /** タブ変更時のハンドラー */
  onChange: (event: React.SyntheticEvent, newValue: string | number) => void;
  /** タブコンテンツ */
  children: React.ReactNode;
  /** タブヘッダーの右側に表示する要素 */
  headerActions?: React.ReactNode;
  /** カードのバリアント */
  variant?: 'default' | 'elevated' | 'outlined';
  /** 追加のスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}

/**
 * タブ付きコンテナコンポーネント
 * 統一されたタブレイアウトとスタイリングを提供
 * 
 * @param tabs - タブアイテムの配列
 * @param value - 現在選択されているタブの値
 * @param onChange - タブ変更時のハンドラー
 * @param children - タブコンテンツ
 * @param headerActions - タブヘッダーの右側に表示する要素
 * @param variant - カードのバリアント（デフォルト: 'elevated'）
 * @param sx - 追加のスタイル
 * @param data-testid - テストID
 */
export const TabContainer: React.FC<TabContainerProps> = ({
  tabs,
  value,
  onChange,
  children,
  headerActions,
  variant = 'elevated',
  sx,
  'data-testid': testId,
}) => {
  // バリアントに応じたスタイル
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          boxShadow: 'none',
          borderRadius: '12px',
          border: '1px solid rgba(0, 0, 0, 0.08)',
        };
      case 'outlined':
        return {
          boxShadow: 'none',
          borderRadius: '12px',
          border: '1px solid rgba(0, 0, 0, 0.08)',
        };
      case 'default':
      default:
        return {
          boxShadow: 'none',
          borderRadius: '12px',
          border: '1px solid rgba(0, 0, 0, 0.08)',
        };
    }
  };

  return (
    <Paper
      sx={{
        mb: 3,
        ...getVariantStyles(),
        ...sx,
      }}
      data-testid={testId}
    >
      {/* タブヘッダー */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 48,
        }}
      >
        <Tabs value={value} onChange={onChange} aria-label="tab container">
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              label={tab.label}
              value={tab.value}
              disabled={tab.disabled}
            />
          ))}
        </Tabs>
        
        {headerActions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {headerActions}
          </Box>
        )}
      </Box>

      {/* タブコンテンツ */}
      <Box>
        {children}
      </Box>
    </Paper>
  );
};

export default TabContainer; 