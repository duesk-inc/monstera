// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Grid,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  ClearAll as ClearIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useCachedAlertSettings } from '@/hooks/admin/useCachedAlertSettings';
import { AlertSettingsForm } from '@/components/features/weeklyReport/AlertSettingsForm';
import { usePermission, Permission } from '@/hooks/common/usePermission';
import { UpdateAlertSettingsRequest } from '@/types/admin/alert';

/**
 * キャッシュ最適化されたアラート設定管理画面
 */
export const AlertSettingsManagement: React.FC = () => {
  const { hasPermission } = usePermission();
  const [showForm, setShowForm] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const {
    // データ
    alertSettings,
    alertSummary,
    alertSettingsStatus,

    // 状態
    isLoading,
    isSummaryLoading,
    isError,
    error,
    isUpdating,
    isCreating,

    // アクション
    updateAlertSettings,
    createAlertSettings,

    // ユーティリティ
    forceRefresh,
    preloadRelatedData,
    clearAlertCache,
    validateSettings,
  } = useCachedAlertSettings();

  // 権限チェック
  if (!hasPermission(Permission.ALERT_SETTINGS_VIEW)) {
    return (
      <Card>
        <CardContent>
          <Typography color="error" align="center">
            アラート設定を表示する権限がありません
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // データロード時の処理
  useEffect(() => {
    if (alertSettings) {
      setLastUpdateTime(new Date(alertSettings.updatedAt));
      // 関連データをプリロード
      preloadRelatedData();
    }
  }, [alertSettings, preloadRelatedData]);

  // 設定保存処理
  const handleSaveSettings = async (data: UpdateAlertSettingsRequest) => {
    try {
      // バリデーション
      const errors = validateSettings(data);
      if (Object.keys(errors).length > 0) {
        throw new Error(Object.values(errors)[0]);
      }

      if (alertSettings) {
        await updateAlertSettings(data);
      } else {
        await createAlertSettings(data);
      }
      
      setShowForm(false);
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Failed to save alert settings:', error);
    }
  };

  // ステータス表示の色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured': return 'success';
      case 'not_configured': return 'warning';
      case 'invalid_config': return 'error';
      default: return 'default';
    }
  };

  // ステータス表示のテキスト
  const getStatusText = (status: string) => {
    switch (status) {
      case 'configured': return '設定済み';
      case 'not_configured': return '未設定';
      case 'invalid_config': return '設定に問題があります';
      default: return '不明';
    }
  };

  // ローディング表示
  if (isLoading) {
    return (
      <Card>
        <CardHeader title="アラート設定" />
        <CardContent>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 2 }} align="center">
            設定を読み込んでいます...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // エラー表示
  if (isError) {
    return (
      <Card>
        <CardHeader 
          title="アラート設定" 
          action={
            <Button
              startIcon={<RefreshIcon />}
              onClick={forceRefresh}
              variant="outlined"
              size="small"
            >
              再試行
            </Button>
          }
        />
        <CardContent>
          <Alert severity="error">
            設定の読み込みに失敗しました: {error?.message}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* メイン設定カード */}
      <Card>
        <CardHeader
          title="アラート設定"
          subheader={lastUpdateTime ? `最終更新: ${lastUpdateTime.toLocaleString()}` : ''}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="関連データをリフレッシュ">
                <IconButton onClick={forceRefresh} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {process.env.NODE_ENV === 'development' && (
                <Tooltip title="キャッシュをクリア（開発用）">
                  <IconButton onClick={clearAlertCache} size="small">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              )}
              {hasPermission(Permission.ALERT_SETTINGS_MANAGE) && (
                <Button
                  startIcon={<SettingsIcon />}
                  onClick={() => setShowForm(!showForm)}
                  variant="contained"
                  size="small"
                >
                  {alertSettings ? '設定を編集' : '設定を作成'}
                </Button>
              )}
            </Box>
          }
        />
        <CardContent>
          {/* 設定状態表示 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              設定状態
            </Typography>
            <Chip
              label={getStatusText(alertSettingsStatus)}
              color={getStatusColor(alertSettingsStatus) as any}
              size="small"
            />
          </Box>

          {/* 現在の設定値表示 */}
          {alertSettings ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  週間労働時間上限
                </Typography>
                <Typography variant="h4" color="primary">
                  {alertSettings.weeklyHoursLimit}時間
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  週間変動上限
                </Typography>
                <Typography variant="h4" color="primary">
                  {alertSettings.weeklyHoursChangeLimit}時間
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  連続休日出勤上限
                </Typography>
                <Typography variant="h4" color="primary">
                  {alertSettings.consecutiveHolidayWorkLimit}日
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  月間残業時間上限
                </Typography>
                <Typography variant="h4" color="primary">
                  {alertSettings.monthlyOvertimeLimit}時間
                </Typography>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">
              アラート設定がまだ作成されていません。「設定を作成」ボタンから設定を開始してください。
            </Alert>
          )}

          {/* 設定フォーム */}
          {showForm && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 3 }} />
              <AlertSettingsForm
                initialData={alertSettings || undefined}
                onSubmit={handleSaveSettings}
                onCancel={() => setShowForm(false)}
                isLoading={isUpdating || isCreating}
                mode={alertSettings ? 'edit' : 'create'}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* アラートサマリーカード */}
      {alertSummary && (
        <Card sx={{ mt: 3 }}>
          <CardHeader
            title="アラートサマリー"
            avatar={<AnalyticsIcon color="primary" />}
          />
          <CardContent>
            {isSummaryLoading ? (
              <LinearProgress />
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    未解決アラート
                  </Typography>
                  <Typography variant="h4" color="error">
                    {alertSummary.unresolved_count || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    今週のアラート
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {alertSummary.weekly_count || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    今月のアラート
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {alertSummary.monthly_count || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    解決率
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {alertSummary.resolution_rate ? `${Math.round(alertSummary.resolution_rate * 100)}%` : '0%'}
                  </Typography>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {/* パフォーマンス情報（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <Card sx={{ mt: 3 }}>
          <CardHeader title="キャッシュ情報（開発用）" />
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              このカードは開発環境でのみ表示されます。
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" display="block">
                最後の取得: {alertSettings?.updatedAt ? new Date(alertSettings.updatedAt).toLocaleTimeString() : '未取得'}
              </Typography>
              <Typography variant="caption" display="block">
                ロード状態: {isLoading ? 'ロード中' : 'ロード完了'}
              </Typography>
              <Typography variant="caption" display="block">
                キャッシュ戦略: 5分間キャッシュ、10分間メモリ保持
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
