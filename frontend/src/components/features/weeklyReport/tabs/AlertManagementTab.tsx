import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import { CommonTabPanel, a11yProps } from '@/components/common';
import { AlertSettingsList } from '../AlertSettingsList';
import { AlertSettingsForm } from '../AlertSettingsForm';
import { AlertHistoryList } from '../AlertHistoryList';
import { useAlertSettings } from '@/hooks/admin/useAlertSettings';
import { AlertSettings, CreateAlertSettingsRequest } from '@/types/admin/alert';
import { usePermission, Permission } from '@/hooks/common/usePermission';

type AlertManagementMode = 'list' | 'create' | 'edit';

export const AlertManagementTab: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [mode, setMode] = useState<AlertManagementMode>('list');
  const [editingSettings, setEditingSettings] = useState<AlertSettings | null>(null);

  const { createAlertSettings, updateAlertSettings, isCreating, isUpdating } = useAlertSettings();
  const { hasPermission } = usePermission();
  
  // 権限チェック - アラート設定を閲覧する権限がない場合
  if (!hasPermission(Permission.ALERT_SETTINGS_VIEW)) {
    return (
      <Card>
        <CardContent>
          <Typography color="error" align="center">
            アラート管理を閲覧する権限がありません
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // 管理権限がない場合のアラート履歴タブのインデックス調整
    const historyTabIndex = hasPermission(Permission.ALERT_SETTINGS_MANAGE) ? 2 : 1;
    
    if (newValue === 0 || newValue === historyTabIndex) { // 設定一覧またはアラート履歴タブの場合
      setMode('list');
      setEditingSettings(null);
    }
  };

  const handleCreate = () => {
    // 管理権限のチェック
    if (!hasPermission(Permission.ALERT_SETTINGS_MANAGE)) {
      return;
    }
    setMode('create');
    setEditingSettings(null);
    setTabValue(1);
  };

  const handleEdit = (alertSettings: AlertSettings) => {
    // 管理権限のチェック
    if (!hasPermission(Permission.ALERT_SETTINGS_MANAGE)) {
      return;
    }
    setMode('edit');
    setEditingSettings(alertSettings);
    setTabValue(1);
  };

  const handleFormSubmit = async (data: CreateAlertSettingsRequest) => {
    if (mode === 'create') {
      await createAlertSettings(data);
      setMode('list');
      setTabValue(0);
    } else if (mode === 'edit' && editingSettings) {
      await updateAlertSettings({
        id: editingSettings.id,
        data,
      });
      setMode('list');
      setEditingSettings(null);
      setTabValue(0);
    }
  };

  const handleCancel = () => {
    setMode('list');
    setEditingSettings(null);
    setTabValue(0);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="アラート管理タブ"
        >
          <Tab label="設定一覧" {...a11yProps(0)} />
          {hasPermission(Permission.ALERT_SETTINGS_MANAGE) && (
            <Tab 
              label={
                mode === 'create' 
                  ? '新規作成' 
                  : mode === 'edit' 
                  ? '編集' 
                  : '設定'
              } 
              {...a11yProps(1)} 
              disabled={mode === 'list'}
            />
          )}
          <Tab 
            label="アラート履歴" 
            {...a11yProps(hasPermission(Permission.ALERT_SETTINGS_MANAGE) ? 2 : 1)} 
          />
        </Tabs>
      </Box>

      <CommonTabPanel value={tabValue} index={0}>
        <AlertSettingsList
          onEdit={handleEdit}
          onCreate={handleCreate}
        />
      </CommonTabPanel>

      {hasPermission(Permission.ALERT_SETTINGS_MANAGE) && (
        <CommonTabPanel value={tabValue} index={1}>
          <AlertSettingsForm
            initialData={editingSettings || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            isLoading={isCreating || isUpdating}
            mode={mode === 'create' ? 'create' : 'edit'}
          />
        </CommonTabPanel>
      )}

      <CommonTabPanel 
        value={tabValue} 
        index={hasPermission(Permission.ALERT_SETTINGS_MANAGE) ? 2 : 1}
      >
        <AlertHistoryList />
      </CommonTabPanel>
    </Box>
  );
};