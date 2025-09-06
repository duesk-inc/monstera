// Migrated to new API client system
import { createPresetApiClient, handleApiError } from '@/lib/api';
import { AbortError } from '@/lib/api/error';
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';
import { WEEKLY_REPORT_API, API_VERSION } from '@/constants/api';
import { DEFAULT_WORK_TIME } from '@/constants/defaultWorkTime';
import { HTTP_STATUS } from '@/constants/network';
import { 
  DefaultWorkTimeSettings,
  ApiWeeklyReport,
  ListWeeklyReportsResponse,
  ApiResponseBase
} from '@/types/weeklyReport';
import { convertSnakeToCamel, convertCamelToSnake } from '@/utils/apiUtils';
import axios from 'axios';
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';

// 週報を一覧取得
export const listWeeklyReports = async (
  page: number = 1,
  limit: number = 10,
  filters: { status?: string; startDate?: string; endDate?: string; search?: string; userId?: string } = {}
): Promise<ListWeeklyReportsResponse> => {
  try {
    const client = createPresetApiClient('auth');
    
    // クエリパラメータを構築
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (filters.status !== undefined) params.append('status', filters.status.toString());
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.userId) params.append('user_id', filters.userId);
    
    const response = await client.get(`${WEEKLY_REPORT_API.LIST}?${params.toString()}`);
    
    // convertSnakeToCamelを使用してレスポンスを変換
    const convertedData = convertSnakeToCamel<ListWeeklyReportsResponse>(response.data);
    return convertedData;
  } catch (error) {
    DebugLogger.apiError({
      category: '週報',
      operation: '一覧取得'
    }, {
      error
    });
    throw error;
  }
};

// 現在の週の週報を取得（今週の日付範囲で検索）
export const getCurrentWeeklyReport = async (signal?: AbortSignal): Promise<ApiWeeklyReport | null> => {
  try {
    // 今週の開始日（月曜日）と終了日（日曜日）を計算
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 日曜日の場合は-6、それ以外は1-dayOfWeek
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    const startDate = formatDateForAPI(monday);
    const endDate = formatDateForAPI(sunday);
    
    // 日付範囲で週報を取得（signalを渡す）
    return await getWeeklyReportByDateRange(startDate, endDate, signal);
  } catch (error) {
    const handledError = handleApiError(error as any);
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '週報',
      operation: '今週取得'
    }, {
      error
    });
    throw handledError;
  }
};

// 週報を作成
export const createWeeklyReport = async (weeklyReport: ApiWeeklyReport): Promise<ApiWeeklyReport> => {
  try {
    const client = createPresetApiClient('auth');
    
    // デバッグログ: リクエスト開始
    DebugLogger.apiStart(
      { 
        category: DEBUG_CATEGORIES.API, 
        operation: DEBUG_OPERATIONS.CREATE, 
        description: '週報作成' 
      },
      { 
        url: WEEKLY_REPORT_API.CREATE, 
        method: 'POST', 
        requestData: weeklyReport 
      }
    );
    
    // 不要なフィールドを除外
    const { plans, problems, ...cleanReport } = weeklyReport as any;
    
    // リクエストデータをバックエンド互換形式に変換
    const backendReport = convertCamelToSnake(cleanReport);
    
    // データ変換ログ
    DebugLogger.dataConversion(
      { 
        category: DEBUG_CATEGORIES.DATA_CONVERSION, 
        operation: DEBUG_OPERATIONS.CONVERT 
      },
      cleanReport,
      backendReport,
      'CamelToSnake'
    );
    
    const response = await client.post(WEEKLY_REPORT_API.CREATE, backendReport);
    
    // convertSnakeToCamelを使用してレスポンスを変換
    const convertedData = convertSnakeToCamel<ApiResponseBase>(response.data);
    
    // データ変換ログ
    DebugLogger.dataConversion(
      { 
        category: DEBUG_CATEGORIES.DATA_CONVERSION, 
        operation: DEBUG_OPERATIONS.CONVERT 
      },
      response.data,
      convertedData,
      'SnakeToCamel'
    );
    
    // レスポンスデータの処理
    if (convertedData) {
      const finalResult = convertedData as any;
      
      // デバッグログ: API成功
      DebugLogger.apiSuccess(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.CREATE 
        },
        { 
          status: response.status, 
          responseData: response.data,
          convertedResponseData: finalResult
        }
      );
      
      return finalResult;
    }
    
    // デバッグログ: API成功（データなし）
    DebugLogger.apiSuccess(
      { 
        category: DEBUG_CATEGORIES.API, 
        operation: DEBUG_OPERATIONS.CREATE 
      },
      { 
        status: response.status, 
        responseData: response.data,
        convertedResponseData: convertedData
      }
    );
    
    return convertedData;
  } catch (error) {
    // デバッグログ: API エラー
    DebugLogger.apiError(
      { 
        category: DEBUG_CATEGORIES.API, 
        operation: DEBUG_OPERATIONS.CREATE 
      },
      { 
        error: error,
        metadata: { requestData: weeklyReport }
      }
    );
    
    DebugLogger.apiError({
      category: '週報',
      operation: '作成'
    }, {
      error
    });
    throw error;
  }
};

