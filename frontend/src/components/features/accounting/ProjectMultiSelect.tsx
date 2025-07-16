// プロジェクト複数選択コンポーネント

import React, { useMemo, useState } from "react";
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  Avatar,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  FormLabel,
  FormHelperText,
  InputAdornment,
  IconButton,
  Tooltip,
  Stack,
  Checkbox,
  ListItemText,
  Paper,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Assignment,
  Search,
  Clear,
  CheckBox,
  CheckBoxOutlineBlank,
  Add,
  FilterList,
  Sort,
  Business,
  ExpandMore,
  CalendarToday,
  CheckCircle,
  Error,
  Pause,
} from "@mui/icons-material";
import { Project, Client } from "../../../types/accounting";
import { formatDate } from "../../../utils/format";

// ========== 型定義 ==========

export interface ProjectMultiSelectProps {
  value: string[];
  onChange: (projectIds: string[]) => void;
  projects: Project[];
  clients?: Client[];
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  maxSelections?: number;
  allowSelectAll?: boolean;
  showAvatars?: boolean;
  showInactive?: boolean;
  clientFilter?: string[];
  onCreateNew?: () => void;
  onRefresh?: () => void;
  variant?: "outlined" | "filled" | "standard";
  size?: "small" | "medium";
  fullWidth?: boolean;
  readOnly?: boolean;
  searchable?: boolean;
  groupBy?: "client" | "status" | "none";
  sortBy?: "name" | "created" | "endDate" | "none";
  filterBy?: {
    status?: string[];
    search?: string;
    dateRange?: {
      from?: string;
      to?: string;
    };
  };
}

export interface ProjectOption extends Project {
  groupLabel?: string;
  clientName?: string;
}

// ========== ユーティリティ関数 ==========

// プロジェクトのフィルタリング
const filterProjects = (
  projects: Project[],
  clients: Client[],
  showInactive: boolean,
  searchTerm: string,
  clientFilter: string[],
  filterBy?: {
    status?: string[];
    search?: string;
    dateRange?: { from?: string; to?: string };
  },
): Project[] => {
  return projects.filter((project) => {
    // アクティブ状態のフィルタ
    if (!showInactive && !project.isActive) {
      return false;
    }

    // クライアントフィルタ
    if (clientFilter.length > 0 && !clientFilter.includes(project.clientId)) {
      return false;
    }

    // ステータスフィルタ
    if (filterBy?.status && filterBy.status.length > 0) {
      if (!filterBy.status.includes(project.status)) {
        return false;
      }
    }

    // 日付範囲フィルタ
    if (filterBy?.dateRange) {
      if (filterBy.dateRange.from && project.startDate) {
        if (project.startDate < filterBy.dateRange.from) {
          return false;
        }
      }
      if (filterBy.dateRange.to && project.endDate) {
        if (project.endDate > filterBy.dateRange.to) {
          return false;
        }
      }
    }

    // 検索フィルタ
    const searchQuery = filterBy?.search || searchTerm;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const client = clients.find((c) => c.id === project.clientId);
      return (
        project.name.toLowerCase().includes(search) ||
        project.description?.toLowerCase().includes(search) ||
        client?.name.toLowerCase().includes(search)
      );
    }

    return true;
  });
};

// プロジェクトのソート
const sortProjects = (projects: Project[], sortBy: string): Project[] => {
  const sorted = [...projects];

  switch (sortBy) {
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    case "created":
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case "endDate":
      return sorted.sort((a, b) => {
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      });
    default:
      return sorted;
  }
};

// プロジェクトのグループ化
const groupProjects = (
  projects: Project[],
  clients: Client[],
  groupBy: string,
): ProjectOption[] => {
  if (groupBy === "none") {
    return projects.map((project) => ({
      ...project,
      clientName: clients.find((c) => c.id === project.clientId)?.name,
    }));
  }

  const grouped = projects.reduce(
    (acc, project) => {
      let groupLabel = "";
      const client = clients.find((c) => c.id === project.clientId);

      switch (groupBy) {
        case "client":
          groupLabel = client?.name || "不明な取引先";
          break;
        case "status":
          groupLabel = getStatusLabel(project.status);
          break;
        default:
          groupLabel = "その他";
      }

      if (!acc[groupLabel]) {
        acc[groupLabel] = [];
      }
      acc[groupLabel].push({
        ...project,
        groupLabel,
        clientName: client?.name,
      });
      return acc;
    },
    {} as Record<string, ProjectOption[]>,
  );

  // フラット化してグループラベル順に並べる
  const result: ProjectOption[] = [];
  Object.keys(grouped)
    .sort()
    .forEach((groupLabel) => {
      result.push(...grouped[groupLabel]);
    });

  return result;
};

