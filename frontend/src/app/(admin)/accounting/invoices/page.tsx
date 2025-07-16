// 請求書一覧画面（経理機能統合版）

"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  Select,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Alert,
  Skeleton,
  Stack,
  Container,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Divider,
  useTheme,
  alpha,
  LinearProgress,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Autocomplete,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Receipt as ReceiptIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  GetApp as GetAppIcon,
  Sync as SyncIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  ExpandMore,
  Clear as ClearIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Archive as ArchiveIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { MonthPicker } from "../../../../components/features/accounting/MonthPicker";
import { ClientMultiSelect } from "../../../../components/features/accounting/ClientMultiSelect";
import { useAccountingErrorHandler } from "@/hooks/useAccountingErrorHandler";
import * as accountingApi from "@/api/accountingApi";
import { formatCurrency, formatDate } from "../../../../utils/format";
import {
  Invoice,
  InvoiceStatus,
  Client,
  ProjectGroup,
  BillingProcessResult,
} from "../../../../types/accounting";
import {
  BILLING_STATUS,
  BILLING_STATUS_LABELS,
  BILLING_STATUS_COLORS,
} from "../../../../constants/accounting";

// ========== 型定義 ==========

interface InvoiceListState {
  selectedMonth: string;
  selectedClients: string[];
  selectedStatuses: InvoiceStatus[];
  searchTerm: string;
  viewMode: "table" | "card";
  showFilters: boolean;
  sortBy: "invoice_date" | "due_date" | "amount" | "client_name";
  sortOrder: "asc" | "desc";
  selectedInvoices: string[];
  tabValue: number;
}

interface InvoiceActionMenuState {
  anchorEl: HTMLElement | null;
  invoice: Invoice | null;
}

interface BulkActionState {
  dialogOpen: boolean;
  actionType: "send" | "export" | "archive" | "delete" | null;
  processing: boolean;
}

// ========== ユーティリティ関数 ==========

// 請求書のフィルタリング
const filterInvoices = (
  invoices: Invoice[],
  searchTerm: string,
  selectedClients: string[],
  selectedStatuses: InvoiceStatus[],
  selectedMonth: string,
): Invoice[] => {
  return invoices.filter((invoice) => {
    // 検索フィルタ
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matches =
        invoice.invoiceNumber?.toLowerCase().includes(search) ||
        invoice.clientName?.toLowerCase().includes(search) ||
        invoice.projectName?.toLowerCase().includes(search);
      if (!matches) return false;
    }

    // クライアントフィルタ
    if (
      selectedClients.length > 0 &&
      !selectedClients.includes(invoice.clientId)
    ) {
      return false;
    }

    // ステータスフィルタ
    if (
      selectedStatuses.length > 0 &&
      !selectedStatuses.includes(invoice.status)
    ) {
      return false;
    }

    // 月フィルタ
    if (selectedMonth) {
      const invoiceMonth = invoice.invoiceDate?.slice(0, 7); // YYYY-MM
      if (invoiceMonth !== selectedMonth) return false;
    }

    return true;
  });
};

// 請求書のソート
const sortInvoices = (
  invoices: Invoice[],
  sortBy: string,
  sortOrder: string,
): Invoice[] => {
  const sorted = [...invoices];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "invoice_date":
        comparison =
          new Date(a.invoiceDate || 0).getTime() -
          new Date(b.invoiceDate || 0).getTime();
        break;
      case "due_date":
        comparison =
          new Date(a.dueDate || 0).getTime() -
          new Date(b.dueDate || 0).getTime();
        break;
      case "amount":
        comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
        break;
      case "client_name":
        comparison = (a.clientName || "").localeCompare(
          b.clientName || "",
          "ja",
        );
        break;
      default:
        return 0;
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });

  return sorted;
};

// ステータスアイコンの取得
const getStatusIcon = (status: InvoiceStatus): React.ReactNode => {
  switch (status) {
    case "draft":
      return <EditIcon color="disabled" />;
    case "sent":
      return <SendIcon color="warning" />;
    case "paid":
      return <CheckCircleIcon color="success" />;
    case "overdue":
      return <ErrorIcon color="error" />;
    case "cancelled":
      return <ArchiveIcon color="disabled" />;
    default:
      return <ReceiptIcon />;
  }
};

// タブの定義
const tabs = [
  { label: "すべて", value: "all" },
  { label: "下書き", value: "draft" },
  { label: "送付済み", value: "sent" },
  { label: "支払済み", value: "paid" },
  { label: "支払期限超過", value: "overdue" },
];

