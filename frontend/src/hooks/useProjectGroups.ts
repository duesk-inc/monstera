// プロジェクトグループ管理を行うカスタムフック

import { useState, useCallback, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  ProjectGroup,
  CreateProjectGroupRequest,
  UpdateProjectGroupRequest,
  UUID,
  ListResponse,
} from "../types/accounting";
import {
  getProjectGroups,
  getProjectGroup,
  createProjectGroup,
  updateProjectGroup,
  deleteProjectGroup,
  addProjectToGroup,
  removeProjectFromGroup,
  deleteMultipleProjectGroups,
} from "@/api/accountingApi";
import {
  PROJECT_GROUP_STATUS,
  VALIDATION_RULES,
} from "../constants/accounting";

// ========== クエリキー ==========

export const PROJECT_GROUP_QUERY_KEYS = {
  all: ["projectGroups"] as const,
  lists: () => [...PROJECT_GROUP_QUERY_KEYS.all, "list"] as const,
  list: (filters: any) =>
    [...PROJECT_GROUP_QUERY_KEYS.lists(), filters] as const,
  details: () => [...PROJECT_GROUP_QUERY_KEYS.all, "detail"] as const,
  detail: (id: UUID) => [...PROJECT_GROUP_QUERY_KEYS.details(), id] as const,
};

// ========== フォーム初期値 ==========

export const getInitialProjectGroupForm = (): CreateProjectGroupRequest => ({
  name: "",
  description: "",
  clientId: null,
  status: PROJECT_GROUP_STATUS.ACTIVE,
  projectIds: [],
  settings: {
    autoCalculation: true,
    defaultHourlyRate: null,
    billingCycle: "monthly",
    excludeFromBilling: false,
  },
});

// ========== メインフック ==========

/**
 * プロジェクトグループ一覧を管理するフック
 */
export const useProjectGroups = (params?: {
  page?: number;
  limit?: number;
  clientId?: UUID;
  search?: string;
  status?: string;
  enabled?: boolean;
}) => {
  const { page = 1, limit = 20, enabled = true, ...filters } = params || {};

  const query = useQuery({
    queryKey: PROJECT_GROUP_QUERY_KEYS.list({ page, limit, ...filters }),
    queryFn: () => getProjectGroups({ page, limit, ...filters }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分
  });

  // ページネーション情報
  const pagination = useMemo(() => {
    if (!query.data) return null;

    const totalPages = Math.ceil(query.data.total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      currentPage: page,
      totalPages,
      totalItems: query.data.total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      from: (page - 1) * limit + 1,
      to: Math.min(page * limit, query.data.total),
    };
  }, [query.data, page, limit]);

  return {
    ...query,
    projectGroups: query.data?.items || [],
    pagination,
  };
};

/**
 * 無限スクロール用のプロジェクトグループ一覧フック
 */
export const useInfiniteProjectGroups = (params?: {
  limit?: number;
  clientId?: UUID;
  search?: string;
  status?: string;
  enabled?: boolean;
}) => {
  const { limit = 20, enabled = true, ...filters } = params || {};

  const query = useInfiniteQuery({
    queryKey: PROJECT_GROUP_QUERY_KEYS.list({ limit, ...filters }),
    queryFn: ({ pageParam = 1 }) =>
      getProjectGroups({ page: pageParam, limit, ...filters }),
    enabled,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalPages = Math.ceil(lastPage.total / limit);
      const nextPage = allPages.length + 1;
      return nextPage <= totalPages ? nextPage : undefined;
    },
    staleTime: 5 * 60 * 1000,
  });

  // フラット化されたプロジェクトグループリスト
  const projectGroups = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) => page.items);
  }, [query.data]);

  return {
    ...query,
    projectGroups,
    totalCount: query.data?.pages[0]?.total || 0,
  };
};

/**
 * プロジェクトグループ詳細を管理するフック
 */
export const useProjectGroup = (id: UUID | null, enabled: boolean = true) => {
  const query = useQuery({
    queryKey: PROJECT_GROUP_QUERY_KEYS.detail(id!),
    queryFn: () => getProjectGroup(id!),
    enabled: enabled && !!id,
    staleTime: 2 * 60 * 1000, // 2分
  });

  return {
    ...query,
    projectGroup: query.data,
  };
};

/**
 * プロジェクトグループのCRUD操作を管理するフック
 */
