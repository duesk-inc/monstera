// Migrated to new API client system
import { createPresetApiClient } from '@/lib/api';
import { handleApiError, AbortError } from '@/lib/api/error';
import { UserProfile, ProfileFormData, ProfileWithWorkHistory, ProfileHistory, TechnologyCategory, Certification } from '@/types/profile';
import { convertSnakeToCamel, convertCamelToSnake } from '@/utils/apiUtils';
import { PROFILE_API } from '@/constants/api';
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';

/**
 * プロフィール情報を取得する
 * @returns プロフィール情報
 */
export const fetchProfile = async (signal?: AbortSignal): Promise<UserProfile> => {
  DebugLogger.apiStart(
    { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'プロフィール取得' },
    { method: 'GET', url: '/profile' }
  );
  
  const client = createPresetApiClient('auth');
  try {
    // より長いタイムアウトを設定
    const options = { 
      signal,
      timeout: 20000 // 20秒に延長
    };
    
    const response = await client.get(PROFILE_API.GET, options);
    
    // データが存在するか確認
    if (!response.data) {
      throw new Error('サーバーからデータが返されませんでした');
    }
    
    // バックエンドは直接ProfileResponseオブジェクトを返すため、
    // ネストされた構造ではなく、直接response.dataを使用
    const convertedData = convertSnakeToCamel<UserProfile>(response.data);
    
    // デバッグログ: 資格情報の変換を確認
    DebugLogger.dataConversion(
      { category: DEBUG_CATEGORIES.DATA_CONVERSION, operation: DEBUG_OPERATIONS.READ },
      response.data,
      convertedData,
      '資格情報を含むプロフィールデータの変換'
    );
    
    DebugLogger.apiSuccess(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'プロフィール取得' },
      { status: response.status, responseData: response.data, convertedResponseData: convertedData }
    );
    return convertedData;
  } catch (error) {
    DebugLogger.apiError(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'プロフィール取得' },
      { error }
    );
    
    const handledError = handleApiError(error, 'プロフィール情報', { enableCodeMapping: true });
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    throw handledError;
  }
};

/**
 * プロフィール情報と職務経歴を取得する
 * @returns プロフィール情報と職務経歴
 */
export const fetchProfileWithWorkHistory = async (signal?: AbortSignal): Promise<ProfileWithWorkHistory> => {
  DebugLogger.apiStart(
    { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'プロフィール・職務経歴取得' },
    { method: 'GET', url: '/profile/with-work-history' }
  );
  
  const client = createPresetApiClient('auth');
  try {
    // より長いタイムアウトを設定
    const options = { 
      signal,
      timeout: 20000 // 20秒に延長
    };
    
    const response = await client.get(PROFILE_API.WITH_HISTORY, options);
    
    // データが存在するか確認
    if (!response.data) {
      throw new Error('サーバーからデータが返されませんでした');
    }
    
    // バックエンドは { profile: ProfileResponse, work_history: WorkHistoryResponse[] } の形式で返す
    // スネークケースからキャメルケースに変換
    const convertedData = convertSnakeToCamel<ProfileWithWorkHistory>(response.data);
    
    DebugLogger.apiSuccess(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'プロフィール・職務経歴取得' },
      { status: response.status, responseData: response.data, convertedResponseData: convertedData }
    );
    return convertedData;
  } catch (error) {
    DebugLogger.apiError(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'プロフィール・職務経歴取得' },
      { error }
    );
    
    const handledError = handleApiError(error, 'プロフィール情報と職務経歴', { enableCodeMapping: true });
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    throw handledError;
  }
};

/**
 * プロフィール情報を更新する（基本プロフィールのみ）
 * @param data 更新するプロフィール情報
 */
