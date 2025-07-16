'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import { CalendarMonth, Assessment } from '@mui/icons-material';
import LeaveRequestList from '@/components/admin/leave/LeaveRequestList';
import LeaveStatistics from '@/components/admin/leave/LeaveStatistics';

export default function AdminLeavePage() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        休暇申請管理
      </Typography>

      <Card>
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
          >
            <Tab
              icon={<CalendarMonth />}
              label="申請一覧"
              iconPosition="start"
            />
            <Tab
              icon={<Assessment />}
              label="統計情報"
              iconPosition="start"
            />
          </Tabs>

          {activeTab === 0 && <LeaveRequestList />}
          {activeTab === 1 && <LeaveStatistics />}
        </CardContent>
      </Card>
    </Box>
  );
}