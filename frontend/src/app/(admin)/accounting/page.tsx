// 請求管理ダッシュボード画面

"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Alert,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Receipt,
  GroupAdd,
  Schedule,
  Sync,
  Add,
  Refresh,
  Settings,
  Dashboard,
  Assessment,
  TrendingUp,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import {
  KPICard,
  KPICardGroup,
} from "../../../components/features/accounting/KPICard";
import {
  BillingChart,
  MonthlyTrendChart,
  ClientRankingChart,
} from "../../../components/features/accounting/BillingChart";
import { ActivityTimeline } from "../../../components/features/accounting/ActivityTimeline";
import { ProjectGroupDialog } from "../../../components/features/accounting/ProjectGroupDialog";
import { ScheduleDialog } from "../../../components/features/accounting/ScheduleDialog";
import { MonthPicker } from "../../../components/features/accounting/MonthPicker";
import { useAccountingSummary } from "@/hooks/useAccountingSummary";
import { useAccountingErrorHandler } from "@/hooks/useAccountingErrorHandler";
import { accountingApi } from "@/api/accountingApi";
import { formatCurrency, formatDate } from "../../../utils/format";
import {
  BILLING_STATUS,
  FREE_CONNECTION_STATUS,
} from "../../../constants/accounting";

// ========== 型定義 ==========

interface DashboardState {
  selectedMonth: string;
  showProjectGroupDialog: boolean;
  showScheduleDialog: boolean;
  refreshing: boolean;
}

// ========== メインコンポーネント ==========

