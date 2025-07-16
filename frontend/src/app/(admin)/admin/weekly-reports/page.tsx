'use client';

import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { PageContainer } from '@/components/common/layout';
import { CommonTabPanel, a11yProps } from '@/components/common';
import { WeeklyReportListTab } from '@/components/features/weeklyReport/tabs/WeeklyReportListTab';
import { UnsubmittedManagementTab } from '@/components/features/weeklyReport/tabs/UnsubmittedManagementTab';
import { MonthlyReportTab } from '@/components/features/weeklyReport/tabs/MonthlyReportTab';
import { AlertManagementTab } from '@/components/features/weeklyReport/tabs/AlertManagementTab';

export default function WeeklyReportsPage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <PageContainer 
      title="週報管理"
      maxWidth="xl"
      data-testid="weekly-reports-page"
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="週報管理タブ"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="週報一覧" {...a11yProps(0)} />
          <Tab label="未提出者管理" {...a11yProps(1)} />
          <Tab label="月次レポート" {...a11yProps(2)} />
          <Tab label="アラート管理" {...a11yProps(3)} />
        </Tabs>
      </Box>

      <CommonTabPanel value={tabValue} index={0}>
        <WeeklyReportListTab />
      </CommonTabPanel>

      <CommonTabPanel value={tabValue} index={1}>
        <UnsubmittedManagementTab />
      </CommonTabPanel>

      <CommonTabPanel value={tabValue} index={2}>
        <MonthlyReportTab />
      </CommonTabPanel>

      <CommonTabPanel value={tabValue} index={3}>
        <AlertManagementTab />
      </CommonTabPanel>
    </PageContainer>
  );
}