export const updateProfile = async (data: ProfileFormData): Promise<void> => {
  DebugLogger.apiStart(
    { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.UPDATE, description: 'プロフィール更新' },
    { method: 'PUT', url: '/profile', requestData: data }
  );
  
  const client = createPresetApiClient('auth');
  try {
    // 日付データを文字列に変換（基本プロフィールのみ）
    const convertedData = {
      ...data,
      certifications: data.certifications.map(cert => ({
        ...cert,
        acquiredAt: cert.acquiredAt instanceof Date 
          ? `${cert.acquiredAt.getFullYear()}-${String(cert.acquiredAt.getMonth() + 1).padStart(2, '0')}` // YYYY-MM形式
          : cert.acquiredAt || ''
      })),
      // 職務経歴は空配列で送信（既存APIとの互換性のため）
      workHistory: []
    };

    DebugLogger.dataConversion(
      { category: DEBUG_CATEGORIES.DATA_CONVERSION, operation: DEBUG_OPERATIONS.UPDATE },
      data,
      convertedData,
      '基本プロフィール用日付データ変換'
    );

    // canTravelの値を数値に変換（文字列で送られてきた場合に備える）
    let canTravelValue: number;
    if (typeof convertedData.canTravel === 'string') {
      // 文字列の場合は数値に変換
      canTravelValue = parseInt(convertedData.canTravel as string, 10);
      // 変換できない場合やNaNの場合はデフォルト値を使用
      if (isNaN(canTravelValue)) {
        canTravelValue = 3; // デフォルト値は3（要相談）
      }
    } else {
      // すでに数値の場合はそのまま使用
      canTravelValue = convertedData.canTravel || 3;
    }
    
    // データ形式の正規化 - canTravelが必ず含まれるようにする
    const normalizedData = {
      ...convertedData,
      canTravel: canTravelValue // 明示的に数値型で設定
    };
    
    // 全体をスネークケースに変換
    const formattedData = convertCamelToSnake(normalizedData);
    
    DebugLogger.dataConversion(
      { category: DEBUG_CATEGORIES.DATA_CONVERSION, operation: DEBUG_OPERATIONS.UPDATE },
      normalizedData,
      formattedData,
      'スネークケース変換'
    );
    
    await client.post(PROFILE_API.UPDATE, formattedData);
    
    DebugLogger.apiSuccess(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.UPDATE, description: 'プロフィール更新' },
      { status: 200, metadata: { message: 'プロフィール情報を更新しました' } }
    );
  } catch (error) {
    DebugLogger.apiError(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.UPDATE, description: 'プロフィール更新' },
      { error }
    );
    throw handleApiError(error, 'プロフィール更新', { enableCodeMapping: true });
  }
};

/**
 * プロフィール情報を一時保存する（基本プロフィールのみ）
 * @param data 一時保存するプロフィール情報
 */
export const tempSaveProfile = async (data: ProfileFormData): Promise<void> => {
  DebugLogger.apiStart(
    { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.CREATE, description: 'プロフィール一時保存' },
    { method: 'POST', url: '/profile/temp-save', requestData: data }
  );
  
  const client = createPresetApiClient('auth');
  try {
    // 日付データを文字列に変換（基本プロフィールのみ）
    const convertedData = {
      ...data,
      certifications: data.certifications.map(cert => ({
        ...cert,
        acquiredAt: cert.acquiredAt instanceof Date 
          ? `${cert.acquiredAt.getFullYear()}-${String(cert.acquiredAt.getMonth() + 1).padStart(2, '0')}` // YYYY-MM形式
          : cert.acquiredAt || ''
      })),
      // 職務経歴は空配列で送信（既存APIとの互換性のため）
      workHistory: []
    };

    DebugLogger.dataConversion(
      { category: DEBUG_CATEGORIES.DATA_CONVERSION, operation: DEBUG_OPERATIONS.CREATE },
      data,
      convertedData,
      '基本プロフィール用日付データ変換'
    );

    // canTravelの値を数値に変換（文字列で送られてきた場合に備える）
    let canTravelValue: number;
    if (typeof convertedData.canTravel === 'string') {
      // 文字列の場合は数値に変換
      canTravelValue = parseInt(convertedData.canTravel as string, 10);
      // 変換できない場合やNaNの場合はデフォルト値を使用
      if (isNaN(canTravelValue)) {
        canTravelValue = 3; // デフォルト値は3（要相談）
      }
    } else {
      // すでに数値の場合はそのまま使用
      canTravelValue = convertedData.canTravel || 3;
    }
    
    // データ形式の正規化 - canTravelが必ず含まれるようにする
    const normalizedData = {
      ...convertedData,
      canTravel: canTravelValue, // 明示的に数値型で設定
      isTempSaved: true // 一時保存フラグ
    };

    const snakeData = convertCamelToSnake(normalizedData);
    
    DebugLogger.dataConversion(
      { category: DEBUG_CATEGORIES.DATA_CONVERSION, operation: DEBUG_OPERATIONS.CREATE },
      normalizedData,
      snakeData,
      'スネークケース変換'
    );
    
    await client.post(PROFILE_API.TEMP_SAVE, snakeData);
    
    DebugLogger.apiSuccess(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.CREATE, description: 'プロフィール一時保存' },
      { status: 200, metadata: { message: 'プロフィール情報を一時保存しました' } }
    );
  } catch (error) {
    DebugLogger.apiError(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.CREATE, description: 'プロフィール一時保存' },
      { error }
    );
    throw handleApiError(error, 'プロフィール一時保存', { enableCodeMapping: true });
  }
};

