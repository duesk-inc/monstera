// freee連携設定画面

"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Alert,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  useTheme,
  alpha,
} from "@mui/material";
// Grid型の差異を回避
const AnyGrid = Grid as unknown as any;
import {
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  ExpandMore,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAccountingErrorHandler } from "@/hooks/useAccountingErrorHandler";
import * as accountingApi from "@/api/accountingApi";
import { formatDate, formatDateTime } from "../../../../../utils/format";
import {
  FreeConfig,
  FreeSyncLog,
  FreeConnectionStatus,
  FreeSyncStatus,
  ScheduledJob,
} from "../../../../../types/accounting";
import {
  FREEE_CONNECTION_STATUS,
  FREEE_CONNECTION_STATUS_LABELS,
  FREEE_SYNC_STATUS_LABELS,
  SCHEDULE_STATUS_LABELS,
} from "../../../../../constants/accounting";

// ========== 型定義 ==========

interface FreeeSettingsState {
  connectionDialogOpen: boolean;
  disconnectionDialogOpen: boolean;
  syncDialogOpen: boolean;
  scheduleDialogOpen: boolean;
  selectedSyncLog: FreeSyncLog | null;
  schedulerEnabled: boolean;
  autoSyncEnabled: boolean;
  syncInterval: number;
}

interface SyncConfigForm {
  syncPartners: boolean;
  syncInvoices: boolean;
  syncItems: boolean;
  dateRange: {
    from: string;
    to: string;
  };
  batchSize: number;
}

// ========== ユーティリティ関数 ==========

// 接続ステータスアイコンの取得
const getConnectionStatusIcon = (
  status: FreeConnectionStatus,
): React.ReactNode => {
  switch (status) {
    case "connected":
      return <CheckCircleIcon color="success" />;
    case "disconnected":
      return <LinkOffIcon color="disabled" />;
    case "expired":
      return <WarningIcon color="warning" />;
    case "error":
      return <ErrorIcon color="error" />;
    default:
      return <InfoIcon />;
  }
};

// 同期ステータスアイコンの取得
const getSyncStatusIcon = (status: FreeSyncStatus): React.ReactNode => {
  switch (status) {
    case "pending":
      return <ScheduleIcon color="warning" />;
    case "in_progress":
      return <SyncIcon color="primary" />;
    case "completed":
      return <CheckCircleIcon color="success" />;
    case "failed":
      return <ErrorIcon color="error" />;
    default:
      return <InfoIcon />;
  }
};

// ========== メインコンポーネント ==========

