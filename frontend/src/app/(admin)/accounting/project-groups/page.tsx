// プロジェクトグループ一覧画面

"use client";

// Avoid static prerender to prevent build-time evaluation issues while migrating.
export const dynamic = "force-dynamic";

import React, { useState, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
  Skeleton,
  // Use Grid v2 for MUI v7 typing
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  GroupAdd,
  Search,
  Clear,
  FilterList,
  Sort,
  MoreVert,
  Edit,
  Delete,
  Archive,
  Unarchive,
  Business,
  Assignment,
  Schedule,
  AttachMoney,
  KeyboardArrowDown,
  Add,
  Refresh,
  ImportExport,
  Settings,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProjectGroupDialog } from "@/components/features/accounting/ProjectGroupDialog";
import { ClientMultiSelect } from "@/components/features/accounting/ClientMultiSelect";
import { ProjectMultiSelect } from "@/components/features/accounting/ProjectMultiSelect";
import { useProjectGroups } from "@/hooks/useProjectGroups";
import { useAccountingErrorHandler } from "@/hooks/useAccountingErrorHandler";
import { accountingApi } from "@/api/accountingApi";
import { formatCurrency, formatDate } from "@/utils/format";
import {
  ProjectGroup,
  CreateProjectGroupRequest,
  UpdateProjectGroupRequest,
  Client,
  Project,
} from "@/types/accounting";
import {
  BILLING_CALCULATION_TYPE_LABELS,
  PROJECT_GROUP_STATUS,
} from "@/constants/accounting";

// ========== 型定義 ==========

interface ListState {
  searchTerm: string;
  showInactive: boolean;
  selectedClients: string[];
  selectedProjects: string[];
  sortBy: "name" | "created" | "updated" | "billingAmount";
  sortOrder: "asc" | "desc";
  filterAnchorEl: HTMLElement | null;
  sortAnchorEl: HTMLElement | null;
}

interface ProjectGroupDialogState {
  open: boolean;
  mode: "create" | "edit";
  projectGroup: ProjectGroup | null;
}

interface DeleteDialogState {
  open: boolean;
  projectGroup: ProjectGroup | null;
}

// ========== ユーティリティ関数 ==========

// プロジェクトグループのフィルタリング
const filterProjectGroups = (
  projectGroups: ProjectGroup[],
  searchTerm: string,
  showInactive: boolean,
  selectedClients: string[],
  selectedProjects: string[],
  clients: Client[],
  projects: Project[],
): ProjectGroup[] => {
  return projectGroups.filter((group) => {
    // アクティブ状態のフィルタ
    if (!showInactive && !group.isActive) {
      return false;
    }

    // クライアントフィルタ
    if (selectedClients.length > 0) {
      if (!group.clientIds.some((id) => selectedClients.includes(id))) {
        return false;
      }
    }

    // プロジェクトフィルタ
    if (selectedProjects.length > 0) {
      if (!group.projectIds.some((id) => selectedProjects.includes(id))) {
        return false;
      }
    }

    // 検索フィルタ
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const groupClients = clients.filter((c) =>
        group.clientIds.includes(c.id),
      );
      const groupProjects = projects.filter((p) =>
        group.projectIds.includes(p.id),
      );

      return (
        group.name.toLowerCase().includes(search) ||
        group.description?.toLowerCase().includes(search) ||
        groupClients.some((c) => c.name.toLowerCase().includes(search)) ||
        groupProjects.some((p) => p.name.toLowerCase().includes(search))
      );
    }

    return true;
  });
};

// プロジェクトグループのソート
const sortProjectGroups = (
  projectGroups: ProjectGroup[],
  sortBy: string,
  sortOrder: string,
): ProjectGroup[] => {
  const sorted = [...projectGroups];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name, "ja");
        break;
      case "created":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "updated":
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case "billingAmount":
        comparison = (a.totalBillingAmount || 0) - (b.totalBillingAmount || 0);
        break;
      default:
        return 0;
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });

  return sorted;
};