// 週報を更新
export const updateWeeklyReport = async (id: string, weeklyReport: ApiWeeklyReport): Promise<ApiWeeklyReport> => {
  try {
    const client = createPresetApiClient('auth');
    const endpoint = WEEKLY_REPORT_API.UPDATE.replace(':id', id);
    
    // デバッグログ: リクエスト開始
    DebugLogger.apiStart(
      { 
        category: DEBUG_CATEGORIES.API, 
        operation: DEBUG_OPERATIONS.UPDATE, 
        description: '週報更新' 
      },
      { 
        url: endpoint, 
        method: 'PUT', 
        requestData: weeklyReport,
        metadata: { weeklyReportId: id }
      }
    );
    
    // 不要なフィールドを除外
    const { plans, problems, ...cleanReport } = weeklyReport as any;
    
    // リクエストデータをバックエンド互換形式に変換
    const backendReport = convertCamelToSnake(cleanReport);
    
    // データ変換ログ
    DebugLogger.dataConversion(
      { 
        category: DEBUG_CATEGORIES.DATA_CONVERSION, 
        operation: DEBUG_OPERATIONS.CONVERT 
      },
      cleanReport,
      backendReport,
      'CamelToSnake'
    );
    
    const response = await client.put(endpoint, backendReport);
    
    // convertSnakeToCamelを使用してレスポンスを変換
    const convertedData = convertSnakeToCamel<ApiResponseBase>(response.data);
    
    // データ変換ログ
    DebugLogger.dataConversion(
      { 
        category: DEBUG_CATEGORIES.DATA_CONVERSION, 
        operation: DEBUG_OPERATIONS.CONVERT 
      },
      response.data,
      convertedData,
      'SnakeToCamel'
    );
    
    // レスポンスデータの処理
    if (convertedData) {
      const finalResult = convertedData as any;
      
      // デバッグログ: API成功
      DebugLogger.apiSuccess(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.UPDATE 
        },
        { 
          status: response.status, 
          responseData: response.data,
          convertedResponseData: finalResult,
          metadata: { weeklyReportId: id }
        }
      );
      
      return finalResult;
    }
    
    // デバッグログ: API成功（データなし）
    DebugLogger.apiSuccess(
      { 
        category: DEBUG_CATEGORIES.API, 
        operation: DEBUG_OPERATIONS.UPDATE 
      },
      { 
        status: response.status, 
        responseData: response.data,
        convertedResponseData: convertedData,
        metadata: { weeklyReportId: id }
      }
    );
    
    return convertedData;
  } catch (error) {
    // デバッグログ: API エラー
    DebugLogger.apiError(
      { 
        category: DEBUG_CATEGORIES.API, 
        operation: DEBUG_OPERATIONS.UPDATE 
      },
      { 
        error: error,
        metadata: { weeklyReportId: id, requestData: weeklyReport }
      }
    );
    
    DebugLogger.apiError({
      category: '週報',
      operation: '更新'
    }, {
      error
    });
    throw error;
  }
};

