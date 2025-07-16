import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { CommonTabPanel, createA11yProps } from '@/components/common';

interface ProfileTabsProps {
  tabIndex: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
}

/**
 * プロフィール用のa11yProps関数を作成
 */
const a11yProps = createA11yProps('profile');

/**
 * プロフィールページのタブコンポーネント
 */
export const ProfileTabs: React.FC<ProfileTabsProps> = ({ tabIndex, onChange }) => {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Tabs 
        value={tabIndex} 
        onChange={onChange} 
        aria-label="profile tabs"
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="基本プロフィール" {...a11yProps(0)} />
        <Tab label="職務経歴" {...a11yProps(1)} />
      </Tabs>
    </Box>
  );
};

/**
 * 共通タブパネルをエクスポート（後方互換性のため）
 */
export const TabPanel = CommonTabPanel; 