// ========== メインコンポーネント ==========

export default function AccountingInvoiceListPage() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { handleSubmissionError } = useAccountingErrorHandler();

  // 状態管理
  const [state, setState] = useState<InvoiceListState>({
    selectedMonth: "",
    selectedClients: [],
    selectedStatuses: [],
    searchTerm: "",
    viewMode: "table",
    showFilters: false,
    sortBy: "invoice_date",
    sortOrder: "desc",
    selectedInvoices: [],
    tabValue: 0,
  });

  const [actionMenu, setActionMenu] = useState<InvoiceActionMenuState>({
    anchorEl: null,
    invoice: null,
  });

  const [bulkAction, setBulkAction] = useState<BulkActionState>({
    dialogOpen: false,
    actionType: null,
    processing: false,
  });

  // データ取得
  const {
    data: invoices = [],
    isLoading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ["accounting", "invoices"],
    queryFn: () => accountingApi.getInvoiceHistory(),
  });

  const {
    data: clients = [],
    isLoading: clientsLoading,
    error: clientsError,
  } = useQuery({
    queryKey: ["accounting", "clients"],
    queryFn: () => accountingApi.getClients(),
  });

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ["accounting", "invoices-summary"],
    queryFn: () => accountingApi.getInvoiceSummary(),
  });

  // ミューテーション
  const updateInvoiceStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      accountingApi.updateInvoiceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "invoices"] });
      setActionMenu({ anchorEl: null, invoice: null });
    },
    onError: (error) => {
      handleSubmissionError(error, "ステータス更新");
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: ({
      action,
      invoiceIds,
    }: {
      action: string;
      invoiceIds: string[];
    }) => accountingApi.bulkInvoiceAction(action, invoiceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "invoices"] });
      setBulkAction({ dialogOpen: false, actionType: null, processing: false });
      setState((prev) => ({ ...prev, selectedInvoices: [] }));
    },
    onError: (error) => {
      setBulkAction((prev) => ({ ...prev, processing: false }));
      handleSubmissionError(error, "バルク操作");
    },
  });

  // フィルタリング・ソートされたデータ
  const processedInvoices = useMemo(() => {
    let filtered = filterInvoices(
      invoices,
      state.searchTerm,
      state.selectedClients,
      state.selectedStatuses,
      state.selectedMonth,
    );

    // タブフィルタ
    const currentTab = tabs[state.tabValue];
    if (currentTab.value !== "all") {
      filtered = filtered.filter(
        (invoice) => invoice.status === currentTab.value,
      );
    }

    return sortInvoices(filtered, state.sortBy, state.sortOrder);
  }, [
    invoices,
    state.searchTerm,
    state.selectedClients,
    state.selectedStatuses,
    state.selectedMonth,
    state.tabValue,
    state.sortBy,
    state.sortOrder,
  ]);

  // イベントハンドラー
  const handleSearchChange = (value: string) => {
    setState((prev) => ({ ...prev, searchTerm: value }));
  };

  const handleMonthChange = (month: string) => {
    setState((prev) => ({ ...prev, selectedMonth: month }));
  };

  const handleClientChange = (clientIds: string[]) => {
    setState((prev) => ({ ...prev, selectedClients: clientIds }));
  };

  const handleStatusChange = (statuses: InvoiceStatus[]) => {
    setState((prev) => ({ ...prev, selectedStatuses: statuses }));
  };

  const handleSortChange = (sortBy: string) => {
    setState((prev) => ({
      ...prev,
      sortBy: sortBy as any,
      sortOrder:
        prev.sortBy === sortBy && prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setState((prev) => ({ ...prev, tabValue: newValue }));
  };

  const handleInvoiceSelect = (invoiceId: string, selected: boolean) => {
    setState((prev) => ({
      ...prev,
      selectedInvoices: selected
        ? [...prev.selectedInvoices, invoiceId]
        : prev.selectedInvoices.filter((id) => id !== invoiceId),
    }));
  };

  const handleSelectAll = (selected: boolean) => {
    setState((prev) => ({
      ...prev,
      selectedInvoices: selected ? processedInvoices.map((inv) => inv.id) : [],
    }));
  };

  const handleActionMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    invoice: Invoice,
  ) => {
    setActionMenu({ anchorEl: event.currentTarget, invoice });
  };

  const handleActionMenuClose = () => {
    setActionMenu({ anchorEl: null, invoice: null });
  };

  const handleStatusUpdate = async (status: InvoiceStatus) => {
    if (!actionMenu.invoice) return;
    await updateInvoiceStatusMutation.mutateAsync({
      id: actionMenu.invoice.id,
      status,
    });
  };

  const handleBulkAction = (
    actionType: "send" | "export" | "archive" | "delete",
  ) => {
    setBulkAction({ dialogOpen: true, actionType, processing: false });
  };

  const handleBulkActionConfirm = async () => {
    if (!bulkAction.actionType) return;

    setBulkAction((prev) => ({ ...prev, processing: true }));
    await bulkActionMutation.mutateAsync({
      action: bulkAction.actionType,
      invoiceIds: state.selectedInvoices,
    });
  };

  const handleExportPDF = async (invoice: Invoice) => {
    try {
      await accountingApi.exportInvoicePDF(invoice.id);
      handleActionMenuClose();
    } catch (error) {
      handleSubmissionError(error, "PDF出力");
    }
  };

  const handleSendToFreee = async (invoice: Invoice) => {
    try {
      await accountingApi.sendInvoiceToFreee(invoice.id);
      handleActionMenuClose();
      refetchInvoices();
    } catch (error) {
      handleSubmissionError(error, "freee送信");
    }
  };

  const handleRefresh = () => {
    refetchInvoices();
  };

  // エラー表示
  if (invoicesError) {
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
          請求書データの読み込みに失敗しました
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
              請求書一覧
            </Typography>
            <Typography variant="body1" color="text.secondary">
              請求書の確認・管理を行います
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<GetAppIcon />}
              onClick={() => handleBulkAction("export")}
              disabled={state.selectedInvoices.length === 0}
            >
              エクスポート
            </Button>
            <Button
              variant="outlined"
              startIcon={<SyncIcon />}
              onClick={handleRefresh}
              disabled={invoicesLoading}
            >
              更新
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push("/admin/accounting/billing")}
            >
              新規請求処理
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* サマリーカード */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <ReceiptIcon color="primary" />
                  <Box>
                    <Typography variant="h5" fontWeight={600}>
                      {summary.totalInvoices || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      総請求書数
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <AttachMoneyIcon color="success" />
                  <Box>
                    <Typography
                      variant="h5"
                      fontWeight={600}
                      color="success.main"
                    >
                      {formatCurrency(summary.totalAmount || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      総請求額
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <CheckCircleIcon color="success" />
                  <Box>
                    <Typography variant="h5" fontWeight={600}>
                      {summary.paidInvoices || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      支払済み
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <WarningIcon color="warning" />
                  <Box>
                    <Typography
                      variant="h5"
                      fontWeight={600}
                      color="warning.main"
                    >
                      {summary.overdueInvoices || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      支払期限超過
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* フィルター・検索 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            {/* 検索バー */}
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                size="small"
                placeholder="請求書番号・取引先・プロジェクト名で検索..."
                value={state.searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: state.searchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => handleSearchChange("")}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ flexGrow: 1, maxWidth: 400 }}
              />

              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    showFilters: !prev.showFilters,
                  }))
                }
                startIcon={<FilterListIcon />}
              >
                フィルター
              </Button>

              <Stack direction="row" spacing={1}>
                <IconButton
                  size="small"
                  onClick={() =>
                    setState((prev) => ({ ...prev, viewMode: "table" }))
                  }
                  color={state.viewMode === "table" ? "primary" : "default"}
                >
                  <ViewListIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() =>
                    setState((prev) => ({ ...prev, viewMode: "card" }))
                  }
                  color={state.viewMode === "card" ? "primary" : "default"}
                >
                  <ViewModuleIcon />
                </IconButton>
              </Stack>
            </Stack>

            {/* 詳細フィルター */}
            {state.showFilters && (
              <Accordion expanded>
                <AccordionSummary>
                  <Typography variant="body2">詳細フィルター</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <MonthPicker
                        value={state.selectedMonth}
                        onChange={handleMonthChange}
                        label="請求月"
                        placeholder="月を選択"
                        size="small"
                        showClearButton
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <ClientMultiSelect
                        value={state.selectedClients}
                        onChange={handleClientChange}
                        clients={clients}
                        loading={clientsLoading}
                        error={!!clientsError}
                        label="取引先"
                        placeholder="取引先で絞り込み"
                        size="small"
                        fullWidth={false}
                        searchable={false}
                        allowSelectAll={false}
                        showAvatars={false}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Autocomplete
                        multiple
                        size="small"
                        options={
                          Object.keys(BILLING_STATUS_LABELS) as InvoiceStatus[]
                        }
                        value={state.selectedStatuses}
                        onChange={(_, newValue) => handleStatusChange(newValue)}
                        getOptionLabel={(option) =>
                          BILLING_STATUS_LABELS[option]
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="ステータス"
                            placeholder="ステータスで絞り込み"
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              variant="outlined"
                              label={BILLING_STATUS_LABELS[option]}
                              size="small"
                              {...getTagProps({ index })}
                              key={option}
                            />
                          ))
                        }
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* タブ */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={state.tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.value}
              label={
                <Badge
                  badgeContent={
                    tab.value === "all"
                      ? processedInvoices.length
                      : processedInvoices.filter(
                          (inv) => inv.status === tab.value,
                        ).length
                  }
                  color="primary"
                >
                  {tab.label}
                </Badge>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* バルクアクション */}
      {state.selectedInvoices.length > 0 && (
        <Paper
          sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.05) }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body1">
              {state.selectedInvoices.length}件選択中
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleBulkAction("send")}
                startIcon={<SendIcon />}
              >
                一括送信
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleBulkAction("export")}
                startIcon={<GetAppIcon />}
              >
                一括エクスポート
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleBulkAction("archive")}
                startIcon={<ArchiveIcon />}
              >
                アーカイブ
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* 請求書一覧 */}
      <Card>
        {invoicesLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              請求書データを読み込み中...
            </Typography>
          </Box>
        ) : processedInvoices.length === 0 ? (
          <Box sx={{ p: 8, textAlign: "center" }}>
            <ReceiptIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              請求書が見つかりません
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {state.searchTerm || state.selectedClients.length > 0
                ? "検索条件を変更してください"
                : "請求処理を実行して請求書を作成してください"}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push("/admin/accounting/billing")}
            >
              請求処理を開始
            </Button>
          </Box>
        ) : state.viewMode === "table" ? (
          <InvoiceTable
            invoices={processedInvoices}
            selectedInvoices={state.selectedInvoices}
            sortBy={state.sortBy}
            sortOrder={state.sortOrder}
            onSelect={handleInvoiceSelect}
            onSelectAll={handleSelectAll}
            onSort={handleSortChange}
            onActionMenu={handleActionMenuOpen}
          />
        ) : (
          <InvoiceCardList
            invoices={processedInvoices}
            selectedInvoices={state.selectedInvoices}
            onSelect={handleInvoiceSelect}
            onActionMenu={handleActionMenuOpen}
          />
        )}
      </Card>

      {/* アクションメニュー */}
      <Menu
        anchorEl={actionMenu.anchorEl}
        open={Boolean(actionMenu.anchorEl)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={() => handleExportPDF(actionMenu.invoice!)}>
          <PdfIcon sx={{ mr: 1 }} fontSize="small" />
          PDF出力
        </MenuItem>
        <MenuItem onClick={() => handleSendToFreee(actionMenu.invoice!)}>
          <SyncIcon sx={{ mr: 1 }} fontSize="small" />
          freeeに送信
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleStatusUpdate("sent")}>
          <SendIcon sx={{ mr: 1 }} fontSize="small" />
          送付済みにする
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate("paid")}>
          <CheckCircleIcon sx={{ mr: 1 }} fontSize="small" />
          支払済みにする
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate("cancelled")}>
          <ArchiveIcon sx={{ mr: 1 }} fontSize="small" />
          キャンセル
        </MenuItem>
      </Menu>

      {/* バルクアクション確認ダイアログ */}
      <Dialog
        open={bulkAction.dialogOpen}
        onClose={() =>
          setBulkAction({
            dialogOpen: false,
            actionType: null,
            processing: false,
          })
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>バルク操作の確認</DialogTitle>
        <DialogContent>
          <Typography>
            選択された{state.selectedInvoices.length}件の請求書に対して
            {bulkAction.actionType === "send" && "送信"}
            {bulkAction.actionType === "export" && "エクスポート"}
            {bulkAction.actionType === "archive" && "アーカイブ"}
            {bulkAction.actionType === "delete" && "削除"}
            処理を実行しますか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setBulkAction({
                dialogOpen: false,
                actionType: null,
                processing: false,
              })
            }
            disabled={bulkAction.processing}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleBulkActionConfirm}
            variant="contained"
            disabled={bulkAction.processing}
            startIcon={
              bulkAction.processing ? <LinearProgress size={20} /> : undefined
            }
          >
            実行
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

