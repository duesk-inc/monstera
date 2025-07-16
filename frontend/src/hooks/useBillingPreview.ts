// 請求プレビュー機能を管理するカスタムフック

import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BillingPreview,
  BillingPreviewForm,
  ProcessBillingRequest,
  BillingProcessResult,
  MonthString,
  UUID,
  ProjectGroup,
  Client,
} from "../types/accounting";
import {
  getBillingPreview,
  processBilling,
  getProjectGroups,
} from "@/api/accountingApi";
import { BILLING_STATUS, VALIDATION_RULES } from "../constants/accounting";

// ========== フォーム初期値 ==========

export const getInitialBillingForm = (): BillingPreviewForm => ({
  month: new Date().toISOString().slice(0, 7) as MonthString,
  clientIds: [],
  projectGroupIds: [],
  includeApproved: false,
  includeDraft: true,
  billingCutoffDay: 25,
  paymentDueDay: 25,
  notes: "",
  customRates: {},
  excludedProjectIds: [],
});

// ========== カスタムフック ==========

/**
 * 請求プレビューを管理するメインフック
 */
export const useBillingPreview = () => {
  const queryClient = useQueryClient();

  // フォーム状態管理
  const [form, setForm] = useState<BillingPreviewForm>(getInitialBillingForm());
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // プレビューデータの取得
  const {
    data: previewData,
    isLoading: isLoadingPreview,
    error: previewError,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ["billingPreview", form],
    queryFn: () => getBillingPreview(form),
    enabled: validateForm(form).isValid,
    staleTime: 0, // 常に最新データを取得
    retry: 1,
  });

  // 請求処理の実行
  const processBillingMutation = useMutation({
    mutationFn: (request: ProcessBillingRequest) => processBilling(request),
    onSuccess: (result) => {
      // 関連キャッシュの無効化
      queryClient.invalidateQueries({ queryKey: ["accountingDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["billingHistory"] });
    },
  });

  // プロジェクトグループ一覧の取得
  const { data: projectGroupsData, isLoading: isLoadingProjectGroups } =
    useQuery({
      queryKey: ["projectGroups", "billing"],
      queryFn: () => getProjectGroups({ limit: 1000 }),
      staleTime: 5 * 60 * 1000, // 5分
    });

  // ========== フォーム操作 ==========

  // フォーム値の更新
  const updateForm = useCallback((updates: Partial<BillingPreviewForm>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    // バリデーションエラーをクリア
    setValidationErrors({});
  }, []);

  // フォームのリセット
  const resetForm = useCallback(() => {
    setForm(getInitialBillingForm());
    setValidationErrors({});
  }, []);

  // フィールド単位の更新
  const updateField = useCallback(
    <K extends keyof BillingPreviewForm>(
      field: K,
      value: BillingPreviewForm[K],
    ) => {
      updateForm({ [field]: value });
    },
    [updateForm],
  );

  // ========== バリデーション ==========

  // フォームバリデーション
  const validation = useMemo(() => validateForm(form), [form]);

  // バリデーション実行
  const validateAndSetErrors = useCallback(() => {
    const result = validateForm(form);
    setValidationErrors(result.errors);
    return result.isValid;
  }, [form]);

  // ========== プレビュー操作 ==========

  // プレビューの手動更新
  const updatePreview = useCallback(async () => {
    if (validateAndSetErrors()) {
      return await refetchPreview();
    }
    return null;
  }, [validateAndSetErrors, refetchPreview]);

  // プレビューデータの分析
  const previewAnalysis = useMemo(() => {
    if (!previewData) return null;

    const totalAmount = previewData.billingItems.reduce(
      (sum, item) => sum + item.totalAmount,
      0,
    );
    const totalHours = previewData.billingItems.reduce(
      (sum, item) => sum + item.totalHours,
      0,
    );
    const clientCount = new Set(
      previewData.billingItems.map((item) => item.clientId),
    ).size;
    const projectCount = previewData.billingItems.reduce(
      (sum, item) => sum + item.projects.length,
      0,
    );

    const averageRate =
      totalHours > 0 ? Math.round(totalAmount / totalHours) : 0;

    return {
      totalAmount,
      totalHours,
      clientCount,
      projectCount,
      averageRate,
      itemCount: previewData.billingItems.length,
    };
  }, [previewData]);

  // ========== 請求処理 ==========

  // 請求処理の実行
  const executeBilling = useCallback(
    async (options?: {
      dryRun?: boolean;
      notifyClients?: boolean;
      generateInvoices?: boolean;
    }) => {
      if (!previewData || !validateAndSetErrors()) {
        throw new Error("フォームに不正な値があります");
      }

      const request: ProcessBillingRequest = {
        previewId: previewData.id,
        month: form.month,
        dryRun: options?.dryRun ?? false,
        notifyClients: options?.notifyClients ?? false,
        generateInvoices: options?.generateInvoices ?? true,
        processedBy: "current_user", // 実際の実装では認証情報から取得
        notes: form.notes,
      };

      return await processBillingMutation.mutateAsync(request);
    },
    [previewData, form, validateAndSetErrors, processBillingMutation],
  );

  // ========== フィルタリング・ソート ==========

  // 請求アイテムのフィルタリング
  const [itemFilters, setItemFilters] = useState<{
    clientSearch?: string;
    minAmount?: number;
    maxAmount?: number;
    status?: string[];
  }>({});

  const filteredBillingItems = useMemo(() => {
    if (!previewData) return [];

    let items = previewData.billingItems;

    // クライアント名でフィルタ
    if (itemFilters.clientSearch) {
      const search = itemFilters.clientSearch.toLowerCase();
      items = items.filter((item) =>
        item.clientName.toLowerCase().includes(search),
      );
    }

    // 金額範囲でフィルタ
    if (itemFilters.minAmount !== undefined) {
      items = items.filter(
        (item) => item.totalAmount >= itemFilters.minAmount!,
      );
    }
    if (itemFilters.maxAmount !== undefined) {
      items = items.filter(
        (item) => item.totalAmount <= itemFilters.maxAmount!,
      );
    }

    return items;
  }, [previewData, itemFilters]);

  // アイテムフィルターの更新
  const updateItemFilters = useCallback(
    (updates: Partial<typeof itemFilters>) => {
      setItemFilters((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  // ========== エクスポート機能 ==========

  // CSVエクスポート用データの準備
  const exportData = useMemo(() => {
    if (!previewData) return null;

    return previewData.billingItems.map((item) => ({
      クライアント名: item.clientName,
      請求月: form.month,
      総時間: item.totalHours,
      総金額: item.totalAmount,
      プロジェクト数: item.projects.length,
      ステータス: "プレビュー",
      備考: item.notes || "",
    }));
  }, [previewData, form.month]);

  // ========== プロジェクトグループ操作 ==========

  // プロジェクトグループの選択/選択解除
  const toggleProjectGroup = useCallback(
    (groupId: UUID) => {
      const currentIds = form.projectGroupIds;
      const newIds = currentIds.includes(groupId)
        ? currentIds.filter((id) => id !== groupId)
        : [...currentIds, groupId];
      updateField("projectGroupIds", newIds);
    },
    [form.projectGroupIds, updateField],
  );

  // 全プロジェクトグループの選択/選択解除
  const toggleAllProjectGroups = useCallback(
    (select: boolean) => {
      if (!projectGroupsData) return;
      const allIds = projectGroupsData.items.map((group) => group.id);
      updateField("projectGroupIds", select ? allIds : []);
    },
    [projectGroupsData, updateField],
  );

  // ========== レート設定 ==========

  // カスタムレートの設定
  const setCustomRate = useCallback(
    (clientId: UUID, rate: number) => {
      const newRates = { ...form.customRates, [clientId]: rate };
      updateField("customRates", newRates);
    },
    [form.customRates, updateField],
  );

  // カスタムレートの削除
  const removeCustomRate = useCallback(
    (clientId: UUID) => {
      const newRates = { ...form.customRates };
      delete newRates[clientId];
      updateField("customRates", newRates);
    },
    [form.customRates, updateField],
  );

  // ========== 戻り値 ==========

  return {
    // フォーム関連
    form,
    updateForm,
    updateField,
    resetForm,

    // バリデーション
    validation,
    validationErrors,
    validateAndSetErrors,

    // プレビューデータ
    previewData,
    previewAnalysis,
    isLoadingPreview,
    previewError,
    updatePreview,

    // フィルタリング
    filteredBillingItems,
    itemFilters,
    updateItemFilters,

    // 請求処理
    executeBilling,
    isProcessing: processBillingMutation.isPending,
    processingError: processBillingMutation.error,
    processingResult: processBillingMutation.data,

    // プロジェクトグループ
    projectGroups: projectGroupsData?.items || [],
    isLoadingProjectGroups,
    toggleProjectGroup,
    toggleAllProjectGroups,

    // レート設定
    setCustomRate,
    removeCustomRate,

    // エクスポート
    exportData,

    // 状態
    isReady: validation.isValid && !isLoadingPreview,
    hasPreviewData: Boolean(previewData),
  };
};

/**
 * 請求プレビューの比較機能を提供するフック
 */
export const useBillingPreviewComparison = () => {
  const [comparisons, setComparisons] = useState<
    Array<{ id: string; form: BillingPreviewForm; preview: BillingPreview }>
  >([]);

  // 比較に追加
  const addComparison = useCallback(
    (form: BillingPreviewForm, preview: BillingPreview) => {
      const id = `${form.month}_${Date.now()}`;
      setComparisons((prev) => [...prev, { id, form, preview }]);
    },
    [],
  );

  // 比較から削除
  const removeComparison = useCallback((id: string) => {
    setComparisons((prev) => prev.filter((comp) => comp.id !== id));
  }, []);

  // 比較をクリア
  const clearComparisons = useCallback(() => {
    setComparisons([]);
  }, []);

  // 比較分析
  const comparisonAnalysis = useMemo(() => {
    if (comparisons.length < 2) return null;

    const analyses = comparisons.map((comp) => {
      const totalAmount = comp.preview.billingItems.reduce(
        (sum, item) => sum + item.totalAmount,
        0,
      );
      const totalHours = comp.preview.billingItems.reduce(
        (sum, item) => sum + item.totalHours,
        0,
      );
      return { ...comp, totalAmount, totalHours };
    });

    const maxAmount = Math.max(...analyses.map((a) => a.totalAmount));
    const minAmount = Math.min(...analyses.map((a) => a.totalAmount));
    const avgAmount =
      analyses.reduce((sum, a) => sum + a.totalAmount, 0) / analyses.length;

    return {
      comparisons: analyses,
      summary: {
        maxAmount,
        minAmount,
        avgAmount,
        amountDifference: maxAmount - minAmount,
        count: analyses.length,
      },
    };
  }, [comparisons]);

  return {
    comparisons,
    addComparison,
    removeComparison,
    clearComparisons,
    comparisonAnalysis,
    hasComparisons: comparisons.length > 0,
  };
};

/**
 * 請求プレビューの履歴管理フック
 */
export const useBillingPreviewHistory = () => {
  const [history, setHistory] = useState<
    Array<{
      id: string;
      form: BillingPreviewForm;
      timestamp: Date;
      name?: string;
    }>
  >([]);

  // 履歴に保存
  const saveToHistory = useCallback(
    (form: BillingPreviewForm, name?: string) => {
      const id = `history_${Date.now()}`;
      const entry = {
        id,
        form: { ...form },
        timestamp: new Date(),
        name: name || `${form.month}の設定`,
      };
      setHistory((prev) => [entry, ...prev.slice(0, 9)]); // 最大10件保持
    },
    [],
  );

  // 履歴から削除
  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  // 履歴をクリア
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    saveToHistory,
    removeFromHistory,
    clearHistory,
    hasHistory: history.length > 0,
  };
};

// ========== ヘルパー関数 ==========

/**
 * フォームバリデーション
 */
function validateForm(form: BillingPreviewForm): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // 必須項目チェック
  if (!form.month) {
    errors.month = "請求月は必須です";
  }

  // 月の形式チェック
  if (form.month && !/^\d{4}-\d{2}$/.test(form.month)) {
    errors.month = "正しい月の形式で入力してください (YYYY-MM)";
  }

  // 締切日のバリデーション
  if (
    form.billingCutoffDay < 1 ||
    form.billingCutoffDay > 31 ||
    !Number.isInteger(form.billingCutoffDay)
  ) {
    errors.billingCutoffDay = "締切日は1-31の整数で入力してください";
  }

  if (
    form.paymentDueDay < 1 ||
    form.paymentDueDay > 31 ||
    !Number.isInteger(form.paymentDueDay)
  ) {
    errors.paymentDueDay = "支払期日は1-31の整数で入力してください";
  }

  // 備考の長さチェック
  if (form.notes && form.notes.length > VALIDATION_RULES.MAX_NOTES_LENGTH) {
    errors.notes = `備考は${VALIDATION_RULES.MAX_NOTES_LENGTH}文字以内で入力してください`;
  }

  // カスタムレートのバリデーション
  if (form.customRates) {
    Object.entries(form.customRates).forEach(([clientId, rate]) => {
      if (rate <= 0) {
        errors[`customRate_${clientId}`] = "単価は正の数値で入力してください";
      }
      if (rate > VALIDATION_RULES.MAX_HOURLY_RATE) {
        errors[`customRate_${clientId}`] =
          `単価は${VALIDATION_RULES.MAX_HOURLY_RATE}円以下で入力してください`;
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * プレビューデータからCSVを生成
 */
export const generatePreviewCSV = (
  previewData: BillingPreview,
  form: BillingPreviewForm,
): string => {
  const headers = [
    "クライアント名",
    "請求月",
    "総時間",
    "総金額",
    "プロジェクト数",
    "平均単価",
    "備考",
  ];

  const rows = previewData.billingItems.map((item) => [
    item.clientName,
    form.month,
    item.totalHours.toString(),
    item.totalAmount.toString(),
    item.projects.length.toString(),
    item.totalHours > 0
      ? Math.round(item.totalAmount / item.totalHours).toString()
      : "0",
    item.notes || "",
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
};

/**
 * 月の選択肢を生成
 */
export const generateMonthOptions = (
  monthsCount: number = 12,
): MonthString[] => {
  const options: MonthString[] = [];
  const now = new Date();

  for (let i = 0; i < monthsCount; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = date.toISOString().slice(0, 7) as MonthString;
    options.push(monthStr);
  }

  return options;
};