export const useProjectGroupMutations = () => {
  const queryClient = useQueryClient();

  // 作成
  const createMutation = useMutation({
    mutationFn: createProjectGroup,
    onSuccess: (newGroup) => {
      // リストキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: PROJECT_GROUP_QUERY_KEYS.lists(),
      });
      // 詳細キャッシュに追加
      queryClient.setQueryData(
        PROJECT_GROUP_QUERY_KEYS.detail(newGroup.id),
        newGroup,
      );
    },
  });

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: UpdateProjectGroupRequest }) =>
      updateProjectGroup(id, data),
    onSuccess: (updatedGroup) => {
      // 詳細キャッシュを更新
      queryClient.setQueryData(
        PROJECT_GROUP_QUERY_KEYS.detail(updatedGroup.id),
        updatedGroup,
      );
      // リストキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: PROJECT_GROUP_QUERY_KEYS.lists(),
      });
    },
  });

  // 削除
  const deleteMutation = useMutation({
    mutationFn: deleteProjectGroup,
    onSuccess: (_, deletedId) => {
      // 詳細キャッシュから削除
      queryClient.removeQueries({
        queryKey: PROJECT_GROUP_QUERY_KEYS.detail(deletedId),
      });
      // リストキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: PROJECT_GROUP_QUERY_KEYS.lists(),
      });
    },
  });

  // 一括削除
  const batchDeleteMutation = useMutation({
    mutationFn: deleteMultipleProjectGroups,
    onSuccess: (_, deletedIds) => {
      // 削除されたアイテムの詳細キャッシュをクリア
      deletedIds.forEach((id) => {
        queryClient.removeQueries({
          queryKey: PROJECT_GROUP_QUERY_KEYS.detail(id),
        });
      });
      // リストキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: PROJECT_GROUP_QUERY_KEYS.lists(),
      });
    },
  });

  // プロジェクトの追加
  const addProjectMutation = useMutation({
    mutationFn: ({ groupId, projectId }: { groupId: UUID; projectId: UUID }) =>
      addProjectToGroup(groupId, projectId),
    onSuccess: (_, { groupId }) => {
      // 該当グループの詳細キャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: PROJECT_GROUP_QUERY_KEYS.detail(groupId),
      });
      // リストキャッシュも無効化
      queryClient.invalidateQueries({
        queryKey: PROJECT_GROUP_QUERY_KEYS.lists(),
      });
    },
  });

  // プロジェクトの削除
  const removeProjectMutation = useMutation({
    mutationFn: ({ groupId, projectId }: { groupId: UUID; projectId: UUID }) =>
      removeProjectFromGroup(groupId, projectId),
    onSuccess: (_, { groupId }) => {
      // 該当グループの詳細キャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: PROJECT_GROUP_QUERY_KEYS.detail(groupId),
      });
      // リストキャッシュも無効化
      queryClient.invalidateQueries({
        queryKey: PROJECT_GROUP_QUERY_KEYS.lists(),
      });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    batchDelete: batchDeleteMutation,
    addProject: addProjectMutation,
    removeProject: removeProjectMutation,
  };
};

/**
 * プロジェクトグループフォームを管理するフック
 */
