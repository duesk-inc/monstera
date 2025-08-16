import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { 
  ExportJob, 
  CreateExportJobRequest, 
  ExportJobStatusResponse,
  ExportJobStatus 
} from '@/types/export';
import { useToast } from '@/components/common/Toast';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';

interface UseExportJobOptions {
  onSuccess?: (job: ExportJob) => void;
  onError?: (error: any) => void;
  pollingInterval?: number;
}

/**
 * エクスポートジョブを管理するカスタムフック
 */
export const useExportJob = (options?: UseExportJobOptions) => {
  const { showSuccess, showError } = useToast();
  const { handleSubmissionError } = useErrorHandler();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const pollingInterval = options?.pollingInterval || 2000; // デフォルト2秒

  // ジョブ作成
  const createJobMutation = useMutation<
    { job_id: string; status: ExportJobStatus },
    Error,
    CreateExportJobRequest
  >({
    mutationFn: async (request) => {
      const response = await apiClient.post('/admin/engineers/weekly-reports/export-job', request);
      return response.data;
    },
    onSuccess: (data) => {
      setActiveJobId(data.job_id);
      setIsPolling(true);
      showSuccess('エクスポート処理を開始しました');
      options?.onSuccess?.(data as ExportJob);
    },
    onError: (error) => {
      handleSubmissionError(error, 'エクスポートジョブの作成');
      options?.onError?.(error);
    },
  });

  // ジョブステータス取得
  const { data: jobStatus, refetch: refetchJobStatus } = useQuery<ExportJobStatusResponse>({
    queryKey: ['exportJob', activeJobId],
    queryFn: async () => {
      if (!activeJobId) throw new Error('No active job');
      const response = await apiClient.get(`/api/v1/admin/export/${activeJobId}/status`);
      return response.data;
    },
    enabled: !!activeJobId && isPolling,
    refetchInterval: false, // 手動でポーリング制御
  });

  // ポーリング処理
  useEffect(() => {
    if (!isPolling || !activeJobId) {
      return;
    }

    const startPolling = () => {
      pollingIntervalRef.current = setInterval(async () => {
        const result = await refetchJobStatus();
        
        if (result.data) {
          const status = result.data.status;
          
          // 終了状態の場合はポーリングを停止
          if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            setIsPolling(false);
            
            if (status === 'completed') {
              showSuccess('エクスポートが完了しました');
              // ファイルをダウンロード
              if (result.data.file_url) {
                downloadFile(result.data.file_url, result.data.file_name || 'export');
              }
            } else if (status === 'failed') {
              showError(result.data.error_message || 'エクスポートに失敗しました');
            }
          }
        }
      }, pollingInterval);
    };

    startPolling();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isPolling, activeJobId, pollingInterval, refetchJobStatus, showSuccess, showError]);

  // ファイルダウンロード処理
  const downloadFile = useCallback((url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // ジョブキャンセル
  const cancelJob = useCallback(async () => {
    if (!activeJobId) return;
    
    try {
      await apiClient.put(`/api/v1/admin/export/${activeJobId}/cancel`);
      setIsPolling(false);
      showSuccess('エクスポートをキャンセルしました');
    } catch (error) {
      handleSubmissionError(error, 'エクスポートのキャンセル');
    }
  }, [activeJobId, showSuccess, handleSubmissionError]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    createJob: createJobMutation.mutate,
    isCreating: createJobMutation.isPending,
    jobStatus,
    isPolling,
    activeJobId,
    cancelJob,
    resetJob: () => {
      setActiveJobId(null);
      setIsPolling(false);
    },
  };
};

/**
 * 複数のエクスポートジョブを管理するカスタムフック
 */
export const useExportJobs = () => {
  const [jobs, setJobs] = useState<Map<string, ExportJob>>(new Map());
  const { showSuccess, showError } = useToast();
  const { handleSubmissionError } = useErrorHandler();

  // ジョブを追加
  const addJob = useCallback((job: ExportJob) => {
    setJobs((prev) => new Map(prev).set(job.job_id, job));
  }, []);

  // ジョブを更新
  const updateJob = useCallback((jobId: string, updates: Partial<ExportJob>) => {
    setJobs((prev) => {
      const newJobs = new Map(prev);
      const existingJob = newJobs.get(jobId);
      if (existingJob) {
        newJobs.set(jobId, { ...existingJob, ...updates });
      }
      return newJobs;
    });
  }, []);

  // ジョブを削除
  const removeJob = useCallback((jobId: string) => {
    setJobs((prev) => {
      const newJobs = new Map(prev);
      newJobs.delete(jobId);
      return newJobs;
    });
  }, []);

  // アクティブなジョブの数を取得
  const activeJobsCount = Array.from(jobs.values()).filter(
    (job) => job.status === 'pending' || job.status === 'processing'
  ).length;

  return {
    jobs: Array.from(jobs.values()),
    addJob,
    updateJob,
    removeJob,
    activeJobsCount,
  };
};