import { getAuthClient } from '@/lib/api';
import { ATTENDANCE_API, LEAVE_API } from '@/constants/api';
import { handleApiError, AbortError } from './error';
import {
  LeaveType,
  UserLeaveBalance,
  LeaveRequestRequest,
  LeaveRequestResponse,
  Holiday,
  LeaveRequestDetail
} from '@/types/leave';
import { convertSnakeToCamel, convertCamelToSnake } from '@/utils/apiUtils';
import axios from 'axios';
import { DebugLogger } from '@/lib/debug/logger';

// 型定義を再エクスポート
export type {
  LeaveType,
  UserLeaveBalance,
  LeaveRequestRequest,
  LeaveRequestResponse,
  LeaveRequestDetail,
  Holiday
};

/**
 * 休暇種別一覧を取得
 * @returns 休暇種別一覧
 */
export const getLeaveTypes = async (signal?: AbortSignal): Promise<LeaveType[]> => {
  const client = getAuthClient();
  try {
    const options = {
      signal,
      timeout: 20000
    };
    const response = await client.get(LEAVE_API.TYPES, options);
    
    return convertSnakeToCamel<LeaveType[]>(response.data);
  } catch (error) {
    const handledError = handleApiError(error, '休暇種別');
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '休暇',
      operation: '種別取得'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * ユーザーの休暇残日数一覧を取得
 * @returns ユーザーの休暇残日数一覧
 */
export const getUserLeaveBalances = async (signal?: AbortSignal): Promise<UserLeaveBalance[]> => {
  const client = getAuthClient();
  try {
    const options = {
      signal,
      timeout: 20000
    };
    const response = await client.get(LEAVE_API.BALANCES, options);
    
    // convertSnakeToCamelを使用してスネークケースからキャメルケースに変換
    return convertSnakeToCamel<UserLeaveBalance[]>(response.data);
  } catch (error) {
    const handledError = handleApiError(error, '休暇残日数');
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '休暇',
      operation: '残日数取得'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * 休暇申請を作成
 * @param request 休暇申請リクエスト
 * @returns 休暇申請レスポンス
 */
export const createLeaveRequest = async (data: LeaveRequestRequest): Promise<void> => {
  const client = getAuthClient();
  try {
    const snakeData = convertCamelToSnake(data);
    
    DebugLogger.apiRequest({
      category: '休暇',
      operation: '申請作成'
    }, {
      url: LEAVE_API.CREATE,
      method: 'POST',
      requestData: data,
      convertedRequestData: snakeData
    });
    
    const response = await client.post(LEAVE_API.CREATE, snakeData);
    
    DebugLogger.apiSuccess({
      category: '休暇',
      operation: '申請作成'
    }, {
      status: response.status,
      responseData: response.data
    });
  } catch (error) {
    DebugLogger.apiError({
      category: '休暇',
      operation: '申請作成'
    }, {
      error
    });
    
    const handledError = handleApiError(error, '休暇申請の作成');
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '休暇',
      operation: '申請作成エラー'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * ユーザーの休暇申請一覧を取得
 * @returns ユーザーの休暇申請一覧
 */
export const getLeaveRequests = async (signal?: AbortSignal): Promise<LeaveRequestResponse[]> => {
  const client = getAuthClient();
  try {
    const options = {
      signal,
      timeout: 20000
    };
    const response = await client.get(LEAVE_API.REQUESTS, options);
    return convertSnakeToCamel<LeaveRequestResponse[]>(response.data);
  } catch (error) {
    const handledError = handleApiError(error, '休暇申請履歴');
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '休暇',
      operation: '申請履歴取得'
    }, {
      error,
      metadata: axios.isAxiosError(error) ? {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        message: error.message
      } : undefined
    });
    throw handledError;
  }
};

/**
 * 指定年の休日情報を取得
 * @param year 年（指定しない場合は現在の年）
 * @returns 休日情報一覧
 */
export const getHolidaysByYear = async (year?: number): Promise<Holiday[]> => {
  try {
    const client = getAuthClient();
    const response = await client.get(ATTENDANCE_API.HOLIDAYS, {
      params: year ? { year } : {}
    });
    return convertSnakeToCamel<Holiday[]>(response.data);
  } catch (error: unknown) {
    throw handleApiError(error, '休日情報');
  }
}; 