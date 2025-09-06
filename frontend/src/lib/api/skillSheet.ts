// Migrated to new API client system
import { createPresetApiClient, AbortError } from '@/lib/api';
import { handleApiError } from '@/lib/api/error';
import { SkillSheet, SkillSheetFormData } from '@/types/skillSheet';
import { convertSnakeToCamel, convertCamelToSnake } from '@/utils/apiUtils';
import { SKILL_SHEET_API } from '@/constants/api';
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';

/**
 * スキルシート情報を取得する
 * @returns スキルシート情報
 */
export const fetchSkillSheet = async (signal?: AbortSignal): Promise<SkillSheet> => {
  DebugLogger.apiStart(
    { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'スキルシート取得' },
    { method: 'GET', url: '/skill-sheet' }
  );
  
  const client = createPresetApiClient('auth');
  try {
    // より長いタイムアウトを設定
    const options = { 
      signal,
      timeout: 20000 // 20秒に延長
    };
    
    const response = await client.get(SKILL_SHEET_API.GET, options);
    
    // データが存在するか確認
    if (!response.data) {
      throw new Error('サーバーからデータが返されませんでした');
    }
    
    // バックエンドは直接SkillSheetResponseオブジェクトを返すため、
    // ネストされた構造ではなく、直接response.dataを使用
    const convertedData = convertSnakeToCamel<SkillSheet>(response.data);
    
    // デバッグログ: 職務経歴の変換を確認
    DebugLogger.dataConversion(
      { category: DEBUG_CATEGORIES.DATA_CONVERSION, operation: DEBUG_OPERATIONS.READ },
      response.data,
      convertedData,
      '職務経歴を含むスキルシートデータの変換'
    );
    
    DebugLogger.apiSuccess(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'スキルシート取得' },
      { status: response.status, responseData: response.data, convertedResponseData: convertedData }
    );
    return convertedData;
  } catch (error) {
    DebugLogger.apiError(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.READ, description: 'スキルシート取得' },
      { error }
    );
    
    const handledError = handleApiError(error, 'スキルシート情報');
    
    // AbortErrorの場合は再スロー（呼び出し元で適切に処理される）
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    throw handledError;
  }
};

/**
 * スキルシート情報を更新する
 * @param data 更新するスキルシート情報
 */
export const updateSkillSheet = async (data: SkillSheetFormData): Promise<void> => {
  DebugLogger.apiStart(
    { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.UPDATE, description: 'スキルシート更新' },
    { method: 'PUT', url: '/skill-sheet', requestData: data }
  );
  
  const client = createPresetApiClient('auth');
  try {
    // 日付データを文字列に変換
    const convertedData = {
      ...data,
      workHistory: data.workHistory.map(wh => ({
        ...wh,
        startDate: wh.startDate instanceof Date 
          ? `${wh.startDate.getFullYear()}-${String(wh.startDate.getMonth() + 1).padStart(2, '0')}-01` // YYYY-MM-01形式で送信
          : wh.startDate || '',
        endDate: wh.endDate instanceof Date 
          ? `${wh.endDate.getFullYear()}-${String(wh.endDate.getMonth() + 1).padStart(2, '0')}-01` // YYYY-MM-01形式で送信
          : wh.endDate || '',
        // 技術分野項目を含める
        programmingLanguages: wh.programmingLanguages || [],
        serversDatabases: wh.serversDatabases || [],
        tools: wh.tools || []
      }))
    };

    DebugLogger.dataConversion(
      { category: DEBUG_CATEGORIES.DATA_CONVERSION, operation: DEBUG_OPERATIONS.UPDATE },
      data,
      convertedData,
      '日付データ変換および技術分野項目追加'
    );
    
    // 全体をスネークケースに変換
    const formattedData = convertCamelToSnake(convertedData);
    
    DebugLogger.dataConversion(
      { category: DEBUG_CATEGORIES.DATA_CONVERSION, operation: DEBUG_OPERATIONS.UPDATE },
      convertedData,
      formattedData,
      'スネークケース変換'
    );
    
    await client.put(SKILL_SHEET_API.UPDATE, formattedData);
    
    DebugLogger.apiSuccess(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.UPDATE, description: 'スキルシート更新' },
      { status: 200, metadata: { message: 'スキルシート情報を更新しました' } }
    );
  } catch (error) {
    DebugLogger.apiError(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.UPDATE, description: 'スキルシート更新' },
      { error }
    );
    throw handleApiError(error, 'スキルシート更新');
  }
};

/**
 * スキルシート情報を一時保存する
 * @param data 一時保存するスキルシート情報
 */
export const tempSaveSkillSheet = async (data: SkillSheetFormData): Promise<void> => {
  DebugLogger.apiStart(
    { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.CREATE, description: 'スキルシート一時保存' },
    { method: 'POST', url: '/skill-sheet/temp-save', requestData: data }
  );
  
  const client = createPresetApiClient('auth');
  try {
    // 日付データを文字列に変換
    const convertedData = {
      ...data,
      workHistory: data.workHistory.map(wh => ({
        ...wh,
        startDate: wh.startDate instanceof Date 
          ? `${wh.startDate.getFullYear()}-${String(wh.startDate.getMonth() + 1).padStart(2, '0')}-01` // YYYY-MM-01形式で送信
          : wh.startDate || '',
        endDate: wh.endDate instanceof Date 
          ? `${wh.endDate.getFullYear()}-${String(wh.endDate.getMonth() + 1).padStart(2, '0')}-01` // YYYY-MM-01形式で送信
          : wh.endDate || '',
        // 技術分野項目を含める
        programmingLanguages: wh.programmingLanguages || [],
        serversDatabases: wh.serversDatabases || [],
        tools: wh.tools || []
      }))
    };

    DebugLogger.dataConversion(
      { category: DEBUG_CATEGORIES.DATA_CONVERSION, operation: DEBUG_OPERATIONS.CREATE },
      data,
      convertedData,
      '日付データ変換および技術分野項目追加'
    );

    const snakeData = convertCamelToSnake(convertedData);
    
    DebugLogger.dataConversion(
      { category: DEBUG_CATEGORIES.DATA_CONVERSION, operation: DEBUG_OPERATIONS.CREATE },
      convertedData,
      snakeData,
      'スネークケース変換'
    );
    
    await client.post(SKILL_SHEET_API.TEMP_SAVE, snakeData);
    
    DebugLogger.apiSuccess(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.CREATE, description: 'スキルシート一時保存' },
      { status: 200, metadata: { message: 'スキルシート情報を一時保存しました' } }
    );
  } catch (error) {
    DebugLogger.apiError(
      { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.CREATE, description: 'スキルシート一時保存' },
      { error }
    );
    throw handleApiError(error, 'スキルシート一時保存');
  }
};