// ========== 請求書テーブル ==========

interface InvoiceTableProps {
  invoices: Invoice[];
  selectedInvoices: string[];
  sortBy: string;
  sortOrder: string;
  onSelect: (invoiceId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onSort: (sortBy: string) => void;
  onActionMenu: (
    event: React.MouseEvent<HTMLElement>,
    invoice: Invoice,
  ) => void;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  selectedInvoices,
  sortBy,
  sortOrder,
  onSelect,
  onSelectAll,
  onSort,
  onActionMenu,
}) => {
  const allSelected =
    invoices.length > 0 && selectedInvoices.length === invoices.length;
  const indeterminate =
    selectedInvoices.length > 0 && selectedInvoices.length < invoices.length;

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={indeterminate}
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
            </TableCell>
            <TableCell>
              <Button
                onClick={() => onSort("invoice_date")}
                endIcon={
                  sortBy === "invoice_date" && sortOrder === "desc" ? "↓" : "↑"
                }
              >
                請求書番号
              </Button>
            </TableCell>
            <TableCell>
              <Button
                onClick={() => onSort("client_name")}
                endIcon={
                  sortBy === "client_name" && sortOrder === "desc" ? "↓" : "↑"
                }
              >
                取引先
              </Button>
            </TableCell>
            <TableCell>
              <Button
                onClick={() => onSort("amount")}
                endIcon={
                  sortBy === "amount" && sortOrder === "desc" ? "↓" : "↑"
                }
              >
                請求額
              </Button>
            </TableCell>
            <TableCell>
              <Button
                onClick={() => onSort("invoice_date")}
                endIcon={
                  sortBy === "invoice_date" && sortOrder === "desc" ? "↓" : "↑"
                }
              >
                請求日
              </Button>
            </TableCell>
            <TableCell>
              <Button
                onClick={() => onSort("due_date")}
                endIcon={
                  sortBy === "due_date" && sortOrder === "desc" ? "↓" : "↑"
                }
              >
                支払期限
              </Button>
            </TableCell>
            <TableCell>ステータス</TableCell>
            <TableCell align="center">アクション</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id} hover>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedInvoices.includes(invoice.id)}
                  onChange={(e) => onSelect(invoice.id, e.target.checked)}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  {invoice.invoiceNumber}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{invoice.clientName}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(invoice.totalAmount || 0)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatDate(invoice.invoiceDate)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatDate(invoice.dueDate)}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={BILLING_STATUS_LABELS[invoice.status]}
                  color={BILLING_STATUS_COLORS[invoice.status] as any}
                  icon={getStatusIcon(invoice.status)}
                />
              </TableCell>
              <TableCell align="center">
                <IconButton
                  size="small"
                  onClick={(e) => onActionMenu(e, invoice)}
                >
                  <MoreVertIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ========== 請求書カードリスト ==========

