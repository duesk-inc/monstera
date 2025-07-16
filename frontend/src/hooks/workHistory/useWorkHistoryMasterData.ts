import { useQuery } from '@tanstack/react-query';
import { workHistoryApi } from '../../lib/api/workHistory';
import type {
  TechnologySuggestionRequest,
} from '../../types/workHistory';

// クエリキー定数
export const WORK_HISTORY_MASTER_QUERY_KEYS = {
  all: ['workHistoryMaster'] as const,
  industries: () => [...WORK_HISTORY_MASTER_QUERY_KEYS.all, 'industries'] as const,
  processes: () => [...WORK_HISTORY_MASTER_QUERY_KEYS.all, 'processes'] as const,
  technologySuggestions: () => [...WORK_HISTORY_MASTER_QUERY_KEYS.all, 'technologySuggestions'] as const,
  technologySuggestion: (params: TechnologySuggestionRequest) => 
    [...WORK_HISTORY_MASTER_QUERY_KEYS.technologySuggestions(), params] as const,
  popularTechnologies: () => [...WORK_HISTORY_MASTER_QUERY_KEYS.all, 'popularTechnologies'] as const,
} as const;

interface UseIndustriesOptions {
  enabled?: boolean;
}

export const useIndustries = (options: UseIndustriesOptions = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: WORK_HISTORY_MASTER_QUERY_KEYS.industries(),
    queryFn: () => workHistoryApi.getIndustries(),
    enabled,
    staleTime: 30 * 60 * 1000, // 30分
    gcTime: 60 * 60 * 1000, // 1時間
  });
};

interface UseProcessesOptions {
  enabled?: boolean;
}

export const useProcesses = (options: UseProcessesOptions = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: WORK_HISTORY_MASTER_QUERY_KEYS.processes(),
    queryFn: () => workHistoryApi.getProcesses(),
    enabled,
    staleTime: 30 * 60 * 1000, // 30分
    gcTime: 60 * 60 * 1000, // 1時間
  });
};

interface UseTechnologySuggestionsOptions extends TechnologySuggestionRequest {
  enabled?: boolean;
}

export const useTechnologySuggestions = (options: UseTechnologySuggestionsOptions) => {
  const { enabled = true, ...params } = options;

  return useQuery({
    queryKey: WORK_HISTORY_MASTER_QUERY_KEYS.technologySuggestion(params),
    queryFn: () => workHistoryApi.getTechnologySuggestions(params),
    enabled: enabled && !!params.query && params.query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分
  });
};

interface UsePopularTechnologiesOptions {
  enabled?: boolean;
}

export const usePopularTechnologies = (options: UsePopularTechnologiesOptions = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: WORK_HISTORY_MASTER_QUERY_KEYS.popularTechnologies(),
    queryFn: () => workHistoryApi.getPopularTechnologies(),
    enabled,
    staleTime: 60 * 60 * 1000, // 1時間
    gcTime: 2 * 60 * 60 * 1000, // 2時間
  });
};

// 便利な統合フック
export const useWorkHistoryMasterData = () => {
  const industries = useIndustries();
  const processes = useProcesses();
  const popularTechnologies = usePopularTechnologies();

  const isLoading = industries.isLoading || processes.isLoading || popularTechnologies.isLoading;
  const isError = industries.isError || processes.isError || popularTechnologies.isError;

  return {
    // データ
    industries: industries.data || [],
    processes: processes.data || [],
    popularTechnologies: popularTechnologies.data || {
      programmingLanguages: [],
      serversDatabases: [],
      tools: [],
    },
    
    // 状態
    isLoading,
    isError,
    
    // 個別の状態
    industriesLoading: industries.isLoading,
    processesLoading: processes.isLoading,
    popularTechnologiesLoading: popularTechnologies.isLoading,
    
    // リフェッチ関数
    refetchIndustries: industries.refetch,
    refetchProcesses: processes.refetch,
    refetchPopularTechnologies: popularTechnologies.refetch,
  };
};

export default useWorkHistoryMasterData;