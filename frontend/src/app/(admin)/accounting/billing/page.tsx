// 月次請求処理画面

"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Alert,
  Button,
  IconButton,
  Card,
  CardContent,
  Chip,
  Divider,
  TextField,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  useTheme,
} from "@mui/material";
import {
  Search,
  Clear,
  PlayArrow,
  Refresh,
  GetApp,
  Schedule,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  ExpandMore,
  NavigateNext,
  NavigateBefore,
  Visibility,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MonthPicker } from "../../../../components/features/accounting/MonthPicker";
import { ClientMultiSelect } from "../../../../components/features/accounting/ClientMultiSelect";
import { useAccountingErrorHandler } from "@/hooks/useAccountingErrorHandler";
import * as accountingApi from "@/api/accountingApi";
import { formatCurrency, formatDate } from "../../../../utils/format";
import {
  BillingPreview,
  ProcessBillingRequest,
  ScheduleBillingRequest,
} from "../../../../types/accounting";
import {
  BILLING_CALCULATION_TYPE_LABELS,
} from "../../../../constants/accounting";

// Grid型のバージョン差異を吸収（最小限の型回避）
const AnyGrid = Grid as unknown as any;

// ========== 型定義 ==========

interface BillingState {
  selectedMonth: string;
  selectedClients: string[];
  searchTerm: string;
  activeStep: number;
  processingClients: string[];
  completedClients: string[];
  failedClients: string[];
  scheduledProcessing: boolean;
  sendToFreee: boolean;
  showPreviewDialog: boolean;
  showScheduleDialog: boolean;
  showConfirmDialog: boolean;
  selectedPreview: BillingPreview | null;
}

interface ScheduleDialogState {
  open: boolean;
  scheduledAt: string;
  clientIds: string[];
  sendToFreee: boolean;
}

interface ProcessingProgress {
  current: number;
  total: number;
  clientName: string;
  status: string;
}

// ========== ユーティリティ関数 ==========

// 請求プレビューのフィルタリング
const filterBillingPreviews = (
  previews: BillingPreview[],
  searchTerm: string,
  selectedClients: string[],
): BillingPreview[] => {
  return previews.filter((preview) => {
    // クライアントフィルタ
    if (
      selectedClients.length > 0 &&
      !selectedClients.includes(preview.clientId)
    ) {
      return false;
    }

    // 検索フィルタ
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        preview.clientName.toLowerCase().includes(search) ||
        preview.projectGroups.some((group) =>
          group.groupName.toLowerCase().includes(search),
        ) ||
        preview.individualProjects.some((project) =>
          project.projectName.toLowerCase().includes(search),
        )
      );
    }

    return true;
  });
};

// 請求ステータスの取得
const getBillingStatus = (preview: BillingPreview): string => {
  if (preview.totalAmount === 0) {
    return "no_amount";
  }
  if (preview.totalWorkHours === 0) {
    return "no_work";
  }
  return "ready";
};

// ステータスアイコンの取得
const getStatusIcon = (status: string): React.ReactElement => {
  switch (status) {
    case "ready":
      return <CheckCircle color="success" />;
    case "no_amount":
    case "no_work":
      return <Warning color="warning" />;
    case "processing":
      return <CircularProgress size={20} />;
    case "completed":
      return <CheckCircle color="success" />;
    case "failed":
      return <ErrorIcon color="error" />;
    default:
      return <Info color="info" />;
  }
};

// ステータスラベルの取得
const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    ready: "処理可能",
    no_amount: "請求額なし",
    no_work: "作業時間なし",
    processing: "処理中",
    completed: "完了",
    failed: "エラー",
  };
  return statusMap[status] || status;
};

// ステップの定義
const steps = [
  { label: "対象選択", description: "請求対象の取引先と月を選択" },
  { label: "プレビュー", description: "請求内容を確認" },
  { label: "実行設定", description: "処理オプションを設定" },
  { label: "処理実行", description: "請求処理を実行" },
];