// 週報を提出
export const submitWeeklyReport = async (id: string): Promise<ApiWeeklyReport> => {
  try {
    const client = createPresetApiClient('auth');
    const endpoint = WEEKLY_REPORT_API.SUBMIT.replace(':id', id);
    const response = await client.post(endpoint);
    
    // convertSnakeToCamelを使用してレスポンスを変換
    const convertedData = convertSnakeToCamel<ApiResponseBase>(response.data);
    
    // レスポンスデータの処理
    if (convertedData) {
      return convertedData as any;
    }
    
    return convertedData;
  } catch (error) {
    DebugLogger.apiError({
      category: '週報',
      operation: '提出'
    }, {
      error
    });
    throw error;
  }
};

// 週報を削除
export const deleteWeeklyReport = async (id: string): Promise<void> => {
  try {
    const client = createPresetApiClient('auth');
    const endpoint = WEEKLY_REPORT_API.UPDATE.replace(':id', id); // DELETEは同じエンドポイントを使用
    await client.delete(endpoint);
  } catch (error) {
    DebugLogger.apiError({
      category: '週報',
      operation: '削除'
    }, {
      error
    });
    throw error;
  }
};

// IDから週報詳細を取得（フルデータ含む）
export const getWeeklyReportById = async (id: string, signal?: AbortSignal): Promise<ApiWeeklyReport> => {
  try {
    const client = createPresetApiClient('auth');
    const endpoint = WEEKLY_REPORT_API.DETAIL.replace(':id', id);
    
    const response = await client.get(endpoint, { signal });
    
    // convertSnakeToCamelを使用してレスポンスを変換
    const convertedData = convertSnakeToCamel<ApiWeeklyReport>(response.data);
    
    // レスポンスデータの処理
    if (convertedData) {
      return convertedData as any;
    }
    
    return convertedData;
  } catch (error) {
    const handledError = handleApiError(error as any);
    
    // AbortErrorの場合は再スロー
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '週報',
      operation: '詳細取得'
    }, {
      error,
      metadata: { weeklyReportId: id }
    });
    throw handledError;
  }
};

// 稼働時間の計算API
export const calculateWorkHours = async (
  startTime: string,
  endTime: string,
  breakTime: number
): Promise<number> => {
  try {
    const client = createPresetApiClient('auth');
    const response = await client.post('/calculate-work-hours', {
      startTime,
      endTime,
      breakTime
    });
    return response.data.workHours;
  } catch (error) {
    DebugLogger.apiError({
      category: '週報',
      operation: '稼働時間計算'
    }, {
      error
    });
    return 0; // エラー時は0を返す
  }
};

// 週報をコピー
export const copyWeeklyReport = async (id: string): Promise<ApiWeeklyReport> => {
  try {
    const client = createPresetApiClient('auth');
    const response = await client.post(`${WEEKLY_REPORT_API.LIST}/${id}/copy`);
    
    // convertSnakeToCamelを使用してレスポンスを変換
    const convertedData = convertSnakeToCamel<ApiResponseBase>(response.data);
    
    // レスポンスデータの処理
    if (convertedData) {
      return convertedData as any;
    }
    
    return convertedData;
  } catch (error) {
    DebugLogger.apiError({
      category: '週報',
      operation: 'コピー'
    }, {
      error
    });
    throw error;
  }
};

// 日時変換ユーティリティ関数
export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const parseAPIDate = (dateString: string): Date => {
  return new Date(dateString);
};

// 下書き保存API
export const saveWeeklyReportAsDraft = async (weeklyReport: ApiWeeklyReport): Promise<ApiWeeklyReport> => {
  try {
    // ステータスを下書きに設定
    weeklyReport.status = WEEKLY_REPORT_STATUS.DRAFT;
    
    // 既存の週報を更新する場合
    if (weeklyReport.id) {
      return await updateWeeklyReport(weeklyReport.id, weeklyReport);
    }
    
    // 新規作成の場合
    return await createWeeklyReport(weeklyReport);
  } catch (error) {
    DebugLogger.apiError({
      category: '週報',
      operation: '下書き保存'
    }, {
      error
    });
    throw error;
  }
};