/**
 * 特定バージョンのプロフィール履歴を取得する
 * @param version 取得するバージョン番号
 * @returns プロフィール履歴情報
 */
export const fetchProfileHistory = async (version: number, signal?: AbortSignal): Promise<ProfileHistory> => {
  DebugLogger.apiStart(
    { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'プロフィール履歴取得' },
    { method: 'GET', url: `/profile/history?version=${version}` }
  );
  
  const client = createPresetApiClient('auth');
  try {
    const response = await client.get(`${PROFILE_API.HISTORY}?version=${version}`, { signal });
    
    // データが存在するか確認
    if (!response.data) {
      throw new Error('サーバーからデータが返されませんでした');
    }
    
    const convertedData = convertSnakeToCamel<ProfileHistory>(response.data);
    
    DebugLogger.apiSuccess(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'プロフィール履歴取得' },
      { status: response.status, responseData: response.data, convertedResponseData: convertedData }
    );
    return convertedData;
  } catch (error) {
    DebugLogger.apiError(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'プロフィール履歴取得' },
      { error }
    );
    throw handleApiError(error, 'プロフィール履歴', { enableCodeMapping: true });
  }
};

/**
 * 最新のプロフィール履歴を取得する
 * @returns 最新のプロフィール履歴情報
 */
export const fetchLatestProfileHistory = async (signal?: AbortSignal): Promise<ProfileHistory> => {
  DebugLogger.apiStart(
    { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: '最新プロフィール履歴取得' },
    { method: 'GET', url: '/profile/history' }
  );
  
  const client = createPresetApiClient('auth');
  try {
    const response = await client.get(PROFILE_API.LATEST_HISTORY, { signal });
    
    // データが存在するか確認
    if (!response.data) {
      throw new Error('サーバーからデータが返されませんでした');
    }
    
    const convertedData = convertSnakeToCamel<ProfileHistory>(response.data);
    
    DebugLogger.apiSuccess(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: '最新プロフィール履歴取得' },
      { status: response.status, responseData: response.data, convertedResponseData: convertedData }
    );
    return convertedData;
  } catch (error) {
    DebugLogger.apiError(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: '最新プロフィール履歴取得' },
      { error }
    );
    throw handleApiError(error, 'プロフィール最新履歴', { enableCodeMapping: true });
  }
};

/**
 * 技術カテゴリ一覧を取得する
 * @returns 技術カテゴリ一覧
 */
export const fetchTechnologyCategories = async (signal?: AbortSignal): Promise<TechnologyCategory[]> => {
  DebugLogger.apiStart(
    { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: '技術カテゴリ取得' },
    { method: 'GET', url: '/profile/technology-categories' }
  );
  
  const client = createPresetApiClient('auth');
  try {
    const response = await client.get(PROFILE_API.TECHNOLOGY_CATEGORIES, { signal });
    
    // データが存在するか確認
    if (!response.data || !response.data.categories) {
      throw new Error('サーバーからデータが返されませんでした');
    }
    
    const convertedData = convertSnakeToCamel<TechnologyCategory[]>(response.data.categories);
    
    DebugLogger.apiSuccess(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: '技術カテゴリ取得' },
      { status: response.status, responseData: response.data, convertedResponseData: convertedData }
    );
    return convertedData;
  } catch (error) {
    DebugLogger.apiError(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: '技術カテゴリ取得' },
      { error }
    );
    throw handleApiError(error, '技術カテゴリ', { enableCodeMapping: true });
  }
};

/**
 * よく使う資格一覧を取得する
 * @returns よく使う資格一覧
 */
export const fetchCommonCertifications = async (signal?: AbortSignal): Promise<any[]> => {
  DebugLogger.apiStart(
    { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'よく使う資格一覧取得' },
    { method: 'GET', url: '/profile/common-certifications' }
  );
  
  const client = createPresetApiClient('auth');
  try {
    const response = await client.get(PROFILE_API.COMMON_CERTIFICATIONS, { signal });
    
    // データが存在するか確認
    if (!response.data || !response.data.certifications) {
      throw new Error('サーバーからデータが返されませんでした');
    }
    
    const convertedData = convertSnakeToCamel<Certification[]>(response.data.certifications);
    
    DebugLogger.apiSuccess(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'よく使う資格一覧取得' },
      { status: response.status, responseData: response.data, convertedResponseData: convertedData }
    );
    return convertedData;
  } catch (error) {
    DebugLogger.apiError(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'よく使う資格一覧取得' },
      { error }
    );
    throw handleApiError(error, 'よく使う資格一覧', { enableCodeMapping: true });
  }
}; 
// @ts-nocheck