// ========== メインコンポーネント ==========

export default function BillingProcessPage() {
  const queryClient = useQueryClient();
  const { handleSubmissionError } = useAccountingErrorHandler();

  // 状態管理
  const [state, setState] = useState<BillingState>({
    selectedMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
    selectedClients: [],
    searchTerm: "",
    activeStep: 0,
    processingClients: [],
    completedClients: [],
    failedClients: [],
    scheduledProcessing: false,
    sendToFreee: false,
    showPreviewDialog: false,
    showScheduleDialog: false,
    showConfirmDialog: false,
    selectedPreview: null,
  });

  const [scheduleDialog, setScheduleDialog] = useState<ScheduleDialogState>({
    open: false,
    scheduledAt: "",
    clientIds: [],
    sendToFreee: false,
  });

  const [processingProgress, setProcessingProgress] =
    useState<ProcessingProgress>({
      current: 0,
      total: 0,
      clientName: "",
      status: "",
    });

  // データ取得
  const {
    data: clients = [],
    isLoading: clientsLoading,
    error: clientsError,
  } = useQuery({
    queryKey: ["accounting", "clients"],
    queryFn: () => accountingApi.getClients(),
  });


  // 請求プレビューの取得
  const {
    data: billingPreviews = [],
    isLoading: previewsLoading,
    error: previewsError,
    refetch: refetchPreviews,
  } = useQuery({
    queryKey: [
      "accounting",
      "billing-previews",
      state.selectedMonth,
      state.selectedClients,
    ],
    queryFn: () =>
      accountingApi.getBillingPreviews({
        month: state.selectedMonth,
        clientIds:
          state.selectedClients.length > 0 ? state.selectedClients : undefined,
      }),
    enabled: state.selectedMonth !== "",
  });

  // ミューテーション
  const processBillingMutation = useMutation({
    mutationFn: accountingApi.processBilling,
    onSuccess: (result, variables) => {
      setState((prev) => ({
        ...prev,
        processingClients: prev.processingClients.filter(
          (id) => id !== variables.clientId,
        ),
        completedClients: [...prev.completedClients, variables.clientId],
      }));
      queryClient.invalidateQueries({
        queryKey: ["accounting", "billing-results"],
      });
    },
    onError: (error, variables) => {
      setState((prev) => ({
        ...prev,
        processingClients: prev.processingClients.filter(
          (id) => id !== variables.clientId,
        ),
        failedClients: [...prev.failedClients, variables.clientId],
      }));
      handleSubmissionError(error, "請求処理");
    },
  });

  const scheduleBillingMutation = useMutation({
    mutationFn: accountingApi.scheduleBilling,
    onSuccess: () => {
      setScheduleDialog({
        open: false,
        scheduledAt: "",
        clientIds: [],
        sendToFreee: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["accounting", "scheduled-jobs"],
      });
    },
    onError: (error) => {
      handleSubmissionError(error, "スケジュール設定");
    },
  });

  // フィルタリングされたプレビュー
  const filteredPreviews = useMemo(() => {
    return filterBillingPreviews(
      billingPreviews,
      state.searchTerm,
      state.selectedClients,
    );
  }, [billingPreviews, state.searchTerm, state.selectedClients]);

  // 選択可能なプレビュー
  const validPreviews = useMemo(() => {
    return filteredPreviews.filter((preview) => {
      const status = getBillingStatus(preview);
      return status === "ready";
    });
  }, [filteredPreviews]);

  // イベントハンドラー
  const handleMonthChange = (month: string) => {
    setState((prev) => ({ ...prev, selectedMonth: month }));
  };

  const handleClientChange = (clientIds: string[]) => {
    setState((prev) => ({ ...prev, selectedClients: clientIds }));
  };

  const handleSearchChange = (value: string) => {
    setState((prev) => ({ ...prev, searchTerm: value }));
  };

  const handleStepChange = (step: number) => {
    setState((prev) => ({ ...prev, activeStep: step }));
  };

  const handlePreviewView = (preview: BillingPreview) => {
    setState((prev) => ({
      ...prev,
      selectedPreview: preview,
      showPreviewDialog: true,
    }));
  };

  const handleSingleProcess = async (preview: BillingPreview) => {
    setState((prev) => ({
      ...prev,
      processingClients: [...prev.processingClients, preview.clientId],
    }));

    const request: ProcessBillingRequest = {
      clientId: preview.clientId,
      month: state.selectedMonth,
      preview,
      sendToFreee: state.sendToFreee,
    };

    await processBillingMutation.mutateAsync(request);
  };

  const handleBatchProcess = async () => {
    if (validPreviews.length === 0) {
      return;
    }

    setState((prev) => ({ ...prev, showConfirmDialog: false, activeStep: 3 }));

    setProcessingProgress({
      current: 0,
      total: validPreviews.length,
      clientName: "",
      status: "開始",
    });

    for (let i = 0; i < validPreviews.length; i++) {
      const preview = validPreviews[i];

      setProcessingProgress({
        current: i + 1,
        total: validPreviews.length,
        clientName: preview.clientName,
        status: "処理中",
      });

      await handleSingleProcess(preview);
    }

    setProcessingProgress((prev) => ({
      ...prev,
      status: "完了",
    }));
  };

  const handleScheduleProcess = async () => {
    const request: ScheduleBillingRequest = {
      clientIds: scheduleDialog.clientIds,
      month: state.selectedMonth,
      scheduledAt: scheduleDialog.scheduledAt,
      sendToFreee: scheduleDialog.sendToFreee,
    };

    await scheduleBillingMutation.mutateAsync(request);
  };

  const handleRefresh = () => {
    refetchPreviews();
  };

  // ステップコンテンツのレンダリング
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // 対象選択
        return (
          <Box sx={{ py: 2 }}>
            <Stack spacing={3}>
              <MonthPicker
                value={state.selectedMonth}
                onChange={handleMonthChange}
                label="請求対象月"
                placeholder="請求処理を行う月を選択"
                required
              />

              <ClientMultiSelect
                value={state.selectedClients}
                onChange={handleClientChange}
                clients={clients}
                loading={clientsLoading}
                error={!!clientsError}
                label="対象取引先"
                placeholder="特定の取引先のみ処理する場合は選択（空白の場合は全取引先）"
                allowSelectAll
                showInactive={false}
              />

              <Box>
                <Typography variant="h6" gutterBottom>
                  処理対象サマリー
                </Typography>
                <AnyGrid container spacing={2}>
                  <AnyGrid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h4" color="primary.main">
                          {state.selectedClients.length || clients.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          対象取引先数
                        </Typography>
                      </CardContent>
                    </Card>
                  </AnyGrid>
                  <AnyGrid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h4" color="secondary.main">
                          {state.selectedMonth}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          処理対象月
                        </Typography>
                      </CardContent>
                    </Card>
                  </AnyGrid>
                </AnyGrid>
              </Box>
            </Stack>
          </Box>
        );

      case 1: // プレビュー
        return (
          <Box sx={{ py: 2 }}>
            <Stack spacing={2}>
              {/* 検索・フィルター */}
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  size="small"
                  placeholder="取引先・プロジェクトを検索..."
                  value={state.searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: state.searchTerm && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => handleSearchChange("")}
                        >
                          <Clear fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flexGrow: 1, maxWidth: 400 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleRefresh}
                  startIcon={<Refresh />}
                  disabled={previewsLoading}
                >
                  更新
                </Button>
              </Stack>

              {/* プレビュー一覧 */}
              {previewsLoading ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    請求データを読み込み中...
                  </Typography>
                </Box>
              ) : previewsError ? (
                <Alert severity="error">
                  請求データの読み込みに失敗しました
                </Alert>
              ) : filteredPreviews.length === 0 ? (
                <Alert severity="info">
                  指定された条件に該当する請求データがありません
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {filteredPreviews.map((preview) => (
                    <BillingPreviewCard
                      key={preview.clientId}
                      preview={preview}
                      status={getBillingStatus(preview)}
                      isProcessing={state.processingClients.includes(
                        preview.clientId,
                      )}
                      isCompleted={state.completedClients.includes(
                        preview.clientId,
                      )}
                      isFailed={state.failedClients.includes(preview.clientId)}
                      onView={() => handlePreviewView(preview)}
                      onProcess={() => handleSingleProcess(preview)}
                      sendToFreee={state.sendToFreee}
                    />
                  ))}
                </Stack>
              )}

              {/* サマリー */}
              {filteredPreviews.length > 0 && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      処理サマリー
                    </Typography>
                    <AnyGrid container spacing={2}>
                      <AnyGrid item xs={6} sm={3}>
                        <Typography variant="h5" color="primary.main">
                          {filteredPreviews.length}
                        </Typography>
                        <Typography variant="caption">総取引先数</Typography>
                      </AnyGrid>
                      <AnyGrid item xs={6} sm={3}>
                        <Typography variant="h5" color="success.main">
                          {validPreviews.length}
                        </Typography>
                        <Typography variant="caption">処理可能</Typography>
                      </AnyGrid>
                      <AnyGrid item xs={6} sm={3}>
                        <Typography variant="h5" color="info.main">
                          {formatCurrency(
                            filteredPreviews.reduce(
                              (sum, p) => sum + p.totalAmount,
                              0,
                            ),
                          )}
                        </Typography>
                        <Typography variant="caption">総請求額</Typography>
                      </AnyGrid>
                      <AnyGrid item xs={6} sm={3}>
                        <Typography variant="h5" color="secondary.main">
                          {filteredPreviews.reduce(
                            (sum, p) => sum + p.totalWorkHours,
                            0,
                          )}
                          h
                        </Typography>
                        <Typography variant="caption">総作業時間</Typography>
                      </AnyGrid>
                    </AnyGrid>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Box>
        );

      case 2: // 実行設定
        return (
          <Box sx={{ py: 2 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  処理オプション
                </Typography>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={state.sendToFreee}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            sendToFreee: e.target.checked,
                          }))
                        }
                      />
                    }
                    label="freeeに自動送信する"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={state.scheduledProcessing}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            scheduledProcessing: e.target.checked,
                          }))
                        }
                      />
                    }
                    label="スケジュール実行する"
                  />
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" gutterBottom>
                  実行対象確認
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  {validPreviews.length}件の取引先の請求処理を実行します
                </Alert>
                <Stack spacing={1}>
                  {validPreviews.slice(0, 5).map((preview) => (
                    <Box
                      key={preview.clientId}
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <CheckCircle color="success" fontSize="small" />
                      <Typography variant="body2">
                        {preview.clientName} -{" "}
                        {formatCurrency(preview.totalAmount)}
                      </Typography>
                    </Box>
                  ))}
                  {validPreviews.length > 5 && (
                    <Typography variant="caption" color="text.secondary">
                      他 {validPreviews.length - 5} 件
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Box>
        );

      case 3: // 処理実行
        return (
          <Box sx={{ py: 2 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  処理進行状況
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    processingProgress.total > 0
                      ? (processingProgress.current /
                          processingProgress.total) *
                        100
                      : 0
                  }
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {processingProgress.current} / {processingProgress.total}{" "}
                  件完了
                  {processingProgress.clientName &&
                    ` - ${processingProgress.clientName}`}
                </Typography>
              </Box>

              {state.completedClients.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom color="success.main">
                    完了 ({state.completedClients.length}件)
                  </Typography>
                  <Stack spacing={1}>
                    {state.completedClients.map((clientId) => {
                      const client = clients.find((c) => c.id === clientId);
                      return (
                        <Box
                          key={clientId}
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <CheckCircle color="success" fontSize="small" />
                          <Typography variant="body2">
                            {client?.name}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}

              {state.failedClients.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom color="error.main">
                    エラー ({state.failedClients.length}件)
                  </Typography>
                  <Stack spacing={1}>
                    {state.failedClients.map((clientId) => {
                      const client = clients.find((c) => c.id === clientId);
                      return (
                        <Box
                          key={clientId}
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <ErrorIcon color="error" fontSize="small" />
                          <Typography variant="body2">
                            {client?.name}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>
        );

      default:
        return null;
    }
  };

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
              月次請求処理
            </Typography>
            <Typography variant="body1" color="text.secondary">
              月次の請求処理を一括で実行します
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Schedule />}
              onClick={() =>
                setScheduleDialog((prev) => ({ ...prev, open: true }))
              }
              disabled={validPreviews.length === 0}
            >
              スケジュール設定
            </Button>
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={() => {
                // TODO: エクスポート機能の実装
              }}
            >
              エクスポート
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ステッパー */}
      <Box sx={{ mb: 4 }}>
        <Stepper activeStep={state.activeStep} orientation="horizontal">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                onClick={() => handleStepChange(index)}
                sx={{ cursor: "pointer" }}
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* ステップコンテンツ */}
      <Paper sx={{ p: 3, mb: 4 }}>{renderStepContent(state.activeStep)}</Paper>

      {/* ナビゲーションボタン */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Button
          onClick={() => handleStepChange(state.activeStep - 1)}
          disabled={state.activeStep === 0}
          startIcon={<NavigateBefore />}
        >
          戻る
        </Button>

        <Box sx={{ display: "flex", gap: 1 }}>
          {state.activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={() => (window.location.href = "/admin/accounting")}
              startIcon={<CheckCircle />}
            >
              ダッシュボードに戻る
            </Button>
          ) : state.activeStep === 2 ? (
            <>
              {state.scheduledProcessing ? (
                <Button
                  variant="contained"
                  onClick={() =>
                    setScheduleDialog((prev) => ({
                      ...prev,
                      open: true,
                      clientIds: validPreviews.map((p) => p.clientId),
                      sendToFreee: state.sendToFreee,
                    }))
                  }
                  startIcon={<Schedule />}
                  disabled={validPreviews.length === 0}
                >
                  スケジュール設定
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={() =>
                    setState((prev) => ({ ...prev, showConfirmDialog: true }))
                  }
                  startIcon={<PlayArrow />}
                  disabled={validPreviews.length === 0}
                >
                  処理実行
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="contained"
              onClick={() => handleStepChange(state.activeStep + 1)}
              disabled={
                (state.activeStep === 0 && !state.selectedMonth) ||
                (state.activeStep === 1 && validPreviews.length === 0)
              }
              endIcon={<NavigateNext />}
            >
              次へ
            </Button>
          )}
        </Box>
      </Box>

      {/* プレビューダイアログ */}
      <BillingPreviewDialog
        open={state.showPreviewDialog}
        preview={state.selectedPreview}
        onClose={() =>
          setState((prev) => ({
            ...prev,
            showPreviewDialog: false,
            selectedPreview: null,
          }))
        }
      />

      {/* 実行確認ダイアログ */}
      <Dialog
        open={state.showConfirmDialog}
        onClose={() =>
          setState((prev) => ({ ...prev, showConfirmDialog: false }))
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>請求処理の実行確認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {validPreviews.length}件の取引先に対して請求処理を実行します。
            {state.sendToFreee && (
              <>
                <br />
                freeeにも自動で送信されます。
              </>
            )}
            <br />
            この操作は取り消せません。実行してよろしいですか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setState((prev) => ({ ...prev, showConfirmDialog: false }))
            }
          >
            キャンセル
          </Button>
          <Button
            onClick={handleBatchProcess}
            variant="contained"
            color="primary"
            startIcon={<PlayArrow />}
          >
            実行
          </Button>
        </DialogActions>
      </Dialog>

      {/* スケジュールダイアログ */}
      <ScheduleBillingDialog
        open={scheduleDialog.open}
        scheduledAt={scheduleDialog.scheduledAt}
        clientIds={scheduleDialog.clientIds}
        sendToFreee={scheduleDialog.sendToFreee}
        onClose={() =>
          setScheduleDialog({
            open: false,
            scheduledAt: "",
            clientIds: [],
            sendToFreee: false,
          })
        }
        onSchedule={handleScheduleProcess}
        loading={scheduleBillingMutation.isPending}
      />
    </Container>
  );
}

// ========== 請求プレビューカード ==========

interface BillingPreviewCardProps {
  preview: BillingPreview;
  status: string;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  onView: () => void;
  onProcess: () => void;
  sendToFreee: boolean;
}

const BillingPreviewCard: React.FC<BillingPreviewCardProps> = ({
  preview,
  status,
  isProcessing,
  isCompleted,
  isFailed,
  onView,
  onProcess,
  sendToFreee,
}) => {
  const theme = useTheme();

  const getCardStatus = () => {
    if (isProcessing) return "processing";
    if (isCompleted) return "completed";
    if (isFailed) return "failed";
    return status;
  };

  const cardStatus = getCardStatus();

  return (
    <Card
      sx={{
        opacity: isCompleted || isFailed ? 0.7 : 1,
        border: isProcessing
          ? `2px solid ${theme.palette.primary.main}`
          : undefined,
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={2}
        >
          <Box flex={1}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <Typography variant="h6">{preview.clientName}</Typography>
              <Chip
                size="small"
                label={getStatusLabel(cardStatus)}
                color={
                  cardStatus === "ready" || cardStatus === "completed"
                    ? "success"
                    : cardStatus === "failed"
                      ? "error"
                      : cardStatus === "processing"
                        ? "primary"
                        : "warning"
                }
                icon={getStatusIcon(cardStatus)}
              />
            </Stack>

            <AnyGrid container spacing={2} sx={{ mb: 2 }}>
              <AnyGrid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  請求額
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {formatCurrency(preview.totalAmount)}
                </Typography>
              </AnyGrid>
              <AnyGrid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  作業時間
                </Typography>
                <Typography variant="h6">{preview.totalWorkHours}h</Typography>
              </AnyGrid>
              <AnyGrid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  プロジェクトグループ
                </Typography>
                <Typography variant="h6">
                  {preview.projectGroups.length}件
                </Typography>
              </AnyGrid>
              <AnyGrid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  個別プロジェクト
                </Typography>
                <Typography variant="h6">
                  {preview.individualProjects.length}件
                </Typography>
              </AnyGrid>
            </AnyGrid>

            {/* プロジェクトグループの詳細 */}
            {preview.projectGroups.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="body2">
                    プロジェクトグループ詳細 ({preview.projectGroups.length}件)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1}>
                    {preview.projectGroups.map((group) => (
                      <Box
                        key={group.groupId}
                        sx={{ p: 1, bgcolor: "grey.50", borderRadius: 1 }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {group.groupName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(
                            BILLING_CALCULATION_TYPE_LABELS as Record<string, string>
                          )[group.calculationType as any] ??
                            String(group.calculationType)}{" "}
                          • {group.workHours}h •{" "}
                          {formatCurrency(group.calculatedAmount)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>

          <Stack spacing={1} alignItems="flex-end">
            <Button size="small" onClick={onView} startIcon={<Visibility />}>
              詳細
            </Button>
            {cardStatus === "ready" && !isProcessing && (
              <Button
                size="small"
                variant="contained"
                onClick={onProcess}
                startIcon={
                  isProcessing ? <CircularProgress size={16} /> : <PlayArrow />
                }
                disabled={isProcessing}
              >
                {sendToFreee ? "処理＋freee送信" : "処理実行"}
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

// ========== 請求プレビューダイアログ ==========

interface BillingPreviewDialogProps {
  open: boolean;
  preview: BillingPreview | null;
  onClose: () => void;
}

const BillingPreviewDialog: React.FC<BillingPreviewDialogProps> = ({
  open,
  preview,
  onClose,
}) => {
  if (!preview) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>請求プレビュー詳細 - {preview.clientName}</DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* サマリー */}
          <Box>
            <Typography variant="h6" gutterBottom>
              請求サマリー
            </Typography>
            <AnyGrid container spacing={2}>
              <AnyGrid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  対象月
                </Typography>
                <Typography variant="body1">{preview.month}</Typography>
              </AnyGrid>
              <AnyGrid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  総請求額
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {formatCurrency(preview.totalAmount)}
                </Typography>
              </AnyGrid>
              <AnyGrid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  総作業時間
                </Typography>
                <Typography variant="h6">{preview.totalWorkHours}h</Typography>
              </AnyGrid>
              <AnyGrid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  算出日時
                </Typography>
                <Typography variant="body1">
                  {formatDate(preview.calculatedAt)}
                </Typography>
              </AnyGrid>
            </AnyGrid>
          </Box>

          <Divider />

          {/* プロジェクトグループ */}
          {preview.projectGroups.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                プロジェクトグループ ({preview.projectGroups.length}件)
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>グループ名</TableCell>
                      <TableCell>計算方式</TableCell>
                      <TableCell align="right">作業時間</TableCell>
                      <TableCell align="right">請求額</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.projectGroups.map((group) => (
                      <TableRow key={group.groupId}>
                        <TableCell>{group.groupName}</TableCell>
                        <TableCell>
                          {(
                            BILLING_CALCULATION_TYPE_LABELS as Record<string, string>
                          )[group.calculationType as any] ??
                            String(group.calculationType)}
                        </TableCell>
                        <TableCell align="right">{group.workHours}h</TableCell>
                        <TableCell align="right">
                          {formatCurrency(group.calculatedAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* 個別プロジェクト */}
          {preview.individualProjects.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                個別プロジェクト ({preview.individualProjects.length}件)
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>プロジェクト名</TableCell>
                      <TableCell align="right">作業時間</TableCell>
                      <TableCell align="right">単価</TableCell>
                      <TableCell align="right">請求額</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.individualProjects.map((project) => (
                      <TableRow key={project.projectId}>
                        <TableCell>{project.projectName}</TableCell>
                        <TableCell align="right">
                          {project.workHours}h
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(project.unitPrice)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(project.calculatedAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== スケジュール設定ダイアログ ==========

interface ScheduleBillingDialogProps {
  open: boolean;
  scheduledAt: string;
  clientIds: string[];
  sendToFreee: boolean;
  onClose: () => void;
  onSchedule: () => void;
  loading: boolean;
}

const ScheduleBillingDialog: React.FC<ScheduleBillingDialogProps> = ({
  open,
  scheduledAt,
  clientIds,
  sendToFreee,
  onClose,
  onSchedule,
  loading,
}) => {
  const [localScheduledAt, setLocalScheduledAt] = useState(scheduledAt);
  const [localSendToFreee, setLocalSendToFreee] = useState(sendToFreee);

  const handleSchedule = () => {
    // TODO: スケジュール設定の実装
    onSchedule();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>請求処理スケジュール設定</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField
            label="実行日時"
            type="datetime-local"
            value={localScheduledAt}
            onChange={(e) => setLocalScheduledAt(e.target.value)}
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              対象取引先数: {clientIds.length}件
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={localSendToFreee}
                  onChange={(e) => setLocalSendToFreee(e.target.checked)}
                />
              }
              label="freeeに自動送信する"
            />
          </Box>

          <Alert severity="info">
            指定された日時に自動で請求処理が実行されます。
            実行結果は通知またはダッシュボードで確認できます。
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          キャンセル
        </Button>
        <Button
          onClick={handleSchedule}
          variant="contained"
          disabled={loading || !localScheduledAt}
          startIcon={loading ? <CircularProgress size={20} /> : <Schedule />}
        >
          スケジュール設定
        </Button>
      </DialogActions>
    </Dialog>
  );
};