// 保存して提出するAPI
export const saveAndSubmitWeeklyReport = async (weeklyReport: ApiWeeklyReport): Promise<ApiWeeklyReport> => {
  try {
    // ステータスを提出済みに設定
    weeklyReport.status = WEEKLY_REPORT_STATUS.SUBMITTED;
    
    // 既存の週報を更新する場合
    if (weeklyReport.id) {
      return await updateWeeklyReport(weeklyReport.id, weeklyReport);
    }
    
    // 新規作成の場合
    return await createWeeklyReport(weeklyReport);
  } catch (error) {
    DebugLogger.apiError({
      category: '週報',
      operation: '保存と提出'
    }, {
      error
    });
    throw error;
  }
};

// 日付範囲から週報を取得
export const getWeeklyReportByDateRange = async (startDate: string, endDate: string, signal?: AbortSignal): Promise<ApiWeeklyReport | null> => {
  try {
    const client = createPresetApiClient('auth');
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });
    
    const response = await client.get(`${WEEKLY_REPORT_API.LIST}?${params.toString()}`, { signal });
    
    // レスポンスはリスト形式 {reports: [], total, page, limit}
    const data = response.data;
    
    // reports配列から週報を取得
    if (data && data.reports && data.reports.length > 0) {
      // 最初の週報のIDを取得（日付範囲に一致する週報は通常1つ）
      const firstReport = data.reports[0];
      const reportId = firstReport.id;
      
      // IDがある場合は詳細APIを呼んでフルデータを取得
      if (reportId) {
        return await getWeeklyReportById(reportId, signal);
      }
      
      // IDがない場合は簡略データを変換して返す（フォールバック）
      const convertedReport = convertSnakeToCamel<ApiWeeklyReport>(firstReport);
      
      // weeklyMoodプロパティを除外して返す
      if (convertedReport) {
        return convertedReport as any;
      }
    }
    
    // 週報が見つからない場合はnullを返す（新規作成モード）
    return null;
  } catch (error) {
    // 404エラーの場合は新規週報として扱うためnullを返す
    if (axios.isAxiosError(error) && error.response?.status === HTTP_STATUS.NOT_FOUND) {
      return null;
    }
    
    const handledError = handleApiError(error as any);
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '週報',
      operation: '日付範囲取得'
    }, {
      error
    });
    throw handledError;
  }
};

