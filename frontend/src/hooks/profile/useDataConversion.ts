import { useCallback } from 'react';
import { ProfileFormData } from '@/types/profile';

interface UseDataConversionReturn {
  prepareFormDataForSubmission: (data: ProfileFormData) => ProfileFormData;
  formatTempSaveDate: (dateString: string) => string;
}

/**
 * データ変換ロジック専用フック
 * フォームデータとAPI送信データ間の変換を管理
 */
export const useDataConversion = (): UseDataConversionReturn => {
  
  // フォームデータを送信用に準備する
  const prepareFormDataForSubmission = useCallback((data: ProfileFormData): ProfileFormData => {
    // canTravelの値を確実に取得（ラジオボタンの未選択対策）
    const canTravelValue = data.canTravel || 3;
    
    return {
      ...data,
      canTravel: canTravelValue
    };
  }, []);

  // 一時保存日時をフォーマットする
  const formatTempSaveDate = useCallback((dateString: string): string => {
    const savedDate = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(savedDate);
  }, []);

  return {
    prepareFormDataForSubmission,
    formatTempSaveDate,
  };
};