export default function AccountingDashboard() {
  const theme = useTheme();
  const { handleSubmissionError } = useAccountingErrorHandler();

  // 状態管理
  const [state, setState] = useState<DashboardState>({
    selectedMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
    showProjectGroupDialog: false,
    showScheduleDialog: false,
    refreshing: false,
  });

  // データ取得
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useAccountingSummary();

  const {
    data: monthlyTrend,
    isLoading: trendLoading,
    error: trendError,
  } = useQuery({
    queryKey: ["accounting", "monthly-trend"],
    queryFn: () => accountingApi.getMonthlyTrend(),
  });

  const {
    data: clientRanking,
    isLoading: rankingLoading,
    error: rankingError,
  } = useQuery({
    queryKey: ["accounting", "client-ranking"],
    queryFn: () => accountingApi.getClientRanking(),
  });

  const {
    data: activities,
    isLoading: activitiesLoading,
    error: activitiesError,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: ["accounting", "activities"],
    queryFn: () => accountingApi.getRecentActivities(),
  });

  const {
    data: upcomingSchedules,
    isLoading: schedulesLoading,
    error: schedulesError,
  } = useQuery({
    queryKey: ["accounting", "upcoming-schedules"],
    queryFn: () => accountingApi.getUpcomingSchedules(),
  });

  // データ準備
  const kpiData = useMemo(() => {
    if (!summary) return null;

    return {
      totalBilling: {
        value: summary.totalBillingAmount,
        previousValue: summary.previousMonthBilling || 0,
        unit: "currency" as const,
      },
      totalClients: {
        value: summary.totalClients,
        previousValue: summary.previousMonthClients || 0,
        unit: "count" as const,
      },
      completedBillings: {
        value: summary.completedBillings,
        previousValue: summary.previousMonthCompleted || 0,
        unit: "count" as const,
      },
      pendingBillings: {
        value: summary.pendingBillings,
        previousValue: summary.previousMonthPending || 0,
        unit: "count" as const,
      },
    };
  }, [summary]);

  // freee接続ステータス
  const freeeStatus =
    summary?.freeeConnectionStatus || FREE_CONNECTION_STATUS.DISCONNECTED;
  const isFreeeConnected = freeeStatus === FREE_CONNECTION_STATUS.CONNECTED;

  // イベントハンドラー
  const handleRefresh = async () => {
    setState((prev) => ({ ...prev, refreshing: true }));
    try {
      await Promise.all([refetchSummary(), refetchActivities()]);
    } catch (error) {
      handleSubmissionError(error, "データ更新");
    } finally {
      setState((prev) => ({ ...prev, refreshing: false }));
    }
  };

  const handleMonthChange = (month: string) => {
    setState((prev) => ({ ...prev, selectedMonth: month }));
  };

  const handleCreateProjectGroup = () => {
    setState((prev) => ({ ...prev, showProjectGroupDialog: true }));
  };

  const handleCreateSchedule = () => {
    setState((prev) => ({ ...prev, showScheduleDialog: true }));
  };

  const handleProjectGroupSave = async (data: any) => {
    try {
      await accountingApi.createProjectGroup(data);
      setState((prev) => ({ ...prev, showProjectGroupDialog: false }));
      refetchSummary();
    } catch (error) {
      handleSubmissionError(error, "プロジェクトグループ作成");
    }
  };

  const handleScheduleSave = async (data: any) => {
    try {
      await accountingApi.createSchedule(data);
      setState((prev) => ({ ...prev, showScheduleDialog: false }));
      refetchSummary();
    } catch (error) {
      handleSubmissionError(error, "スケジュール作成");
    }
  };

  // SpeedDial アクション
  const speedDialActions = [
    {
      icon: <GroupAdd />,
      name: "プロジェクトグループ作成",
      onClick: handleCreateProjectGroup,
    },
    {
      icon: <Schedule />,
      name: "スケジュール作成",
      onClick: handleCreateSchedule,
    },
    {
      icon: <Receipt />,
      name: "請求処理",
      onClick: () => {
        // 請求処理画面への遷移
        window.location.href = "/admin/accounting/billing";
      },
    },
    {
      icon: <Sync />,
      name: "freee同期",
      onClick: () => {
        // freee設定画面への遷移
        window.location.href = "/admin/accounting/freee";
      },
    },
  ];

  // エラー表示
  if (summaryError) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button onClick={() => refetchSummary()} startIcon={<Refresh />}>
              再読み込み
            </Button>
          }
        >
          ダッシュボードデータの読み込みに失敗しました
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 4 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              請求管理ダッシュボード
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body1" color="text.secondary">
                {formatDate(new Date(), "yyyy年MM月dd日")}現在
              </Typography>
              <Chip
                icon={isFreeeConnected ? <CheckCircle /> : <ErrorIcon />}
                label={`freee: ${isFreeeConnected ? "接続済み" : "未接続"}`}
                color={isFreeeConnected ? "success" : "error"}
                size="small"
              />
            </Stack>
          </Box>

          <Stack direction="row" spacing={1}>
            <MonthPicker
              value={state.selectedMonth}
              onChange={handleMonthChange}
              size="small"
            />
            <Tooltip title="データを更新">
              <IconButton
                onClick={handleRefresh}
                disabled={state.refreshing}
                size="small"
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<Settings />}
              onClick={() =>
                (window.location.href = "/admin/accounting/settings")
              }
            >
              設定
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* KPI カード */}
      {kpiData && (
        <Box sx={{ mb: 4 }}>
          <KPICardGroup loading={summaryLoading}>
            <KPICard
              title="総請求額"
              value={kpiData.totalBilling.value}
              previousValue={kpiData.totalBilling.previousValue}
              unit="currency"
              icon={<TrendingUp />}
              color="primary"
            />
            <KPICard
              title="取引先数"
              value={kpiData.totalClients.value}
              previousValue={kpiData.totalClients.previousValue}
              unit="count"
              icon={<Dashboard />}
              color="info"
            />
            <KPICard
              title="完了済み請求"
              value={kpiData.completedBillings.value}
              previousValue={kpiData.completedBillings.previousValue}
              unit="count"
              icon={<CheckCircle />}
              color="success"
            />
            <KPICard
              title="未完了請求"
              value={kpiData.pendingBillings.value}
              previousValue={kpiData.pendingBillings.previousValue}
              unit="count"
              icon={<Warning />}
              color="warning"
            />
          </KPICardGroup>
        </Box>
      )}

      {/* チャートセクション */}
      <Box sx={{ mb: 4 }}>
        <Stack spacing={3}>
          {/* 月次推移チャート */}
          <MonthlyTrendChart
            data={monthlyTrend || []}
            loading={trendLoading}
            error={!!trendError}
            height={400}
          />

          {/* 取引先ランキング */}
          <ClientRankingChart
            data={clientRanking || []}
            loading={rankingLoading}
            error={!!rankingError}
            height={400}
            limit={10}
          />
        </Stack>
      </Box>

      {/* アクティビティとスケジュール */}
      <Box sx={{ mb: 4 }}>
        <Stack spacing={3} direction={{ xs: "column", lg: "row" }}>
          {/* アクティビティタイムライン */}
          <Box sx={{ flex: 1 }}>
            <ActivityTimeline
              activities={activities || []}
              loading={activitiesLoading}
              error={!!activitiesError}
              onRefresh={refetchActivities}
              maxItems={10}
              groupByDate
            />
          </Box>

          {/* 今後のスケジュール */}
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6">今後のスケジュール</Typography>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={handleCreateSchedule}
                  >
                    追加
                  </Button>
                </Stack>

                {schedulesLoading ? (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary">
                      読み込み中...
                    </Typography>
                  </Box>
                ) : schedulesError ? (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    スケジュールの読み込みに失敗しました
                  </Alert>
                ) : !upcomingSchedules || upcomingSchedules.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary">
                      予定されているスケジュールはありません
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {upcomingSchedules.slice(0, 5).map((schedule) => (
                      <Card
                        key={schedule.id}
                        variant="outlined"
                        sx={{
                          transition: "all 0.2s ease",
                          "&:hover": {
                            boxShadow: theme.shadows[2],
                          },
                        }}
                      >
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            spacing={1}
                          >
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {schedule.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {formatDate(schedule.scheduledAt)}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={
                                schedule.type === "billing" ? "請求" : "同期"
                              }
                              color={
                                schedule.type === "billing"
                                  ? "primary"
                                  : "secondary"
                              }
                            />
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Box>

      {/* SpeedDial */}
      <SpeedDial
        ariaLabel="アクション"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.onClick}
          />
        ))}
      </SpeedDial>

      {/* ダイアログ */}
      <ProjectGroupDialog
        open={state.showProjectGroupDialog}
        onClose={() =>
          setState((prev) => ({ ...prev, showProjectGroupDialog: false }))
        }
        onSave={handleProjectGroupSave}
        clients={[]} // TODO: クライアントデータを取得
        projects={[]} // TODO: プロジェクトデータを取得
        mode="create"
      />

      <ScheduleDialog
        open={state.showScheduleDialog}
        onClose={() =>
          setState((prev) => ({ ...prev, showScheduleDialog: false }))
        }
        onSave={handleScheduleSave}
        clients={[]} // TODO: クライアントデータを取得
        mode="create"
      />
    </Container>
  );
}