export default function FreeeSettingsPage() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { handleSubmissionError } = useAccountingErrorHandler();

  // 状態管理
  const [state, setState] = useState<FreeeSettingsState>({
    connectionDialogOpen: false,
    disconnectionDialogOpen: false,
    syncDialogOpen: false,
    scheduleDialogOpen: false,
    selectedSyncLog: null,
    schedulerEnabled: false,
    autoSyncEnabled: false,
    syncInterval: 60,
  });

  const [syncForm, setSyncForm] = useState<SyncConfigForm>({
    syncPartners: true,
    syncInvoices: true,
    syncItems: false,
    dateRange: {
      from: "",
      to: "",
    },
    batchSize: 100,
  });

  // データ取得
  const {
    data: freeeConfig,
    isLoading: configLoading,
    error: configError,
    refetch: refetchConfig,
  } = useQuery({
    queryKey: ["accounting", "freee-config"],
    queryFn: () => accountingApi.getFreeeConfig(),
  });

  const {
    data: syncLogs = [],
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useQuery<FreeSyncLog[]>({
    queryKey: ["accounting", "freee-sync-logs"],
    // TODO: 同期ログAPI実装時に置き換え
    queryFn: async () => [] as FreeSyncLog[],
  });

  const {
    data: schedules = [],
    isLoading: schedulesLoading,
    error: schedulesError,
    refetch: refetchSchedules,
  } = useQuery({
    queryKey: ["accounting", "freee-schedules"],
    queryFn: () => accountingApi.getSchedules({ type: "freee_sync" }),
  });

  // ミューテーション
  const connectMutation = useMutation({
    mutationFn: () => accountingApi.getFreeeAuthUrl(),
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      handleSubmissionError(error, "freee連携");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => accountingApi.disconnectFreee(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["accounting", "freee-config"],
      });
      setState((prev) => ({ ...prev, disconnectionDialogOpen: false }));
    },
    onError: (error) => {
      handleSubmissionError(error, "freee連携解除");
    },
  });

  const syncMutation = useMutation({
    mutationFn: (config: SyncConfigForm) => {
      const syncType: "partners" | "invoices" = config.syncInvoices
        ? "invoices"
        : "partners";
      return accountingApi.syncFreeeData({ syncType, forceSync: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["accounting", "freee-sync-logs"],
      });
      setState((prev) => ({ ...prev, syncDialogOpen: false }));
    },
    onError: (error) => {
      handleSubmissionError(error, "freee同期");
    },
  });

  // 接続状態の取得
  const connectionStatus: FreeConnectionStatus = freeeConfig
    ? freeeConfig.connectionStatus || "connected"
    : "disconnected";

  const isConnected = connectionStatus === "connected";

  // イベントハンドラー
  const handleConnect = () => {
    connectMutation.mutate();
  };

  const handleDisconnect = () => {
    setState((prev) => ({ ...prev, disconnectionDialogOpen: true }));
  };

  const handleDisconnectConfirm = () => {
    disconnectMutation.mutate();
  };

  const handleSync = () => {
    setState((prev) => ({ ...prev, syncDialogOpen: true }));
  };

  const handleSyncConfirm = () => {
    syncMutation.mutate(syncForm);
  };

  const handleRefresh = () => {
    refetchConfig();
    refetchLogs();
    refetchSchedules();
  };

  const handleSyncFormChange = (field: keyof SyncConfigForm, value: any) => {
    setSyncForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleViewSyncLog = (log: FreeSyncLog) => {
    setState((prev) => ({ ...prev, selectedSyncLog: log }));
  };

  // 初期値設定
  useEffect(() => {
    // freeeConfig から画面用状態を必要最小限に反映（未定義プロパティは無視）
    if (freeeConfig) {
      setState((prev) => ({ ...prev }));
    }
  }, [freeeConfig]);

  // エラー表示
  if (configError) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button onClick={handleRefresh} startIcon={<RefreshIcon />}>
              再読み込み
            </Button>
          }
        >
          freee設定の読み込みに失敗しました
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
              freee連携設定
            </Typography>
            <Typography variant="body1" color="text.secondary">
              freee会計ソフトとの連携設定を管理します
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={configLoading}
            >
              更新
            </Button>
            <Button
              variant="contained"
              startIcon={<SettingsIcon />}
              onClick={() => router.push("/admin/accounting")}
            >
              ダッシュボードに戻る
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* 接続状態カード */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
            {getConnectionStatusIcon(connectionStatus)}
            <Box>
              <Typography variant="h6" fontWeight={600}>
                freee連携状態
              </Typography>
              <Chip
                label={(FREEE_CONNECTION_STATUS_LABELS as Record<string, string>)[connectionStatus]}
                color={
                  connectionStatus === "connected"
                    ? "success"
                    : connectionStatus === "expired"
                      ? "warning"
                      : connectionStatus === "error"
                        ? "error"
                        : "default"
                }
                size="small"
              />
            </Box>
          </Stack>

          {configLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : freeeConfig ? (
            <AnyGrid container spacing={3}>
              <AnyGrid item xs={12} md={6}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  事業所名
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {freeeConfig.companyName || "-"}
                </Typography>

                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  認証日時
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {freeeConfig.accessTokenExpiresAt
                    ? formatDateTime(freeeConfig.accessTokenExpiresAt)
                    : "-"}
                </Typography>
              </AnyGrid>
              <AnyGrid item xs={12} md={6}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  最終同期日時
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {freeeConfig.lastSyncAt
                    ? formatDateTime(freeeConfig.lastSyncAt)
                    : "未実行"}
                </Typography>

                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  同期済み請求書数
                </Typography>
                <Typography variant="body1">-</Typography>
              </AnyGrid>
            </AnyGrid>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              freeeとの連携が設定されていません
            </Alert>
          )}
        </CardContent>
        <CardActions>
          {isConnected ? (
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<SyncIcon />}
                onClick={handleSync}
                disabled={syncMutation.isPending}
              >
                手動同期
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LinkOffIcon />}
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                連携解除
              </Button>
            </Stack>
          ) : (
            <Button
              variant="contained"
              startIcon={<LinkIcon />}
              onClick={handleConnect}
              disabled={connectMutation.isPending}
            >
              freeeと連携
            </Button>
          )}
        </CardActions>
      </Card>

      {/* 同期履歴 */}
      {isConnected && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              同期履歴
            </Typography>

            {logsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : syncLogs.length === 0 ? (
              <Alert severity="info">同期履歴がありません</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>実行日時</TableCell>
                      <TableCell>ステータス</TableCell>
                      <TableCell>同期タイプ</TableCell>
                      <TableCell>処理件数</TableCell>
                      <TableCell>実行時間</TableCell>
                      <TableCell align="center">アクション</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {syncLogs.slice(0, 10).map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>{formatDateTime(log.startedAt)}</TableCell>
                        <TableCell>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            {getSyncStatusIcon(log.status)}
                            <Typography variant="body2">
                              {(FREEE_SYNC_STATUS_LABELS as Record<string, string>)[
                                log.status as any
                              ]}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              log.syncType === "partners"
                                ? "取引先"
                                : log.syncType === "invoices"
                                  ? "請求書"
                                  : "手動"
                            }
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{log.totalRecords || 0}件</TableCell>
                        <TableCell>
                          {log.completedAt
                            ? `${Math.round(
                                (new Date(log.completedAt).getTime() -
                                  new Date(log.startedAt).getTime()) /
                                  1000,
                              )}秒`
                            : "-"}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="詳細を見る">
                            <IconButton
                              size="small"
                              onClick={() => handleViewSyncLog(log)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* 自動同期設定 */}
      {isConnected && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              自動同期設定
            </Typography>

            <AnyGrid container spacing={3}>
              <AnyGrid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.autoSyncEnabled}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          autoSyncEnabled: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="自動同期を有効にする"
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  指定した間隔で自動的にfreeeと同期します
                </Typography>
              </AnyGrid>

              <AnyGrid item xs={12} md={6}>
                <FormControl
                  fullWidth
                  size="small"
                  disabled={!state.autoSyncEnabled}
                >
                  <InputLabel>同期間隔</InputLabel>
                  <Select
                    value={state.syncInterval}
                    label="同期間隔"
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        syncInterval: Number(e.target.value),
                      }))
                    }
                  >
                    <MenuItem value={30}>30分</MenuItem>
                    <MenuItem value={60}>1時間</MenuItem>
                    <MenuItem value={120}>2時間</MenuItem>
                    <MenuItem value={360}>6時間</MenuItem>
                    <MenuItem value={720}>12時間</MenuItem>
                    <MenuItem value={1440}>24時間</MenuItem>
                  </Select>
                </FormControl>
              </AnyGrid>
            </AnyGrid>

            {state.autoSyncEnabled && (
              <Alert severity="info" sx={{ mt: 2 }}>
                次回同期予定:{" "}
                {formatDateTime(
                  new Date(Date.now() + state.syncInterval * 60 * 1000),
                )}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 連携ダイアログ */}
      <Dialog
        open={state.connectionDialogOpen}
        onClose={() =>
          setState((prev) => ({ ...prev, connectionDialogOpen: false }))
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>freee連携の開始</DialogTitle>
        <DialogContent>
          <DialogContentText>
            freee会計ソフトとの連携を開始します。ブラウザでfreeeの認証画面が開きますので、
            ログインして連携を許可してください。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setState((prev) => ({ ...prev, connectionDialogOpen: false }))
            }
          >
            キャンセル
          </Button>
          <Button onClick={handleConnect} variant="contained" autoFocus>
            連携開始
          </Button>
        </DialogActions>
      </Dialog>

      {/* 連携解除ダイアログ */}
      <Dialog
        open={state.disconnectionDialogOpen}
        onClose={() =>
          setState((prev) => ({ ...prev, disconnectionDialogOpen: false }))
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>freee連携の解除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            freee会計ソフトとの連携を解除します。
            同期データは保持されますが、今後の自動同期は停止されます。
            本当によろしいですか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setState((prev) => ({ ...prev, disconnectionDialogOpen: false }))
            }
          >
            キャンセル
          </Button>
          <Button
            onClick={handleDisconnectConfirm}
            color="error"
            variant="contained"
            disabled={disconnectMutation.isPending}
          >
            {disconnectMutation.isPending ? "解除中..." : "連携解除"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 同期ダイアログ */}
      <Dialog
        open={state.syncDialogOpen}
        onClose={() => setState((prev) => ({ ...prev, syncDialogOpen: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>freee手動同期</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              同期対象
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={syncForm.syncPartners}
                  onChange={(e) =>
                    handleSyncFormChange("syncPartners", e.target.checked)
                  }
                />
              }
              label="取引先"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={syncForm.syncInvoices}
                  onChange={(e) =>
                    handleSyncFormChange("syncInvoices", e.target.checked)
                  }
                />
              }
              label="請求書"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={syncForm.syncItems}
                  onChange={(e) =>
                    handleSyncFormChange("syncItems", e.target.checked)
                  }
                />
              }
              label="品目"
            />

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
              同期期間（請求書のみ）
            </Typography>
            <AnyGrid container spacing={2}>
              <AnyGrid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="開始日"
                  type="date"
                  value={syncForm.dateRange.from}
                  onChange={(e) =>
                    handleSyncFormChange("dateRange", {
                      ...syncForm.dateRange,
                      from: e.target.value,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </AnyGrid>
              <AnyGrid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="終了日"
                  type="date"
                  value={syncForm.dateRange.to}
                  onChange={(e) =>
                    handleSyncFormChange("dateRange", {
                      ...syncForm.dateRange,
                      to: e.target.value,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </AnyGrid>
            </AnyGrid>

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
              バッチサイズ
            </Typography>
            <TextField
              size="small"
              type="number"
              value={syncForm.batchSize}
              onChange={(e) =>
                handleSyncFormChange("batchSize", Number(e.target.value))
              }
              inputProps={{ min: 1, max: 1000 }}
              helperText="一度に処理する件数（1-1000）"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setState((prev) => ({ ...prev, syncDialogOpen: false }))
            }
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSyncConfirm}
            variant="contained"
            disabled={syncMutation.isPending}
            startIcon={
              syncMutation.isPending ? (
                <CircularProgress size={20} />
              ) : (
                <SyncIcon />
              )
            }
          >
            {syncMutation.isPending ? "同期中..." : "同期開始"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 同期ログ詳細ダイアログ */}
      <Dialog
        open={Boolean(state.selectedSyncLog)}
        onClose={() => setState((prev) => ({ ...prev, selectedSyncLog: null }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>同期ログ詳細</DialogTitle>
        <DialogContent>
          {state.selectedSyncLog && (
            <Box sx={{ mt: 2 }}>
              <AnyGrid container spacing={2}>
                <AnyGrid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    実行日時
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatDateTime(state.selectedSyncLog.startedAt)}
                  </Typography>
                </AnyGrid>
                <AnyGrid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    ステータス
                  </Typography>
                  <Chip
                    label={(FREEE_SYNC_STATUS_LABELS as Record<string, string>)[
                      state.selectedSyncLog.status as any
                    ]}
                    color={
                      state.selectedSyncLog.status === "completed"
                        ? "success"
                        : state.selectedSyncLog.status === "failed"
                          ? "error"
                          : "warning"
                    }
                    size="small"
                  />
                </AnyGrid>
                <AnyGrid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    処理件数
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {state.selectedSyncLog.totalRecords || 0}件
                  </Typography>
                </AnyGrid>
                <AnyGrid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    エラー件数
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {state.selectedSyncLog.failedRecords || 0}件
                  </Typography>
                </AnyGrid>
              </AnyGrid>

              {state.selectedSyncLog.errorMessage && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    エラーメッセージ
                  </Typography>
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {state.selectedSyncLog.errorMessage}
                  </Alert>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setState((prev) => ({ ...prev, selectedSyncLog: null }))
            }
          >
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