// ステータスラベルの取得
const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: "進行中",
    completed: "完了",
    paused: "中断",
    cancelled: "キャンセル",
    draft: "下書き",
  };
  return statusMap[status] || status;
};

// ステータスアイコンの取得
const getStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case "active":
      return <Assignment color="primary" />;
    case "completed":
      return <CheckCircle color="success" />;
    case "paused":
      return <Pause color="warning" />;
    case "cancelled":
      return <Error color="error" />;
    default:
      return <Assignment />;
  }
};

// プロジェクト名の取得（表示用）
const getProjectDisplayName = (project: Project): string => {
  return project.name;
};

// プロジェクトの説明テキスト取得
const getProjectDescription = (
  project: ProjectOption,
  showClient: boolean = true,
): string => {
  const parts: string[] = [];
  if (showClient && project.clientName) parts.push(project.clientName);
  if (project.description) parts.push(project.description);
  if (project.endDate) parts.push(`終了予定: ${formatDate(project.endDate)}`);
  if (!project.isActive) parts.push("非アクティブ");
  return parts.join(" • ");
};

// ========== メインコンポーネント ==========

export const ProjectMultiSelect: React.FC<ProjectMultiSelectProps> = ({
  value,
  onChange,
  projects,
  clients = [],
  loading = false,
  error = false,
  errorMessage,
  label = "プロジェクト",
  placeholder = "プロジェクトを選択してください",
  helperText,
  required = false,
  disabled = false,
  maxSelections,
  allowSelectAll = true,
  showAvatars = true,
  showInactive = false,
  clientFilter = [],
  onCreateNew,
  onRefresh,
  variant = "outlined",
  size = "medium",
  fullWidth = true,
  readOnly = false,
  searchable = true,
  groupBy = "none",
  sortBy = "name",
  filterBy = {} as {
    status?: string[];
    search?: string;
    dateRange?: { from?: string; to?: string };
  },
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactiveLocal, setShowInactiveLocal] = useState(showInactive);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // フィルタリング、ソート、グループ化されたプロジェクト
  const processedProjects = useMemo(() => {
    let filtered = filterProjects(
      projects,
      clients,
      showInactiveLocal,
      searchTerm,
      clientFilter,
      {
        ...filterBy,
        status: (filterBy?.status || statusFilter) as string[],
      },
    );
    filtered = sortProjects(filtered, sortBy);
    return groupProjects(filtered, clients, groupBy);
  }, [
    projects,
    clients,
    showInactiveLocal,
    searchTerm,
    clientFilter,
    filterBy,
    statusFilter,
    sortBy,
    groupBy,
  ]);

  // 選択されたプロジェクト
  const selectedProjects = useMemo(() => {
    return projects.filter((project) => value.includes(project.id));
  }, [projects, value]);

  // 利用可能なステータス
  const availableStatuses = useMemo(() => {
    const statuses = new Set(projects.map((p) => p.status));
    return Array.from(statuses).map((status) => ({
      value: status,
      label: getStatusLabel(status as string),
    }));
  }, [projects]);

  // 全選択/全解除
  const handleSelectAll = () => {
    if (selectedProjects.length === processedProjects.length) {
      // 全解除
      onChange([]);
    } else {
      // 全選択
      const allIds = processedProjects.map((project) => project.id);
      onChange(allIds);
    }
  };

  // 選択制限チェック
  const isSelectionLimited = (newValue: Project[]) => {
    if (!maxSelections) return false;
    return newValue.length > maxSelections;
  };

  // 選択変更ハンドラ
  const handleChange = (event: any, newValue: Project[]) => {
    if (isSelectionLimited(newValue)) {
      return; // 制限を超える場合は変更しない
    }
    onChange(newValue.map((project) => project.id));
  };

  // ステータスフィルター変更
  const handleStatusFilterChange = (statuses: string[]) => {
    setStatusFilter(statuses);
  };

  // カスタムオプションレンダリング
  const renderOption = (
    props: any,
    option: ProjectOption,
    { selected }: any,
  ) => (
    <li {...props}>
      <Box
        component="div"
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          py: 1,
        }}
      >
        <Checkbox
          icon={<CheckBoxOutlineBlank fontSize="small" />}
          checkedIcon={<CheckBox fontSize="small" />}
          style={{ marginRight: 8 }}
          checked={selected}
          size={size as "small" | "medium" | "large"}
        />
        {showAvatars && (
          <Avatar
            sx={{
              width: size === "small" ? 24 : 32,
              height: size === "small" ? 24 : 32,
              mr: 1,
              bgcolor: option.isActive ? "primary.main" : "grey.400",
            }}
          >
            {getStatusIcon(option.status)}
          </Avatar>
        )}
        <Box flex={1}>
          <Typography variant="body2" fontWeight={500}>
            {getProjectDisplayName(option)}
          </Typography>
          {getProjectDescription(option, groupBy !== "client") && (
            <Typography variant="caption" color="text.secondary">
              {getProjectDescription(option, groupBy !== "client")}
            </Typography>
          )}
        </Box>
      </Box>
    </li>
  );

  // カスタムタグレンダリング
  const renderTags = (tagValue: Project[], getTagProps: any) =>
    tagValue.map((option, index) => {
      const client = clients.find((c) => c.id === option.clientId);
      return (
        <Chip
          variant="outlined"
          label={getProjectDisplayName(option)}
          size={size as "small" | "medium"}
          avatar={
            showAvatars ? (
              <Avatar
                sx={{ bgcolor: option.isActive ? "primary.main" : "grey.400" }}
              >
                {getStatusIcon(option.status)}
              </Avatar>
            ) : undefined
          }
          {...getTagProps({ index })}
          key={option.id}
          sx={{
            opacity: option.isActive ? 1 : 0.7,
          }}
        />
      );
    });

  // グループ化のラベル表示
  const getOptionGroupLabel = (option: ProjectOption) =>
    option.groupLabel || "";

  // エラー表示
  if (error && !loading) {
    return (
      <FormControl fullWidth={fullWidth} error>
        <FormLabel component="legend">{label}</FormLabel>
        <Alert severity="error" sx={{ mt: 1 }}>
          {errorMessage || "プロジェクトの読み込みに失敗しました"}
          {onRefresh && (
            <Button
              size="small"
              onClick={onRefresh}
              sx={{ ml: 1 }}
              startIcon={<Search />}
            >
              再読み込み
            </Button>
          )}
        </Alert>
      </FormControl>
    );
  }

  return (
    <FormControl fullWidth={fullWidth} required={required}>
      {label && <FormLabel component="legend">{label}</FormLabel>}

      <Box sx={{ mt: label ? 1 : 0 }}>
        {/* コントロールバー */}
        {(searchable || allowSelectAll || onCreateNew) && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            {searchable && (
              <TextField
                size="small"
                placeholder="プロジェクトを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchTerm("")}
                      >
                        <Clear fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ flexGrow: 1 }}
              />
            )}

            {allowSelectAll && processedProjects.length > 0 && (
              <Tooltip
                title={
                  selectedProjects.length === processedProjects.length
                    ? "全て選択解除"
                    : "全て選択"
                }
              >
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSelectAll}
                  disabled={disabled}
                >
                  {selectedProjects.length === processedProjects.length
                    ? "全解除"
                    : "全選択"}
                </Button>
              </Tooltip>
            )}

            {onCreateNew && (
              <Tooltip title="新しいプロジェクトを作成">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={onCreateNew}
                  startIcon={<Add />}
                  disabled={disabled}
                >
                  新規作成
                </Button>
              </Tooltip>
            )}
          </Stack>
        )}

        {/* フィルターセクション */}
        <Accordion sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FilterList fontSize="small" />
              <Typography variant="body2">フィルター</Typography>
              {(statusFilter.length > 0 ||
                !showInactiveLocal !== !showInactive) && (
                <Chip size="small" label="適用中" color="primary" />
              )}
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {/* 非アクティブフィルター */}
              {projects.some((p) => !p.isActive) && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    表示設定
                  </Typography>
                  <Box>
                    <Tooltip title="非アクティブなプロジェクトも表示">
                      <Chip
                        size="small"
                        label="非アクティブも表示"
                        variant={showInactiveLocal ? "filled" : "outlined"}
                        onClick={() => setShowInactiveLocal(!showInactiveLocal)}
                        clickable
                        disabled={disabled}
                      />
                    </Tooltip>
                  </Box>
                </Box>
              )}

              {/* ステータスフィルター */}
              {availableStatuses.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    ステータス
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {availableStatuses.map((status) => (
                      <Chip
                        key={status.value as string}
                        size="small"
                        label={status.label}
                        variant={
                          statusFilter.includes(status.value as string)
                            ? "filled"
                            : "outlined"
                        }
                        onClick={() => {
                          const newFilter = statusFilter.includes(
                            status.value as string,
                          )
                            ? statusFilter.filter(
                                (s) => s !== (status.value as string),
                              )
                            : [...statusFilter, status.value as string];
                          handleStatusFilterChange(newFilter);
                        }}
                        clickable
                        disabled={disabled}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* フィルタークリア */}
              {(statusFilter.length > 0 ||
                !showInactiveLocal !== !showInactive) && (
                <Box>
                  <Button
                    size="small"
                    onClick={() => {
                      setStatusFilter([]);
                      setShowInactiveLocal(showInactive);
                    }}
                  >
                    フィルターをクリア
                  </Button>
                </Box>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* メイン選択コンポーネント */}
        <Autocomplete
          multiple
          value={selectedProjects}
          onChange={handleChange}
          options={processedProjects}
          loading={loading}
          disabled={disabled || readOnly}
          getOptionLabel={getProjectDisplayName}
          groupBy={groupBy !== "none" ? getOptionGroupLabel : undefined}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderOption={renderOption}
          renderTags={renderTags}
          renderInput={(params) => (
            <TextField
              {...params}
              variant={variant as "outlined" | "filled" | "standard"}
              placeholder={selectedProjects.length > 0 ? "" : placeholder}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading && <CircularProgress color="inherit" size={20} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          PaperComponent={(props) => (
            <Paper {...props}>
              {props.children}
              {/* フッター情報 */}
              {processedProjects.length > 0 && (
                <>
                  <Divider />
                  <Box p={1}>
                    <Typography variant="caption" color="text.secondary">
                      {selectedProjects.length} / {processedProjects.length}{" "}
                      件選択中
                      {maxSelections && ` (最大 ${maxSelections} 件)`}
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>
          )}
          ChipProps={{
            size: size as "small" | "medium",
          }}
          size={size as "small" | "medium"}
          fullWidth={fullWidth}
          disableCloseOnSelect
          limitTags={5}
          noOptionsText={
            loading
              ? "読み込み中..."
              : searchTerm || statusFilter.length > 0
                ? "該当するプロジェクトが見つかりません"
                : "プロジェクトがありません"
          }
        />

        {/* ヘルパーテキストとエラー */}
        {(helperText || maxSelections) && (
          <FormHelperText>
            {helperText}
            {maxSelections && (
              <>
                {helperText && " "}
                (最大 {maxSelections} 件まで選択可能)
              </>
            )}
          </FormHelperText>
        )}

        {/* 選択制限警告 */}
        {maxSelections && selectedProjects.length >= maxSelections && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            選択可能な上限数に達しています ({maxSelections} 件)
          </Alert>
        )}
      </Box>
    </FormControl>
  );
};

// ========== シンプル版コンポーネント ==========

export interface SimpleProjectMultiSelectProps {
  value: string[];
  onChange: (projectIds: string[]) => void;
  projects: Project[];
  clients?: Client[];
  clientFilter?: string[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

export const SimpleProjectMultiSelect: React.FC<
  SimpleProjectMultiSelectProps
> = ({
  value,
  onChange,
  projects,
  clients = [],
  clientFilter = [],
  label = "プロジェクト",
  placeholder = "プロジェクトを選択",
  required = false,
  disabled = false,
  error = false,
  helperText,
}) => {
  // クライアントフィルターが指定されている場合は適用
  const filteredProjects = useMemo(() => {
    if (clientFilter.length === 0) {
      return projects.filter((p) => p.isActive);
    }
    return projects.filter(
      (p) => p.isActive && clientFilter.includes(p.clientId),
    );
  }, [projects, clientFilter]);

  const selectedProjects = filteredProjects.filter((project) =>
    value.includes(project.id),
  );

  return (
    <Autocomplete
      multiple
      value={selectedProjects}
      onChange={(_, newValue) => onChange(newValue.map((p) => p.id))}
      options={filteredProjects}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          error={error}
          helperText={helperText}
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => {
          const client = clients.find((c) => c.id === option.clientId);
          return (
            <Chip
              variant="outlined"
              label={option.name}
              {...getTagProps({ index })}
              key={option.id}
            />
          );
        })
      }
      disableCloseOnSelect
      size="small"
    />
  );
};

// ========== クライアント別プロジェクト選択コンポーネント ==========

export interface ClientProjectSelectProps {
  clientId: string;
  value: string[];
  onChange: (projectIds: string[]) => void;
  projects: Project[];
  label?: string;
  disabled?: boolean;
}

export const ClientProjectSelect: React.FC<ClientProjectSelectProps> = ({
  clientId,
  value,
  onChange,
  projects,
  label = "プロジェクト",
  disabled = false,
}) => {
  const clientProjects = projects.filter(
    (p) => p.clientId === clientId && p.isActive,
  );

  return (
    <SimpleProjectMultiSelect
      value={value}
      onChange={onChange}
      projects={clientProjects}
      label={label}
      disabled={disabled}
      placeholder="プロジェクトを選択"
    />
  );
};
