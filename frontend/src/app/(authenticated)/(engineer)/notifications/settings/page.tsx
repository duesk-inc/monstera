'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { TypeChip, SectionLoader, ErrorAlert } from '@/components/common';
import { useToast } from '@/components/common';
import { 
  NotificationType, 
  NotificationSetting, 
  UpdateNotificationSettingRequest,
  NotificationCondition,
  SlackSettings 
} from '@/types/notification';
import { 
  getNotificationSettings, 
  updateNotificationSetting, 
  updateBasicNotificationSetting 
} from '@/lib/api/notification';
import { getNotificationIcon, getNotificationTypeName, getNotificationTypeColor } from '@/utils/notificationUtils';
import { SUCCESS_MESSAGES } from '@/constants/errorMessages';
import SlackConfigSection from '@/components/notification/SlackConfigSection';
import NotificationConditionsSection from '@/components/notification/NotificationConditionsSection';

export default function NotificationSettingsPage() {
  // 統一Toastシステムを使用
  const { showSuccess, showError } = useToast();
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [slackSettings, setSlackSettings] = useState<SlackSettings | null>(null);
  const [expandedSetting, setExpandedSetting] = useState<string | null>(null);

  // 設定を取得する
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getNotificationSettings();
      setSettings(response.settings || []);
    } catch (error) {
      console.error('設定の取得に失敗しました', error);
      const errorMessage = '通知設定の取得に失敗しました';
      setError(errorMessage);
      showError(errorMessage, {
        title: '取得エラー',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  // 初期データ取得
  useEffect(() => {
    fetchSettings();
  }, []);

  // 基本設定の更新
  const handleBasicSettingUpdate = async (
    setting: NotificationSetting,
    field: 'isEnabled' | 'emailEnabled' | 'slackEnabled',
    value: boolean
  ) => {
    try {
      setLoading(true);
      setError(null);

      // APIで設定を更新（後方互換性のために基本設定用の関数を使用）
      const updatedSetting = await updateBasicNotificationSetting(
        setting.notificationType,
        field === 'isEnabled' ? value : setting.isEnabled,
        field === 'emailEnabled' ? value : setting.emailEnabled
      );

      // 状態を更新
      setSettings(prev => 
        prev.map(s => 
          s.notificationType === setting.notificationType ? updatedSetting : s
        )
      );

      // 統一Toastシステムで成功メッセージを表示
      showSuccess(SUCCESS_MESSAGES.NOTIFICATION_SETTINGS_UPDATED, {
        title: '設定更新完了',
        duration: 3000
      });
    } catch (error) {
      console.error('設定の更新に失敗しました', error);
      const errorMessage = '設定の更新に失敗しました';
      setError(errorMessage);
      showError(errorMessage, {
        title: '更新エラー',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  // 拡張設定の更新
  const handleAdvancedSettingUpdate = async (
    setting: NotificationSetting,
    updates: Partial<UpdateNotificationSettingRequest>
  ) => {
    try {
      setLoading(true);
      setError(null);

      const request: UpdateNotificationSettingRequest = {
        notification_type: setting.notificationType,
        is_enabled: setting.isEnabled,
        email_enabled: setting.emailEnabled,
        slack_enabled: setting.slackEnabled || false,
        slack_channel: setting.slackChannel,
        conditions: setting.conditions?.map(c => ({
          condition_type: c.conditionType,
          operator: c.operator,
          value: c.value,
          is_enabled: c.isEnabled,
        })),
        ...updates,
      };

      const updatedSetting = await updateNotificationSetting(request);

      // 状態を更新
      setSettings(prev => 
        prev.map(s => 
          s.notificationType === setting.notificationType ? updatedSetting : s
        )
      );

      showSuccess('詳細設定を更新しました', {
        title: '設定更新完了',
        duration: 3000
      });
    } catch (error) {
      console.error('詳細設定の更新に失敗しました', error);
      const errorMessage = '詳細設定の更新に失敗しました';
      setError(errorMessage);
      showError(errorMessage, {
        title: '更新エラー',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  // 通知条件の更新
  const handleConditionsUpdate = (setting: NotificationSetting, conditions: NotificationCondition[]) => {
    handleAdvancedSettingUpdate(setting, {
      conditions: conditions.map(c => ({
        condition_type: c.conditionType,
        operator: c.operator,
        value: c.value,
        is_enabled: c.isEnabled,
      })),
    });
  };

  // Slack設定の変更ハンドラー
  const handleSlackSettingsChange = (newSettings: SlackSettings) => {
    setSlackSettings(newSettings);
  };

  // アコーディオンの展開状態管理
  const handleAccordionChange = (settingId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSetting(isExpanded ? settingId : null);
  };
  
  // 通知タイプの説明を取得
  const getNotificationTypeDescription = (type: NotificationType): string => {
    switch (type) {
      case 'leave':
        return '休暇申請に関する通知';
      case 'expense':
        return '経費精算や申請に関する通知';
      case 'weekly':
        return '週報の提出期限や承認に関する通知';
      case 'weekly_report_reminder':
        return '週報提出のリマインダー通知';
      case 'weekly_report_submitted':
        return '週報提出完了の通知';
      case 'weekly_report_overdue':
        return '週報提出期限超過の通知';
      case 'weekly_report_escalation':
        return '週報未提出のエスカレーション通知';
      case 'project':
        return 'プロジェクトの更新や変更に関する通知';
      case 'system':
        return 'システムメンテナンスやお知らせに関する通知';
      case 'system_maintenance':
        return 'システムメンテナンスの通知';
      case 'alert_triggered':
        return 'アラート検知時の通知';
      case 'export_complete':
        return 'エクスポート完了の通知';
      case 'export_failed':
        return 'エクスポート失敗の通知';
      case 'bulk_reminder_complete':
        return '一括リマインダー送信完了の通知';
      case 'bulk_reminder_failed':
        return '一括リマインダー送信失敗の通知';
      default:
        return '';
    }
  };

  // 高度な設定が利用可能な通知タイプかチェック
  const supportsAdvancedSettings = (type: NotificationType): boolean => {
    return [
      'weekly_report_reminder',
      'weekly_report_overdue', 
      'weekly_report_escalation',
      'alert_triggered',
      'system_maintenance'
    ].includes(type);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          component={Link} 
          href="/notifications" 
          sx={{ mr: 2 }}
          aria-label="戻る"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          通知設定
        </Typography>
      </Box>

      {/* 統一ErrorAlertシステムでエラー表示 */}
      {error && (
        <ErrorAlert
          message={error}
          title="エラーが発生しました"
          retryAction={fetchSettings}
          onClose={() => setError(null)}
          sx={{ mb: 3 }}
        />
      )}

      {/* タブナビゲーション */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<NotificationsIcon />} 
            label="基本設定" 
            iconPosition="start"
          />
          <Tab 
            icon={<SettingsIcon />} 
            label="詳細設定" 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {loading ? (
        <SectionLoader message="設定を読み込み中..." size="large" padding={5} />
      ) : (
        <Box>
          {/* 基本設定タブ */}
          {currentTab === 0 && (
            <Paper sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderRadius: 2, mb: 4 }}>
              <Box sx={{ p: 3, pb: 1 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  基本通知設定
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  受け取りたい通知を設定できます。通知をオフにすると、システム内のお知らせやメールが送信されなくなります。
                </Typography>
              </Box>

              <List>
                {settings.map((setting, index) => (
                  <React.Fragment key={setting.id}>
                    <ListItem sx={{ py: 2.5 }}>
                      <ListItemIcon sx={{ 
                        color: getNotificationTypeColor(setting.notificationType),
                      }}>
                        {getNotificationIcon(setting.notificationType)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TypeChip 
                              type={setting.notificationType}
                              size="small"
                              showIcon={true}
                            />
                            <Typography variant="body1" fontWeight="medium">
                              {getNotificationTypeName(setting.notificationType)}
                            </Typography>
                          </Box>
                        }
                        secondary={getNotificationTypeDescription(setting.notificationType)}
                      />
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 1, minWidth: 120 }}>
                            アプリ内通知:
                          </Typography>
                          <Switch
                            edge="end"
                            checked={setting.isEnabled}
                            onChange={(e) => handleBasicSettingUpdate(setting, 'isEnabled', e.target.checked)}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 1, minWidth: 120 }}>
                            メール通知:
                          </Typography>
                          <Switch
                            edge="end"
                            checked={setting.emailEnabled}
                            onChange={(e) => handleBasicSettingUpdate(setting, 'emailEnabled', e.target.checked)}
                            disabled={!setting.isEnabled}
                          />
                        </Box>
                        {slackSettings?.enabled && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mr: 1, minWidth: 120 }}>
                              Slack通知:
                            </Typography>
                            <Switch
                              edge="end"
                              checked={setting.slackEnabled || false}
                              onChange={(e) => handleBasicSettingUpdate(setting, 'slackEnabled', e.target.checked)}
                              disabled={!setting.isEnabled}
                            />
                          </Box>
                        )}
                      </Box>
                    </ListItem>
                    {index < settings.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}

          {/* 詳細設定タブ */}
          {currentTab === 1 && (
            <Box>
              {/* Slack連携設定 */}
              <SlackConfigSection onSettingsChange={handleSlackSettingsChange} />
              
              {/* 通知別詳細設定 */}
              <Paper sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderRadius: 2, mb: 4 }}>
                <Box sx={{ p: 3, pb: 1 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    通知別詳細設定
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    各通知タイプごとに詳細な条件設定やチャンネル設定を行えます。
                  </Typography>
                </Box>

                <Box sx={{ p: 3, pt: 0 }}>
                  {settings
                    .filter(setting => supportsAdvancedSettings(setting.notificationType))
                    .map((setting) => (
                      <Accordion 
                        key={setting.id}
                        expanded={expandedSetting === setting.id}
                        onChange={handleAccordionChange(setting.id)}
                        sx={{ mb: 2 }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          aria-controls={`${setting.id}-content`}
                          id={`${setting.id}-header`}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Box sx={{ color: getNotificationTypeColor(setting.notificationType) }}>
                              {getNotificationIcon(setting.notificationType)}
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle1" fontWeight="medium">
                                {getNotificationTypeName(setting.notificationType)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {getNotificationTypeDescription(setting.notificationType)}
                              </Typography>
                            </Box>
                            <TypeChip 
                              type={setting.notificationType}
                              size="small"
                              showIcon={false}
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <NotificationConditionsSection
                            notificationType={setting.notificationType}
                            conditions={setting.conditions || []}
                            onChange={(conditions) => handleConditionsUpdate(setting, conditions)}
                          />
                        </AccordionDetails>
                      </Accordion>
                    ))
                  }
                </Box>
              </Paper>
            </Box>
          )}
        </Box>
      )}

      <Paper sx={{ p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          通知に関するFAQ
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Q: 通知を全てオフにしても大丈夫ですか？
          </Typography>
          <Typography variant="body2" paragraph>
            A: 通知をオフにしても、システム内の重要な情報やタスクは通常通り表示されます。ただし、期限の近いタスクや重要なお知らせなどの通知が届かなくなるため、定期的にシステムをご確認いただくことをお勧めします。
          </Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Q: メール通知の頻度はどのくらいですか？
          </Typography>
          <Typography variant="body2" paragraph>
            A: メール通知は通知内容の重要度に応じて送信されます。通常は発生時にリアルタイムで送信されますが、一部の通知は一日一回まとめて送信される場合があります。通知量が多い場合は、アプリ内通知のみを有効にすることも検討してください。
          </Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Q: Slack通知はどのように設定しますか？
          </Typography>
          <Typography variant="body2" paragraph>
            A: 詳細設定タブからSlack連携設定を行ってください。SlackワークスペースでIncoming Webhookを作成し、WebhookURLを設定することで、重要な通知をSlackで受信できます。設定後は接続テストを実行して動作を確認してください。
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            Q: 通知条件設定とは何ですか？
          </Typography>
          <Typography variant="body2">
            A: 通知条件設定では、特定の条件（時刻、曜日、緊急度など）に基づいて通知の送信を制御できます。例えば、平日の業務時間内のみ通知を受信したり、特定の緊急度以上のアラートのみを受信するといった設定が可能です。
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
} 