// ステータスアイコンの取得
const getStatusIcon = (
  projectGroup: ProjectGroup,
): React.ReactElement | undefined => {
  if (!projectGroup.isActive) {
    return <Archive color="disabled" />;
  }

  const totalProjects = projectGroup.projectIds.length;
  const activeProjects = projectGroup.projectIds.length; // TODO: 実際のアクティブプロジェクト数を取得

  if (totalProjects === 0) {
    return <Warning color="warning" />;
  }

  if (activeProjects === totalProjects) {
    return <CheckCircle color="success" />;
  }

  return <Info color="info" />;
};

// ステータスラベルの取得
const getStatusLabel = (projectGroup: ProjectGroup): string => {
  if (!projectGroup.isActive) {
    return "無効";
  }

  const totalProjects = projectGroup.projectIds.length;

  if (totalProjects === 0) {
    return "プロジェクトなし";
  }

  return "有効";
};

// ステータスカラーの取得
const getStatusColor = (
  projectGroup: ProjectGroup,
): "success" | "warning" | "error" | "default" => {
  if (!projectGroup.isActive) {
    return "default";
  }

  const totalProjects = projectGroup.projectIds.length;

  if (totalProjects === 0) {
    return "warning";
  }

  return "success";
};

// ========== メインコンポーネント ==========

