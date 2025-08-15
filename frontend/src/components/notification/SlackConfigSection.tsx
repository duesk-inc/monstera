'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Science as TestIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useToast } from '@/components/common';
import { SlackSettings } from '@/types/notification';
import { getSlackSettings, updateSlackSettings, testSlackConnection } from '@/lib/api/notification';

interface SlackConfigSectionProps {
  onSettingsChange?: (settings: SlackSettings) => void;
}

interface TestResult {
  success: boolean;
  message: string;
  timestamp: Date;
}

export default function SlackConfigSection({ onSettingsChange }: SlackConfigSectionProps) {
  const { showSuccess, showError, showInfo } = useToast();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);
  
  const [settings, setSettings] = useState<SlackSettings>({
    webhookUrl: '',
    defaultChannel: '',
    enabled: false,
  });
  
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // 初期設定の取得
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getSlackSettings();
      setSettings(data);
      onSettingsChange?.(data);
    } catch (error) {
      console.error('Slack設定の取得に失敗しました', error);
      showError('Slack設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsUpdate = async () => {
    try {
      setUpdating(true);
      const updatedSettings = await updateSlackSettings(settings);
      setSettings(updatedSettings);
      onSettingsChange?.(updatedSettings);
      showSuccess('Slack設定を更新しました');
    } catch (error) {
      console.error('Slack設定の更新に失敗しました', error);
      showError('Slack設定の更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.webhookUrl.trim()) {
      showError('WebhookURLを入力してください');
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      
      const result = await testSlackConnection(settings.webhookUrl);
      
      const testResult: TestResult = {
        success: result.success,
        message: result.message,
        timestamp: new Date(),
      };
      
      setTestResult(testResult);
      
      if (result.success) {
        showSuccess('Slack接続テストが成功しました');
      } else {
        showError(`Slack接続テストが失敗しました: ${result.message}`);
      }
    } catch (error) {
      console.error('Slack接続テストに失敗しました', error);
      const testResult: TestResult = {
        success: false,
        message: 'ネットワークエラーまたはサーバーエラーが発生しました',
        timestamp: new Date(),
      };
      setTestResult(testResult);
      showError('Slack接続テストに失敗しました');
    } finally {
      setTesting(false);
    }
  };

  const handleFieldChange = (field: keyof SlackSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
    // テスト結果をクリア（設定が変更された場合）
    if (field === 'webhookUrl') {
      setTestResult(null);
    }
  };

  const getStatusChip = () => {
    if (!settings.enabled) {
      return <Chip label="無効" color="default" size="small" />;
    }
    
    if (!settings.webhookUrl) {
      return <Chip label="未設定" color="warning" size="small" />;
    }
    
    if (testResult) {
      return testResult.success ? 
        <Chip label="接続確認済み" color="success" size="small" icon={<CheckCircleIcon />} /> :
        <Chip label="接続エラー" color="error" size="small" icon={<ErrorIcon />} />;
    }
    
    return <Chip label="未テスト" color="info" size="small" icon={<InfoIcon />} />;
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Slack設定を読み込み中...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Slack連携設定
        </Typography>
        {getStatusChip()}
      </Box>

      <Typography variant="body2" color="text.secondary" paragraph>
        Slackワークスペースと連携して、重要な通知をSlackチャンネルで受信できます。
      </Typography>

      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.enabled}
              onChange={(e) => handleFieldChange('enabled', e.target.checked)}
            />
          }
          label="Slack通知を有効にする"
        />
      </Box>

      {settings.enabled && (
        <Box sx={{ space: 2 }}>
          <TextField
            fullWidth
            label="Webhook URL"
            value={settings.webhookUrl || ''}
            onChange={(e) => handleFieldChange('webhookUrl', e.target.value)}
            type={showWebhookUrl ? 'text' : 'password'}
            placeholder="https://hooks.slack.com/services/..."
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                    edge="end"
                  >
                    {showWebhookUrl ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText="SlackアプリのIncoming WebhookのURLを入力してください"
          />

          <TextField
            fullWidth
            label="デフォルトチャンネル"
            value={settings.defaultChannel || ''}
            onChange={(e) => handleFieldChange('defaultChannel', e.target.value)}
            placeholder="#general"
            sx={{ mb: 2 }}
            helperText="通知を送信するデフォルトのチャンネル名（#は自動で追加されます）"
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={testing ? <CircularProgress size={16} /> : <TestIcon />}
              onClick={handleTestConnection}
              disabled={!settings.webhookUrl.trim() || testing}
            >
              {testing ? '接続テスト中...' : '接続テスト'}
            </Button>
            
            <Button
              variant="contained"
              onClick={handleSettingsUpdate}
              disabled={updating}
              startIcon={updating ? <CircularProgress size={16} /> : undefined}
            >
              {updating ? '保存中...' : '設定を保存'}
            </Button>
          </Box>

          {testResult && (
            <Alert 
              severity={testResult.success ? 'success' : 'error'}
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                <strong>{testResult.success ? '接続成功' : '接続失敗'}:</strong> {testResult.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                テスト実行時刻: {testResult.timestamp.toLocaleString()}
              </Typography>
            </Alert>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Slack連携の設定方法:</strong>
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              1. Slackワークスペースで新しいアプリを作成<br />
              2. Incoming Webhookを有効にする<br />
              3. 通知を送信したいチャンネルを選択<br />
              4. 生成されたWebhook URLをここに貼り付け<br />
              5. 接続テストを実行して設定を確認
            </Typography>
          </Alert>
        </Box>
      )}
    </Paper>
  );
}