export const useProjectGroupForm = (
  initialData?: ProjectGroup,
  mode: "create" | "edit" = "create",
) => {
  const [form, setForm] = useState<CreateProjectGroupRequest>(() => {
    if (mode === "edit" && initialData) {
      return {
        name: initialData.name,
        description: initialData.description || "",
        clientId: initialData.clientId,
        status: initialData.status,
        projectIds: initialData.projects?.map((p) => p.id) || [],
        settings: initialData.settings || getInitialProjectGroupForm().settings,
      };
    }
    return getInitialProjectGroupForm();
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isDirty, setIsDirty] = useState(false);

  // フォーム値の更新
  const updateForm = useCallback(
    (updates: Partial<CreateProjectGroupRequest>) => {
      setForm((prev) => ({ ...prev, ...updates }));
      setIsDirty(true);
      // バリデーションエラーをクリア
      setValidationErrors({});
    },
    [],
  );

  // フィールド単位の更新
  const updateField = useCallback(
    <K extends keyof CreateProjectGroupRequest>(
      field: K,
      value: CreateProjectGroupRequest[K],
    ) => {
      updateForm({ [field]: value });
    },
    [updateForm],
  );

  // フォームのリセット
  const resetForm = useCallback(() => {
    const initial =
      mode === "edit" && initialData
        ? {
            name: initialData.name,
            description: initialData.description || "",
            clientId: initialData.clientId,
            status: initialData.status,
            projectIds: initialData.projects?.map((p) => p.id) || [],
            settings:
              initialData.settings || getInitialProjectGroupForm().settings,
          }
        : getInitialProjectGroupForm();

    setForm(initial);
    setValidationErrors({});
    setIsDirty(false);
  }, [mode, initialData]);

  // バリデーション
  const validation = useMemo(() => validateProjectGroupForm(form), [form]);

  // バリデーション実行
  const validateAndSetErrors = useCallback(() => {
    const result = validateProjectGroupForm(form);
    setValidationErrors(result.errors);
    return result.isValid;
  }, [form]);

  // プロジェクトの追加/削除
  const toggleProject = useCallback(
    (projectId: UUID) => {
      const currentIds = form.projectIds;
      const newIds = currentIds.includes(projectId)
        ? currentIds.filter((id) => id !== projectId)
        : [...currentIds, projectId];
      updateField("projectIds", newIds);
    },
    [form.projectIds, updateField],
  );

  // 設定の更新
  const updateSettings = useCallback(
    (settingUpdates: Partial<CreateProjectGroupRequest["settings"]>) => {
      updateForm({
        settings: { ...form.settings, ...settingUpdates },
      });
    },
    [form.settings, updateForm],
  );

  return {
    form,
    updateForm,
    updateField,
    resetForm,
    validation,
    validationErrors,
    validateAndSetErrors,
    isDirty,
    toggleProject,
    updateSettings,
  };
};

/**
 * プロジェクトグループの統計情報を管理するフック
 */
export const useProjectGroupStats = (projectGroups?: ProjectGroup[]) => {
  const stats = useMemo(() => {
    if (!projectGroups || projectGroups.length === 0) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byClient: {},
        averageProjectsPerGroup: 0,
        totalProjects: 0,
      };
    }

    const total = projectGroups.length;
    const active = projectGroups.filter(
      (group) => group.status === PROJECT_GROUP_STATUS.ACTIVE,
    ).length;
    const inactive = total - active;

    // クライアント別の統計
    const byClient = projectGroups.reduce(
      (acc, group) => {
        const clientId = group.clientId || "uncategorized";
        if (!acc[clientId]) {
          acc[clientId] = {
            count: 0,
            clientName: group.client?.name || "未分類",
          };
        }
        acc[clientId].count += 1;
        return acc;
      },
      {} as Record<string, { count: number; clientName: string }>,
    );

    // プロジェクト統計
    const totalProjects = projectGroups.reduce(
      (sum, group) => sum + (group.projects?.length || 0),
      0,
    );
    const averageProjectsPerGroup = total > 0 ? totalProjects / total : 0;

    return {
      total,
      active,
      inactive,
      byClient,
      averageProjectsPerGroup: Math.round(averageProjectsPerGroup * 10) / 10,
      totalProjects,
    };
  }, [projectGroups]);

  return stats;
};

/**
 * プロジェクトグループの検索・フィルタリングフック
 */
export const useProjectGroupFilters = () => {
  const [filters, setFilters] = useState<{
    search?: string;
    clientId?: UUID;
    status?: string;
    hasProjects?: boolean;
  }>({});

  const [sortConfig, setSortConfig] = useState<{
    key: keyof ProjectGroup | null;
    direction: "asc" | "desc";
  }>({ key: "updatedAt", direction: "desc" });

  // フィルター更新
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // フィルタークリア
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // ソート設定
  const setSort = useCallback((key: keyof ProjectGroup) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  // ソートクリア
  const clearSort = useCallback(() => {
    setSortConfig({ key: null, direction: "asc" });
  }, []);

  // フィルタリング・ソート済みデータの取得
  const applyFiltersAndSort = useCallback(
    (projectGroups: ProjectGroup[]) => {
      let filtered = [...projectGroups];

      // 検索フィルター
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(
          (group) =>
            group.name.toLowerCase().includes(search) ||
            group.description?.toLowerCase().includes(search) ||
            group.client?.name.toLowerCase().includes(search),
        );
      }

      // クライアントフィルター
      if (filters.clientId) {
        filtered = filtered.filter(
          (group) => group.clientId === filters.clientId,
        );
      }

      // ステータスフィルター
      if (filters.status) {
        filtered = filtered.filter((group) => group.status === filters.status);
      }

      // プロジェクト有無フィルター
      if (filters.hasProjects !== undefined) {
        filtered = filtered.filter((group) => {
          const hasProjects = (group.projects?.length || 0) > 0;
          return hasProjects === filters.hasProjects;
        });
      }

      // ソート
      if (sortConfig.key) {
        filtered.sort((a, b) => {
          const aValue = a[sortConfig.key!];
          const bValue = b[sortConfig.key!];

          if (aValue < bValue) {
            return sortConfig.direction === "asc" ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === "asc" ? 1 : -1;
          }
          return 0;
        });
      }

      return filtered;
    },
    [filters, sortConfig],
  );

  return {
    filters,
    sortConfig,
    updateFilters,
    clearFilters,
    setSort,
    clearSort,
    applyFiltersAndSort,
    hasActiveFilters: Object.keys(filters).some(
      (key) => filters[key as keyof typeof filters] !== undefined,
    ),
  };
};