export default function ProjectGroupListPage() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { handleSubmissionError } = useAccountingErrorHandler();

  // 状態管理
  const [listState, setListState] = useState<ListState>({
    searchTerm: "",
    showInactive: false,
    selectedClients: [],
    selectedProjects: [],
    sortBy: "name",
    sortOrder: "asc",
    filterAnchorEl: null,
    sortAnchorEl: null,
  });

  const [dialogState, setDialogState] = useState<ProjectGroupDialogState>({
    open: false,
    mode: "create",
    projectGroup: null,
  });

  const [deleteDialogState, setDeleteDialogState] = useState<DeleteDialogState>(
    {
      open: false,
      projectGroup: null,
    },
  );

  // データ取得
  const {
    projectGroups = [],
    isLoading: projectGroupsLoading,
    error: projectGroupsError,
    refetch: refetchProjectGroups,
  } = useProjectGroups();

  const {
    data: clients = [],
    isLoading: clientsLoading,
    error: clientsError,
  } = useQuery({
    queryKey: ["accounting", "clients"],
    queryFn: () => accountingApi.getClients(),
  });

  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ["accounting", "projects"],
    queryFn: () => accountingApi.getProjects(),
  });

  // ミューテーション
  const createProjectGroupMutation = useMutation({
    mutationFn: accountingApi.createProjectGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["accounting", "project-groups"],
      });
      setDialogState({ open: false, mode: "create", projectGroup: null });
    },
    onError: (error) => {
      handleSubmissionError(error, "プロジェクトグループ作成");
    },
  });

  const updateProjectGroupMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProjectGroupRequest;
    }) => accountingApi.updateProjectGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["accounting", "project-groups"],
      });
      setDialogState({ open: false, mode: "edit", projectGroup: null });
    },
    onError: (error) => {
      handleSubmissionError(error, "プロジェクトグループ更新");
    },
  });

  const deleteProjectGroupMutation = useMutation({
    mutationFn: accountingApi.deleteProjectGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["accounting", "project-groups"],
      });
      setDeleteDialogState({ open: false, projectGroup: null });
    },
    onError: (error) => {
      handleSubmissionError(error, "プロジェクトグループ削除");
    },
  });

  const toggleActiveStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      accountingApi.updateProjectGroup(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["accounting", "project-groups"],
      });
    },
    onError: (error) => {
      handleSubmissionError(error, "ステータス変更");
    },
  });

  // フィルタリング・ソートされたデータ
  const processedProjectGroups = useMemo(() => {
    const filtered = filterProjectGroups(
      projectGroups,
      listState.searchTerm,
      listState.showInactive,
      listState.selectedClients,
      listState.selectedProjects,
      clients,
      projects,
    );
    return sortProjectGroups(filtered, listState.sortBy, listState.sortOrder);
  }, [
    projectGroups,
    listState.searchTerm,
    listState.showInactive,
    listState.selectedClients,
    listState.selectedProjects,
    listState.sortBy,
    listState.sortOrder,
    clients,
    projects,
  ]);

  // イベントハンドラー
  const handleSearchChange = (value: string) => {
    setListState((prev) => ({ ...prev, searchTerm: value }));
  };

  const handleShowInactiveToggle = () => {
    setListState((prev) => ({ ...prev, showInactive: !prev.showInactive }));
  };

  const handleSortChange = (sortBy: string) => {
    setListState((prev) => ({
      ...prev,
      sortBy: sortBy as any,
      sortOrder:
        prev.sortBy === sortBy && prev.sortOrder === "asc" ? "desc" : "asc",
      sortAnchorEl: null,
    }));
  };

  const handleCreateProjectGroup = () => {
    setDialogState({ open: true, mode: "create", projectGroup: null });
  };

  const handleEditProjectGroup = (projectGroup: ProjectGroup) => {
    setDialogState({ open: true, mode: "edit", projectGroup });
  };

  const handleDeleteProjectGroup = (projectGroup: ProjectGroup) => {
    setDeleteDialogState({ open: true, projectGroup });
  };

  const handleToggleActiveStatus = (
    projectGroup: ProjectGroup,
    isActive: boolean,
  ) => {
    toggleActiveStatusMutation.mutate({ id: projectGroup.id, isActive });
  };

  const handleProjectGroupSave = async (
    data: CreateProjectGroupRequest | UpdateProjectGroupRequest,
  ) => {
    if (dialogState.mode === "create") {
      await createProjectGroupMutation.mutateAsync(
        data as CreateProjectGroupRequest,
      );
    } else if (dialogState.projectGroup) {
      await updateProjectGroupMutation.mutateAsync({
        id: dialogState.projectGroup.id,
        data: data as UpdateProjectGroupRequest,
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialogState.projectGroup) {
      await deleteProjectGroupMutation.mutateAsync(
        deleteDialogState.projectGroup.id,
      );
    }
  };

  const handleRefresh = () => {
    refetchProjectGroups();
  };

  // ソートメニューアイテム
  const sortMenuItems = [
    { value: "name", label: "名前" },
    { value: "created", label: "作成日時" },
    { value: "updated", label: "更新日時" },
    { value: "billingAmount", label: "請求金額" },
  ];

  // エラー表示
  if (projectGroupsError) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button onClick={handleRefresh} startIcon={<Refresh />}>
              再読み込み
            </Button>
          }
        >
          プロジェクトグループの読み込みに失敗しました
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
              プロジェクトグループ一覧
            </Typography>
            <Typography variant="body1" color="text.secondary">
              プロジェクトグループの管理・設定を行います
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Tooltip title="データを更新">
              <IconButton
                onClick={handleRefresh}
                disabled={projectGroupsLoading}
                size="small"
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<ImportExport />}
              onClick={() => {
                // TODO: エクスポート機能の実装
              }}
            >
              エクスポート
            </Button>
            <Button
              variant="contained"
              startIcon={<GroupAdd />}
              onClick={handleCreateProjectGroup}
            >
              新規作成
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* フィルター・検索バー */}
      <Box sx={{ mb: 3 }}>
        <Stack spacing={2}>
          {/* 検索とソート */}
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="プロジェクトグループを検索..."
              value={listState.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: listState.searchTerm && (
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
              onClick={() =>
                setListState((prev) => ({
                  ...prev,
                  filterAnchorEl: null,
                }))
              }
              startIcon={<FilterList />}
              endIcon={<KeyboardArrowDown />}
            >
              フィルター
            </Button>

            <Button
              size="small"
              variant="outlined"
              onClick={(e) =>
                setListState((prev) => ({
                  ...prev,
                  sortAnchorEl: e.currentTarget,
                }))
              }
              startIcon={<Sort />}
              endIcon={<KeyboardArrowDown />}
            >
              {sortMenuItems.find((item) => item.value === listState.sortBy)
                ?.label || "ソート"}
              {listState.sortOrder === "desc" && " ↓"}
            </Button>

            <Menu
              anchorEl={listState.sortAnchorEl}
              open={Boolean(listState.sortAnchorEl)}
              onClose={() =>
                setListState((prev) => ({ ...prev, sortAnchorEl: null }))
              }
            >
              {sortMenuItems.map((item) => (
                <MenuItem
                  key={item.value}
                  selected={listState.sortBy === item.value}
                  onClick={() => handleSortChange(item.value)}
                >
                  <ListItemText primary={item.label} />
                </MenuItem>
              ))}
            </Menu>
          </Stack>

          {/* クライアント・プロジェクトフィルター */}
          <Stack direction="row" spacing={2} alignItems="center">
            <ClientMultiSelect
              value={listState.selectedClients}
              onChange={(clientIds) =>
                setListState((prev) => ({
                  ...prev,
                  selectedClients: clientIds,
                }))
              }
              clients={clients}
              loading={clientsLoading}
              error={!!clientsError}
              label="取引先フィルター"
              placeholder="取引先で絞り込み"
              size="small"
              fullWidth={false}
              searchable={false}
              allowSelectAll={false}
              showAvatars={false}
            />

            <ProjectMultiSelect
              value={listState.selectedProjects}
              onChange={(projectIds) =>
                setListState((prev) => ({
                  ...prev,
                  selectedProjects: projectIds,
                }))
              }
              projects={projects}
              clients={clients}
              loading={projectsLoading}
              error={!!projectsError}
              label="プロジェクトフィルター"
              placeholder="プロジェクトで絞り込み"
              size="small"
              fullWidth={false}
              searchable={false}
              allowSelectAll={false}
              showAvatars={false}
              clientFilter={listState.selectedClients}
            />

            <Tooltip title="非アクティブなグループも表示">
              <Chip
                size="small"
                label="非アクティブも表示"
                variant={listState.showInactive ? "filled" : "outlined"}
                onClick={handleShowInactiveToggle}
                clickable
              />
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* プロジェクトグループ一覧 */}
      <Box>
        {projectGroupsLoading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Box key={index} sx={{ width: { xs: '100%', sm: '50%', lg: '33.333%' }, px: 1, mb: 3 }}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="80%" height={24} />
                    <Skeleton
                      variant="text"
                      width="60%"
                      height={16}
                      sx={{ mt: 1 }}
                    />
                    <Skeleton
                      variant="text"
                      width="40%"
                      height={16}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Grid>
        ) : processedProjectGroups.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: "center", py: 8 }}>
              <GroupAdd sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                プロジェクトグループが見つかりません
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {listState.searchTerm ||
                listState.selectedClients.length > 0 ||
                listState.selectedProjects.length > 0
                  ? "検索条件を変更してください"
                  : "新しいプロジェクトグループを作成してください"}
              </Typography>
              {!listState.searchTerm &&
                listState.selectedClients.length === 0 &&
                listState.selectedProjects.length === 0 && (
                  <Button
                    variant="contained"
                    startIcon={<GroupAdd />}
                    onClick={handleCreateProjectGroup}
                  >
                    新規作成
                  </Button>
                )}
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {processedProjectGroups.map((projectGroup) => (
              <Box key={projectGroup.id} sx={{ width: { xs: '100%', sm: '50%', lg: '33.333%' }, px: 1, mb: 3 }}>
                <ProjectGroupCard
                  projectGroup={projectGroup}
                  clients={clients}
                  projects={projects}
                  onEdit={() => handleEditProjectGroup(projectGroup)}
                  onDelete={() => handleDeleteProjectGroup(projectGroup)}
                  onToggleActive={(isActive) =>
                    handleToggleActiveStatus(projectGroup, isActive)
                  }
                />
              </Box>
            ))}
          </Grid>
        )}
      </Box>

      {/* フローティングアクションボタン */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={handleCreateProjectGroup}
      >
        <Add />
      </Fab>

      {/* プロジェクトグループダイアログ */}
      <ProjectGroupDialog
        open={dialogState.open}
        onClose={() =>
          setDialogState({ open: false, mode: "create", projectGroup: null })
        }
        onSave={handleProjectGroupSave}
        projectGroup={dialogState.projectGroup}
        clients={clients}
        projects={projects}
        loading={
          createProjectGroupMutation.isPending ||
          updateProjectGroupMutation.isPending
        }
        mode={dialogState.mode}
      />

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogState.open}
        onClose={() =>
          setDeleteDialogState({ open: false, projectGroup: null })
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>プロジェクトグループの削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{deleteDialogState.projectGroup?.name}」を削除しますか？
            <br />
            この操作は取り消せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDeleteDialogState({ open: false, projectGroup: null })
            }
            disabled={deleteProjectGroupMutation.isPending}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            disabled={deleteProjectGroupMutation.isPending}
            startIcon={
              deleteProjectGroupMutation.isPending ? (
                <Box component="span" sx={{ display: "flex" }}>
                  <Typography variant="caption">削除中...</Typography>
                </Box>
              ) : (
                <Delete />
              )
            }
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

