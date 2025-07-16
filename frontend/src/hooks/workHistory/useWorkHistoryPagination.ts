import { useState, useCallback, useMemo } from 'react';
import { WorkHistoryItem } from '@/types/workHistory';

interface UseWorkHistoryPaginationProps {
  data: WorkHistoryItem[];
  itemsPerPage?: number;
  enableVirtualization?: boolean;
  virtualizedThreshold?: number;
}

interface UseWorkHistoryPaginationReturn {
  currentPage: number;
  totalPages: number;
  paginatedData: WorkHistoryItem[];
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setItemsPerPage: (items: number) => void;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  isVirtualized: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const useWorkHistoryPagination = ({
  data,
  itemsPerPage: initialItemsPerPage = 20,
  enableVirtualization = true,
  virtualizedThreshold = 100,
}: UseWorkHistoryPaginationProps): UseWorkHistoryPaginationReturn => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPageState] = useState(initialItemsPerPage);

  // 仮想化を使用するかどうかの判定
  const isVirtualized = useMemo(
    () => enableVirtualization && data.length > virtualizedThreshold,
    [enableVirtualization, data.length, virtualizedThreshold]
  );

  // 総ページ数の計算
  const totalPages = useMemo(
    () => Math.ceil(data.length / itemsPerPage),
    [data.length, itemsPerPage]
  );

  // 現在のページのデータ
  const paginatedData = useMemo(() => {
    if (isVirtualized) {
      // 仮想化時は全データを返す
      return data;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage, isVirtualized]);

  // インデックスの計算
  const startIndex = useMemo(
    () => (currentPage - 1) * itemsPerPage,
    [currentPage, itemsPerPage]
  );

  const endIndex = useMemo(
    () => Math.min(startIndex + itemsPerPage, data.length),
    [startIndex, itemsPerPage, data.length]
  );

  // ページ遷移のハンドラー
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const setItemsPerPage = useCallback(
    (items: number) => {
      setItemsPerPageState(items);
      // アイテム数変更時は1ページ目に戻る
      setCurrentPage(1);
    },
    []
  );

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setItemsPerPage,
    itemsPerPage,
    totalItems: data.length,
    startIndex,
    endIndex,
    isVirtualized,
    hasNextPage,
    hasPreviousPage,
  };
};