// ユーザーのデフォルト勤務時間設定を取得する関数
export const getUserDefaultWorkSettings = async (): Promise<DefaultWorkTimeSettings> => {
  try {
    const client = createPresetApiClient('auth');
    const response = await client.get(WEEKLY_REPORT_API.TEMPLATE);

    const data = response.data;
    
    // バックエンドのスネークケースのレスポンスをキャメルケースに変換
    if (data.weekday_start_time) {
      // バックエンドからスネークケースで返ってきた場合は変換
      return {
        weekdayStart: data.weekday_start_time || DEFAULT_WORK_TIME.START_TIME,
        weekdayEnd: data.weekday_end_time || DEFAULT_WORK_TIME.END_TIME,
        weekdayBreak: data.weekday_break_time || DEFAULT_WORK_TIME.BREAK_TIME,
        customDaySettings: {
          monday:    { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
          tuesday:   { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
          wednesday: { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
          thursday:  { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
          friday:    { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
          saturday:  { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
          sunday:    { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
        },
      };
    }
    
    // すでにキャメルケースで返ってきた場合はそのまま返す
    return data;
  } catch (error) {
    DebugLogger.apiError({
      category: '設定',
      operation: 'デフォルト勤務時間取得'
    }, {
      error,
      metadata: {
        endpoint: WEEKLY_REPORT_API.TEMPLATE,
        fallbackValues: {
        weekdayStart: DEFAULT_WORK_TIME.START_TIME,
        weekdayEnd: DEFAULT_WORK_TIME.END_TIME,
        weekdayBreak: DEFAULT_WORK_TIME.BREAK_TIME,
        },
      }
    });
    
    // 開発環境では詳細なエラー情報を出力
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Weekly Report API] デフォルト設定の取得に失敗しました。フォールバック値を使用します。', {
        endpoint: WEEKLY_REPORT_API.TEMPLATE,
        error: error instanceof Error ? error.message : error,
      });
    }
    
    // APIエラー時はデフォルト値を返す
    return {
      weekdayStart: DEFAULT_WORK_TIME.START_TIME,
      weekdayEnd: DEFAULT_WORK_TIME.END_TIME,
      weekdayBreak: DEFAULT_WORK_TIME.BREAK_TIME,
      customDaySettings: {
        monday: { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
        tuesday: { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
        wednesday: { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
        thursday: { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
        friday: { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
        saturday: { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
        sunday: { enabled: false, startTime: DEFAULT_WORK_TIME.START_TIME, endTime: DEFAULT_WORK_TIME.END_TIME, breakTime: DEFAULT_WORK_TIME.BREAK_TIME },
      },
    };
  }
};

// ユーザーのデフォルト勤務時間設定を保存する関数
export const saveUserDefaultWorkSettings = async (settings: DefaultWorkTimeSettings): Promise<DefaultWorkTimeSettings> => {
  try {
    // 送信データの型変換を確認
    const normalizedSettings = {
      weekday_start_time: settings.weekdayStart || DEFAULT_WORK_TIME.START_TIME,
      weekday_end_time: settings.weekdayEnd || DEFAULT_WORK_TIME.END_TIME,
      weekday_break_time: Number(settings.weekdayBreak || DEFAULT_WORK_TIME.BREAK_TIME),
    };
    
    // axiosクライアントを使用
    const client = createPresetApiClient('auth');
    const response = await client.post(WEEKLY_REPORT_API.TEMPLATE, normalizedSettings);
    
    // 新しい設定をバックエンドのレスポンスから取得するか、送信した設定を変換して返す
    const responseData = response.data.settings || response.data || settings;
    
    // バックエンドのレスポンス形式に応じて適切に変換
    return {
      weekdayStart: responseData.weekdayStart || responseData.weekday_start_time || settings.weekdayStart,
      weekdayEnd: responseData.weekdayEnd || responseData.weekday_end_time || settings.weekdayEnd,
      weekdayBreak: Number(responseData.weekdayBreak || responseData.weekday_break_time || settings.weekdayBreak),
      customDaySettings: settings.customDaySettings ?? {
        monday: { enabled: false, startTime: settings.weekdayStart, endTime: settings.weekdayEnd, breakTime: settings.weekdayBreak },
        tuesday: { enabled: false, startTime: settings.weekdayStart, endTime: settings.weekdayEnd, breakTime: settings.weekdayBreak },
        wednesday: { enabled: false, startTime: settings.weekdayStart, endTime: settings.weekdayEnd, breakTime: settings.weekdayBreak },
        thursday: { enabled: false, startTime: settings.weekdayStart, endTime: settings.weekdayEnd, breakTime: settings.weekdayBreak },
        friday: { enabled: false, startTime: settings.weekdayStart, endTime: settings.weekdayEnd, breakTime: settings.weekdayBreak },
        saturday: { enabled: false, startTime: settings.weekdayStart, endTime: settings.weekdayEnd, breakTime: settings.weekdayBreak },
        sunday: { enabled: false, startTime: settings.weekdayStart, endTime: settings.weekdayEnd, breakTime: settings.weekdayBreak },
      },
    };
  } catch (error) {
    DebugLogger.apiError({
      category: '設定',
      operation: 'デフォルト勤務時間保存'
    }, {
      error
    });
    
    if (axios.isAxiosError(error) && error.response) {
      // エラーメッセージを含める
      const errorMessage = error.response?.data?.message || error.message || 'デフォルト勤務時間設定の保存に失敗しました';
      throw new Error(errorMessage);
    }
    
    throw error;
  }
}; 