// ========== プロジェクトグループカード ==========

interface ProjectGroupCardProps {
  projectGroup: ProjectGroup;
  clients: Client[];
  projects: Project[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (isActive: boolean) => void;
}

const ProjectGroupCard: React.FC<ProjectGroupCardProps> = ({
  projectGroup,
  clients,
  projects,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const theme = useTheme();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  const groupClients = clients.filter((c) =>
    projectGroup.clientIds.includes(c.id),
  );
  const groupProjects = projects.filter((p) =>
    projectGroup.projectIds.includes(p.id),
  );

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleMenuAction = (action: () => void) => {
    action();
    handleMenuClose();
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.2s ease",
        opacity: projectGroup.isActive ? 1 : 0.7,
        "&:hover": {
          boxShadow: theme.shadows[4],
          transform: "translateY(-2px)",
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* ヘッダー */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Box flex={1}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {projectGroup.name}
            </Typography>
            <Chip
              size="small"
              label={getStatusLabel(projectGroup)}
              color={getStatusColor(projectGroup)}
              icon={getStatusIcon(projectGroup)}
            />
          </Box>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
        </Stack>

        {/* 説明 */}
        {projectGroup.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {projectGroup.description}
          </Typography>
        )}

        {/* 請求設定 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            請求計算タイプ
          </Typography>
          <Typography variant="body2">
            {
              (BILLING_CALCULATION_TYPE_LABELS as any)[
                projectGroup.billingCalculationType as any
              ] ?? ""
            }
          </Typography>
          {projectGroup.defaultHourlyRate && (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                デフォルト時給
              </Typography>
              <Typography variant="body2">
                {formatCurrency(projectGroup.defaultHourlyRate)}
              </Typography>
            </>
          )}
        </Box>

        {/* 統計情報 */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Box textAlign="center">
            <Typography variant="h6" color="primary.main">
              {groupClients.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              取引先
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h6" color="secondary.main">
              {groupProjects.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              プロジェクト
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h6" color="success.main">
              {formatCurrency(projectGroup.totalBillingAmount || 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              請求額
            </Typography>
          </Box>
        </Stack>

        {/* 取引先一覧 */}
        {groupClients.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              取引先
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {groupClients.slice(0, 3).map((client) => (
                <Chip
                  key={client.id}
                  label={client.name}
                  size="small"
                  variant="outlined"
                />
              ))}
              {groupClients.length > 3 && (
                <Chip
                  label={`+${groupClients.length - 3}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}
      </CardContent>

      <Divider />

      <CardActions sx={{ justifyContent: "space-between", px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          更新: {formatDate(projectGroup.updatedAt)}
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton size="small" onClick={onEdit}>
            <Edit fontSize="small" />
          </IconButton>
        </Stack>
      </CardActions>

      {/* メニュー */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleMenuAction(onEdit)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="編集" />
        </MenuItem>
        <MenuItem
          onClick={() =>
            handleMenuAction(() => onToggleActive(!projectGroup.isActive))
          }
        >
          <ListItemIcon>
            {projectGroup.isActive ? (
              <Archive fontSize="small" />
            ) : (
              <Unarchive fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={projectGroup.isActive ? "無効にする" : "有効にする"}
          />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleMenuAction(onDelete)}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="削除" />
        </MenuItem>
      </Menu>
    </Card>
  );
};