interface InvoiceCardListProps {
  invoices: Invoice[];
  selectedInvoices: string[];
  onSelect: (invoiceId: string, selected: boolean) => void;
  onActionMenu: (
    event: React.MouseEvent<HTMLElement>,
    invoice: Invoice,
  ) => void;
}

const InvoiceCardList: React.FC<InvoiceCardListProps> = ({
  invoices,
  selectedInvoices,
  onSelect,
  onActionMenu,
}) => {
  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {invoices.map((invoice) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={invoice.id}>
            <Card
              sx={{
                position: "relative",
                cursor: "pointer",
                "&:hover": { boxShadow: 4 },
              }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Checkbox
                    size="small"
                    checked={selectedInvoices.includes(invoice.id)}
                    onChange={(e) => onSelect(invoice.id, e.target.checked)}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => onActionMenu(e, invoice)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Stack>

                <Typography variant="h6" gutterBottom>
                  {invoice.invoiceNumber}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {invoice.clientName}
                </Typography>

                <Typography
                  variant="h5"
                  fontWeight={600}
                  color="primary.main"
                  gutterBottom
                >
                  {formatCurrency(invoice.totalAmount || 0)}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    請求日: {formatDate(invoice.invoiceDate)}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    支払期限: {formatDate(invoice.dueDate)}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={BILLING_STATUS_LABELS[invoice.status]}
                  color={BILLING_STATUS_COLORS[invoice.status] as any}
                  icon={getStatusIcon(invoice.status)}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
