import { WorkHistoryDataProcessor } from '@/utils/workHistoryDataProcessor';
import { WorkHistoryItem } from '@/types/workHistory';

// Web Worker のメッセージタイプ定義
interface WorkerMessage {
  type: 'PROCESS_DATA' | 'FILTER_DATA';
  data: unknown;
  id: string;
}

interface WorkerResponse {
  type: 'PROCESS_COMPLETE' | 'FILTER_COMPLETE' | 'ERROR';
  data: unknown;
  id: string;
  error?: string;
}

// グローバルスコープの型定義
declare const self: Worker;

// メッセージハンドラー
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'PROCESS_DATA': {
        const workHistories = data as WorkHistoryItem[];
        const processedData = WorkHistoryDataProcessor.processWorkHistories(workHistories);
        
        const response: WorkerResponse = {
          type: 'PROCESS_COMPLETE',
          data: processedData,
          id,
        };
        
        self.postMessage(response);
        break;
      }

      case 'FILTER_DATA': {
        const { workHistories, filters } = data as { 
          workHistories: WorkHistoryItem[], 
          filters: {
            searchQuery?: string;
            industry?: string;
            technologies?: string[];
            startDateFrom?: string;
            startDateTo?: string;
            endDateFrom?: string;
            endDateTo?: string;
            isActive?: boolean;
          }
        };
        const filteredData = WorkHistoryDataProcessor.filterWorkHistories(workHistories, filters);
        
        const response: WorkerResponse = {
          type: 'FILTER_COMPLETE',
          data: filteredData,
          id,
        };
        
        self.postMessage(response);
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: 'ERROR',
      data: null,
      id,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    
    self.postMessage(response);
  }
});

// Worker の初期化完了を通知
self.postMessage({ type: 'WORKER_READY' });

export {};