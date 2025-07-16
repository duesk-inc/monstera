// 経理サマリー情報を管理するカスタムフック

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import {
  AccountingDashboard,
  AccountingSummary,
  MonthlyTrendData,
  ClientBillingRanking,
  MonthString,
} from "../types/accounting";
import {
  getAccountingDashboard,
  getMonthlyTrend,
  getClientBillingRanking,
  getCachedDashboard,
  clearAccountingCache,
} from "@/api/accountingApi";
import { CACHE_CONFIG } from "../constants/accounting";

// ========== クエリキー ==========

export const ACCOUNTING_SUMMARY_QUERY_KEYS = {
  dashboard: ["accounting", "dashboard"] as const,
  monthlyTrend: (months?: number) =>
    ["accounting", "monthly-trend", months] as const,
  clientRanking: (month?: MonthString, limit?: number) =>
    ["accounting", "client-ranking", month, limit] as const,
} as const;

// ========== カスタムフック ==========

/**
 * 経理ダッシュボードデータを取得・管理するフック
 */
export const useAccountingDashboard = (options?: {
  forceRefresh?: boolean;
  enabled?: boolean;
}) => {
  const { forceRefresh = false, enabled = true } = options || {};

  const query = useQuery({
    queryKey: ACCOUNTING_SUMMARY_QUERY_KEYS.dashboard,
    queryFn: () => getCachedDashboard(forceRefresh),
    enabled,
    staleTime: CACHE_CONFIG.DASHBOARD_TTL * 60 * 1000, // 分をミリ秒に変換
    gcTime: CACHE_CONFIG.DASHBOARD_TTL * 60 * 1000 * 2, // staleTimeの2倍
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const refreshDashboard = useCallback(async () => {
    clearAccountingCache();
    return await query.refetch();
  }, [query]);

  return {
    ...query,
    dashboard: query.data,
    summary: query.data?.summary,
    refreshDashboard,
  };
};

/**
 * 月次トレンドデータを取得・管理するフック
 */
export const useMonthlyTrend = (months?: number, enabled: boolean = true) => {
  const query = useQuery({
    queryKey: ACCOUNTING_SUMMARY_QUERY_KEYS.monthlyTrend(months),
    queryFn: () => getMonthlyTrend(months),
    enabled,
    staleTime: 10 * 60 * 1000, // 10分
    gcTime: 20 * 60 * 1000, // 20分
    retry: 2,
  });

  // 前月比の計算
  const monthlyComparison = useMemo(() => {
    if (!query.data || query.data.length < 2) return null;

    const current = query.data[query.data.length - 1];
    const previous = query.data[query.data.length - 2];

    const amountChange = current.billingAmount - previous.billingAmount;
    const amountChangePercent = previous.billingAmount
      ? (amountChange / previous.billingAmount) * 100
      : 0;

    const clientChange = current.clientCount - previous.clientCount;
    const clientChangePercent = previous.clientCount
      ? (clientChange / previous.clientCount) * 100
      : 0;

    return {
      amount: {
        current: current.billingAmount,
        previous: previous.billingAmount,
        change: amountChange,
        changePercent: amountChangePercent,
      },
      clients: {
        current: current.clientCount,
        previous: previous.clientCount,
        change: clientChange,
        changePercent: clientChangePercent,
      },
    };
  }, [query.data]);

  // チャート用データの整形
  const chartData = useMemo(() => {
    if (!query.data) return [];

    return query.data.map((item, index) => ({
      ...item,
      label: item.month,
      value: item.billingAmount,
      previousValue: index > 0 ? query.data[index - 1].billingAmount : 0,
      growth:
        index > 0
          ? ((item.billingAmount - query.data[index - 1].billingAmount) /
              query.data[index - 1].billingAmount) *
            100
          : 0,
    }));
  }, [query.data]);

  return {
    ...query,
    trendData: query.data,
    chartData,
    monthlyComparison,
  };
};

/**
 * クライアント請求ランキングを取得・管理するフック
 */
export const useClientBillingRanking = (
  month?: MonthString,
  limit: number = 10,
  enabled: boolean = true,
) => {
  const query = useQuery({
    queryKey: ACCOUNTING_SUMMARY_QUERY_KEYS.clientRanking(month, limit),
    queryFn: () => getClientBillingRanking(month, limit),
    enabled,
    staleTime: 15 * 60 * 1000, // 15分
    gcTime: 30 * 60 * 1000, // 30分
  });

  // ランキングデータの分析
  const rankingAnalysis = useMemo(() => {
    if (!query.data || query.data.length === 0) return null;

    const totalAmount = query.data.reduce(
      (sum, client) => sum + client.totalAmount,
      0,
    );
    const topClient = query.data[0];
    const averageAmount = totalAmount / query.data.length;

    // 上位クライアントの割合（上位3社）
    const top3Amount = query.data
      .slice(0, 3)
      .reduce((sum, client) => sum + client.totalAmount, 0);
    const top3Percentage = (top3Amount / totalAmount) * 100;

    return {
      totalAmount,
      topClient,
      averageAmount,
      top3Percentage,
      clientCount: query.data.length,
    };
  }, [query.data]);

  return {
    ...query,
    ranking: query.data,
    rankingAnalysis,
  };
};

/**
 * 経理サマリー統合フック
 */
export const useAccountingSummary = (options?: {
  monthsForTrend?: number;
  rankingLimit?: number;
  currentMonth?: MonthString;
  enabled?: boolean;
}) => {
  const {
    monthsForTrend = 6,
    rankingLimit = 10,
    currentMonth,
    enabled = true,
  } = options || {};

  // 個別データの取得
  const dashboardQuery = useAccountingDashboard({ enabled });
  const trendQuery = useMonthlyTrend(monthsForTrend, enabled);
  const rankingQuery = useClientBillingRanking(
    currentMonth,
    rankingLimit,
    enabled,
  );

  // ローディング状態の管理
  const isLoading = dashboardQuery.isLoading || trendQuery.isLoading;
  const isInitialLoading =
    dashboardQuery.isLoading || trendQuery.isLoading || rankingQuery.isLoading;
  const isFetching =
    dashboardQuery.isFetching ||
    trendQuery.isFetching ||
    rankingQuery.isFetching;

  // エラー状態の管理
  const error = dashboardQuery.error || trendQuery.error || rankingQuery.error;
  const hasError = Boolean(error);

  // 全データの統合
  const summaryData = useMemo(() => {
    if (!dashboardQuery.data) return null;

    return {
      dashboard: dashboardQuery.data,
      summary: dashboardQuery.data.summary,
      monthlyTrend: trendQuery.data,
      clientRanking: rankingQuery.data,
      trendComparison: trendQuery.monthlyComparison,
      rankingAnalysis: rankingQuery.rankingAnalysis,
      chartData: trendQuery.chartData,
    };
  }, [
    dashboardQuery.data,
    trendQuery.data,
    trendQuery.monthlyComparison,
    trendQuery.chartData,
    rankingQuery.data,
    rankingQuery.rankingAnalysis,
  ]);

  // データのリフレッシュ
  const refreshAll = useCallback(async () => {
    const results = await Promise.allSettled([
      dashboardQuery.refetch(),
      trendQuery.refetch(),
      rankingQuery.refetch(),
    ]);

    return results.every((result) => result.status === "fulfilled");
  }, [dashboardQuery, trendQuery, rankingQuery]);

  // キャッシュのクリア
  const clearCache = useCallback(() => {
    clearAccountingCache();
  }, []);

  return {
    // データ
    data: summaryData,
    summary: summaryData?.summary,
    dashboard: summaryData?.dashboard,
    monthlyTrend: summaryData?.monthlyTrend,
    clientRanking: summaryData?.clientRanking,
    chartData: summaryData?.chartData,

    // 分析データ
    trendComparison: summaryData?.trendComparison,
    rankingAnalysis: summaryData?.rankingAnalysis,

    // 状態
    isLoading,
    isInitialLoading,
    isFetching,
    hasError,
    error,

    // 操作
    refreshAll,
    clearCache,
    refreshDashboard: dashboardQuery.refreshDashboard,

    // 個別クエリへのアクセス
    queries: {
      dashboard: dashboardQuery,
      trend: trendQuery,
      ranking: rankingQuery,
    },
  };
};

/**
 * KPI指標を計算・管理するフック
 */
export const useAccountingKPIs = (summary?: AccountingSummary) => {
  const kpis = useMemo(() => {
    if (!summary) return null;

    // 完了率
    const completionRate =
      summary.totalClients > 0
        ? (summary.completedBillings / summary.totalClients) * 100
        : 0;

    // 平均請求額
    const averageBillingAmount =
      summary.completedBillings > 0
        ? summary.totalBillingAmount / summary.completedBillings
        : 0;

    // 未完了数
    const pendingCount = summary.pendingBillings;

    // freee接続ステータス
    const isFreeeConnected = summary.freeeConnectionStatus === "connected";

    return {
      totalAmount: summary.totalBillingAmount,
      totalClients: summary.totalClients,
      completedBillings: summary.completedBillings,
      pendingBillings: summary.pendingBillings,
      completionRate,
      averageBillingAmount,
      pendingCount,
      isFreeeConnected,
      freeeConnectionStatus: summary.freeeConnectionStatus,
      currentMonth: summary.currentMonth,
      lastUpdatedAt: summary.lastUpdatedAt,
    };
  }, [summary]);

  // KPIの変化を検知
  const [previousKPIs, setPreviousKPIs] = useState<typeof kpis>(null);

  const kpiChanges = useMemo(() => {
    if (!kpis || !previousKPIs) return null;

    return {
      totalAmount: {
        current: kpis.totalAmount,
        previous: previousKPIs.totalAmount,
        change: kpis.totalAmount - previousKPIs.totalAmount,
        changePercent: previousKPIs.totalAmount
          ? ((kpis.totalAmount - previousKPIs.totalAmount) /
              previousKPIs.totalAmount) *
            100
          : 0,
      },
      completionRate: {
        current: kpis.completionRate,
        previous: previousKPIs.completionRate,
        change: kpis.completionRate - previousKPIs.completionRate,
      },
    };
  }, [kpis, previousKPIs]);

  // KPIが更新されたら前回の値を保存
  useState(() => {
    if (kpis && JSON.stringify(kpis) !== JSON.stringify(previousKPIs)) {
      setPreviousKPIs(kpis);
    }
  });

  return {
    kpis,
    kpiChanges,
    hasKPIs: Boolean(kpis),
  };
};

/**
 * リアルタイム更新を管理するフック
 */
export const useAccountingRealtime = (
  intervalMs: number = 30000, // 30秒
  enabled: boolean = true,
) => {
  const queryClient = useQueryClient();
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // 自動更新の実行
  const autoRefresh = useCallback(async () => {
    if (!enabled) return;

    try {
      // ダッシュボードデータを無効化して再取得
      await queryClient.invalidateQueries({
        queryKey: ACCOUNTING_SUMMARY_QUERY_KEYS.dashboard,
      });

      setLastUpdateTime(new Date());
    } catch (error) {
      console.error("Auto refresh failed:", error);
    }
  }, [enabled, queryClient]);

  // インターバルの設定
  useState(() => {
    if (!enabled) return;

    const interval = setInterval(autoRefresh, intervalMs);
    return () => clearInterval(interval);
  });

  // 手動更新
  const manualRefresh = useCallback(async () => {
    await autoRefresh();
  }, [autoRefresh]);

  return {
    lastUpdateTime,
    manualRefresh,
    isAutoRefreshEnabled: enabled,
  };
};

/**
 * データのフィルタリング・ソート機能を提供するフック
 */
export const useAccountingFilters = <T extends Record<string, any>>(
  data: T[] | undefined,
) => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  // フィルタリング
  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter((item) => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === "" || value === null || value === undefined) return true;

        const itemValue = item[key];

        if (typeof value === "string") {
          return String(itemValue).toLowerCase().includes(value.toLowerCase());
        }

        if (Array.isArray(value)) {
          return value.includes(itemValue);
        }

        return itemValue === value;
      });
    });
  }, [data, filters]);

  // ソート
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
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
  }, [filteredData, sortConfig]);

  // フィルター設定
  const setFilter = useCallback((key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // フィルタークリア
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // ソート設定
  const setSort = useCallback((key: keyof T) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  // ソートクリア
  const clearSort = useCallback(() => {
    setSortConfig({ key: null, direction: "asc" });
  }, []);

  return {
    data: sortedData,
    filters,
    sortConfig,
    setFilter,
    clearFilters,
    setSort,
    clearSort,
    filteredCount: filteredData.length,
    totalCount: data?.length || 0,
  };
};

/**
 * エクスポート機能を提供するフック
 */
export const useAccountingExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportSummaryData = useCallback(
    async (
      data: any,
      format: "csv" | "xlsx" | "json" = "xlsx",
      filename?: string,
    ) => {
      setIsExporting(true);
      setExportProgress(0);

      try {
        // データの準備
        setExportProgress(25);

        // ファイル名の生成
        const defaultFilename = `accounting-summary-${new Date().toISOString().split("T")[0]}`;
        const finalFilename = filename || defaultFilename;

        setExportProgress(50);

        // フォーマットに応じたエクスポート処理
        switch (format) {
          case "csv":
            await exportToCSV(data, finalFilename);
            break;
          case "xlsx":
            await exportToXLSX(data, finalFilename);
            break;
          case "json":
            await exportToJSON(data, finalFilename);
            break;
        }

        setExportProgress(100);
      } catch (error) {
        console.error("Export failed:", error);
        throw error;
      } finally {
        setIsExporting(false);
        setExportProgress(0);
      }
    },
    [],
  );

  return {
    exportSummaryData,
    isExporting,
    exportProgress,
  };
};

// ========== ヘルパー関数 ==========

const exportToCSV = async (data: any, filename: string) => {
  // CSV形式でエクスポート
  // 実際の実装では適切なCSVライブラリを使用
  console.log("Exporting to CSV:", filename, data);
};

const exportToXLSX = async (data: any, filename: string) => {
  // Excel形式でエクスポート
  // 実際の実装では適切なExcelライブラリを使用
  console.log("Exporting to XLSX:", filename, data);
};

const exportToJSON = async (data: any, filename: string) => {
  // JSON形式でエクスポート
  const jsonData = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};