/**
 * プロジェクトグループの一括操作フック
 */
export const useProjectGroupBatchOperations = () => {
  const [selectedIds, setSelectedIds] = useState<Set<UUID>>(new Set());
  const mutations = useProjectGroupMutations();

  // 選択状態の管理
  const toggleSelection = useCallback((id: UUID) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((ids: UUID[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: UUID) => selectedIds.has(id),
    [selectedIds],
  );

  const isAllSelected = useCallback(
    (ids: UUID[]) => ids.length > 0 && ids.every((id) => selectedIds.has(id)),
    [selectedIds],
  );

  const isPartiallySelected = useCallback(
    (ids: UUID[]) =>
      ids.some((id) => selectedIds.has(id)) && !isAllSelected(ids),
    [selectedIds, isAllSelected],
  );

  // 一括削除
  const batchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    try {
      await mutations.batchDelete.mutateAsync(Array.from(selectedIds));
      clearSelection();
    } catch (error) {
      throw error;
    }
  }, [selectedIds, mutations.batchDelete, clearSelection]);

  // 一括ステータス更新
  const batchUpdateStatus = useCallback(
    async (status: string) => {
      if (selectedIds.size === 0) return;

      const updates = Array.from(selectedIds).map((id) =>
        mutations.update.mutateAsync({
          id,
          data: { status } as UpdateProjectGroupRequest,
        }),
      );

      try {
        await Promise.all(updates);
        clearSelection();
      } catch (error) {
        throw error;
      }
    },
    [selectedIds, mutations.update, clearSelection],
  );

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    batchDelete,
    batchUpdateStatus,
    isDeleting: mutations.batchDelete.isPending,
  };
};

// ========== ヘルパー関数 ==========

/**
 * プロジェクトグループフォームのバリデーション
 */
function validateProjectGroupForm(form: CreateProjectGroupRequest): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // 必須項目チェック
  if (!form.name.trim()) {
    errors.name = "グループ名は必須です";
  }

  // 名前の長さチェック
  if (form.name.length > VALIDATION_RULES.MAX_PROJECT_GROUP_NAME_LENGTH) {
    errors.name = `グループ名は${VALIDATION_RULES.MAX_PROJECT_GROUP_NAME_LENGTH}文字以内で入力してください`;
  }

  // 説明の長さチェック
  if (
    form.description &&
    form.description.length > VALIDATION_RULES.MAX_DESCRIPTION_LENGTH
  ) {
    errors.description = `説明は${VALIDATION_RULES.MAX_DESCRIPTION_LENGTH}文字以内で入力してください`;
  }

  // 設定のバリデーション
  if (
    form.settings?.defaultHourlyRate !== null &&
    form.settings?.defaultHourlyRate !== undefined
  ) {
    if (form.settings.defaultHourlyRate <= 0) {
      errors.defaultHourlyRate = "デフォルト時給は正の数値で入力してください";
    }
    if (form.settings.defaultHourlyRate > VALIDATION_RULES.MAX_HOURLY_RATE) {
      errors.defaultHourlyRate = `デフォルト時給は${VALIDATION_RULES.MAX_HOURLY_RATE}円以下で入力してください`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * プロジェクトグループの検索クエリ生成
 */
export const createProjectGroupSearchQuery = (filters: {
  search?: string;
  clientId?: UUID;
  status?: string;
}): Record<string, any> => {
  const query: Record<string, any> = {};

  if (filters.search) {
    query.search = filters.search;
  }
  if (filters.clientId) {
    query.clientId = filters.clientId;
  }
  if (filters.status) {
    query.status = filters.status;
  }

  return query;
};

/**
 * プロジェクトグループのCSVエクスポート用データ生成
 */
export const generateProjectGroupCSV = (
  projectGroups: ProjectGroup[],
): string => {
  const headers = [
    "ID",
    "グループ名",
    "説明",
    "クライアント名",
    "ステータス",
    "プロジェクト数",
    "作成日",
    "更新日",
  ];

  const rows = projectGroups.map((group) => [
    group.id,
    group.name,
    group.description || "",
    group.client?.name || "",
    group.status,
    group.projects?.length?.toString() || "0",
    new Date(group.createdAt).toLocaleDateString("ja-JP"),
    new Date(group.updatedAt).toLocaleDateString("ja-JP"),
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
};
