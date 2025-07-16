import { useEffect, useCallback } from 'react';
import { 
  type DefaultWorkTimeSettings as ApiDefaultWorkTimeSettings,
} from '@/types/weeklyReport';

// 分離したフックをインポート
import { useWeeklyReportState, UseWeeklyReportStateReturn } from './useWeeklyReportState';
import { useWeeklyReportCalc } from './useWeeklyReportCalc';
import { useWeeklyReportValidation } from './useWeeklyReportValidation';
import { useWeeklyReportDefault } from './useWeeklyReportDefault';
import { useWeeklyReportData } from './useWeeklyReportData';
import { useWeeklyReportNavigation } from './useWeeklyReportNavigation';

import { useAbortableEffect } from '@/hooks/common/useAbortableEffect';
import { useToast } from '@/components/common';

// 統合フックの戻り値の型定義
interface UseWeeklyReportReturn extends Pick<UseWeeklyReportStateReturn, 'report' | 'setReport' | 'errors' | 'loading' | 'isSubmitted' | 'isDraft'> {
  totalHours: number;
  clientTotalHours: number;
  loadWeeklyReport: (signal?: AbortSignal) => Promise<void>;
  handleSelectCurrentWeek: () => Promise<void>;
  handleSelectPreviousWeek: () => Promise<void>;
  handleSelectNextWeek: () => Promise<void>;
  handleWeekSelect: (startStr: string, endStr: string) => Promise<void>;
  handleSaveDraft: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  validateForm: () => boolean;
  checkSameWorkTimes: () => { hasSameTime: boolean, message: string };
  calculateTotalHours: () => { companyTotal: number, clientTotal: number };
  applyDefaultSettingsToCurrentReport: (defaultSettings: ApiDefaultWorkTimeSettings) => void;
  forceApplyDefaultSettingsToCurrentReport: (defaultSettings: ApiDefaultWorkTimeSettings) => void;
}

/**
 * 週報データの取得と更新を管理する統合カスタムフック
 * 複数の専門フックを組み合わせて、既存のインターフェースと互換性を保つ
 */
export const useWeeklyReport = (defaultSettings?: ApiDefaultWorkTimeSettings): UseWeeklyReportReturn => {
  const { showWarning } = useToast();
  
  // 専門フックを使用
  const { 
    report, 
    setReport, 
    errors, 
    setErrors, 
    loading, 
    setLoading, 
    isSubmitted, 
    isDraft 
  } = useWeeklyReportState();
  
  const { calculateTotalHours, getTotalHours, getClientTotalHours } = useWeeklyReportCalc();
  const { validateForm, checkSameWorkTimes } = useWeeklyReportValidation();
  const { generateDailyRecordsFromDateRange, applyDefaultSettingsToReport, forceApplyDefaultSettingsToReport, isReportNew } = useWeeklyReportDefault();
  const { 
    loadWeeklyReport: loadData, 
    loadWeeklyReportByDateRange, 
    saveWeeklyReportDraft, 
    submitWeeklyReport 
  } = useWeeklyReportData();
  const { 
    handleSelectCurrentWeek: selectCurrentWeek,
    handleSelectPreviousWeek: selectPreviousWeek,
    handleSelectNextWeek: selectNextWeek,
    handleWeekSelect: selectWeek,
  } = useWeeklyReportNavigation();

  // 合計時間を計算
  const totalHours = getTotalHours(report);
  const clientTotalHours = getClientTotalHours(report);

  // 日次レコードの生成はloadWeeklyReportData内で処理されるため、ここでは不要

  // デフォルト設定を適用する関数をラップ
  const applyDefaultSettingsToCurrentReport = useCallback((defaultSettings: ApiDefaultWorkTimeSettings) => {
    // 未提出の週報の場合、デフォルト設定を適用
    if (!isSubmitted(report.status) && !isDraft(report.status)) {
      const updatedReport = applyDefaultSettingsToReport(report, defaultSettings, isSubmitted, isDraft);
      setReport(updatedReport);
    }
  }, [report, applyDefaultSettingsToReport, isSubmitted, isDraft, setReport]);
  
  // デフォルト設定を強制適用する関数（保存ボタン押下時用）
  const forceApplyDefaultSettingsToCurrentReport = useCallback((defaultSettings: ApiDefaultWorkTimeSettings) => {
    // 未提出の週報の場合、デフォルト設定を強制適用
    if (!isSubmitted(report.status) && !isDraft(report.status)) {
      const updatedReport = forceApplyDefaultSettingsToReport(report, defaultSettings, isSubmitted, isDraft);
      setReport(updatedReport);
    }
  }, [report, forceApplyDefaultSettingsToReport, isSubmitted, isDraft, setReport]);

  // 日次レコード生成関数をラップ
  const generateDailyRecords = useCallback((startDate: Date, endDate: Date) => {
    // 新規レコード生成時は常にデフォルト設定を使用（既存データがない場合のみ呼ばれるため）
    return generateDailyRecordsFromDateRange(startDate, endDate, defaultSettings, []);
  }, [generateDailyRecordsFromDateRange, defaultSettings]);

  // デフォルト設定適用関数をラップ
  const applyDefaultSettingsWrapper = useCallback((report: WeeklyReport) => {
    if (defaultSettings && !isSubmitted(report.status) && !isDraft(report.status)) {
      return applyDefaultSettingsToReport(report, defaultSettings, isSubmitted, isDraft);
    }
    return report;
  }, [defaultSettings, applyDefaultSettingsToReport, isSubmitted, isDraft]);

  // 日付範囲によるデータ読み込み関数をラップ
  const loadByDateRange = useCallback(async (startDate: Date, endDate: Date) => {
    return await loadWeeklyReportByDateRange(startDate, endDate, setReport, setLoading, generateDailyRecords, applyDefaultSettingsWrapper);
  }, [loadWeeklyReportByDateRange, setReport, setLoading, generateDailyRecords, applyDefaultSettingsWrapper]);

  // 週次レポートを取得
  const loadWeeklyReport = useCallback(async (signal?: AbortSignal) => {
    await loadData(setReport, setLoading, setErrors, generateDailyRecords, signal, applyDefaultSettingsWrapper);
  }, [loadData, setReport, setLoading, setErrors, generateDailyRecords, applyDefaultSettingsWrapper]);

  // 初期データ取得は親コンポーネント側で制御するため、ここでは実行しない
  // デフォルト設定が読み込まれた後に実行される必要があるため

  // 今週を選択するハンドラー
  const handleSelectCurrentWeek = useCallback(async () => {
    await selectCurrentWeek(setReport, setLoading, loadByDateRange);
  }, [selectCurrentWeek, setReport, setLoading, loadByDateRange]);

  // 前週を選択するハンドラー
  const handleSelectPreviousWeek = useCallback(async () => {
    await selectPreviousWeek(report.startDate, setReport, setLoading, loadByDateRange);
  }, [selectPreviousWeek, report.startDate, setReport, setLoading, loadByDateRange]);

  // 次週を選択するハンドラー
  const handleSelectNextWeek = useCallback(async () => {
    await selectNextWeek(report.startDate, setReport, setLoading, loadByDateRange);
  }, [selectNextWeek, report.startDate, setReport, setLoading, loadByDateRange]);

  // 週選択ハンドラー
  const handleWeekSelect = useCallback(async (startStr: string, endStr: string) => {
    await selectWeek(startStr, endStr, setReport, setLoading, loadByDateRange);
  }, [selectWeek, setReport, setLoading, loadByDateRange]);

  // 下書き保存ハンドラー
  const handleSaveDraft = useCallback(async () => {
    const isValid = validateForm(report, setErrors);
    if (isValid) {
      await saveWeeklyReportDraft(report, setReport, setLoading);
    }
  }, [report, validateForm, setErrors, saveWeeklyReportDraft, setReport, setLoading]);

  // 提出ハンドラー
  const handleSubmit = useCallback(async () => {
    const isValid = validateForm(report, setErrors);
    if (!isValid) return;
    
    // 自社勤怠と客先勤怠の時間が同じかチェック
    const { hasSameTime, message } = checkSameWorkTimes(report);
    
    if (hasSameTime) {
      showWarning(message);
      return; // エラーがある場合は処理を中断
    }
    
    await submitWeeklyReport(report, setReport, setLoading);
  }, [report, validateForm, setErrors, checkSameWorkTimes, showWarning, submitWeeklyReport, setReport, setLoading]);

  // 既存インターフェースとの互換性を保つ関数
  const calculateTotalHoursCompat = useCallback(() => {
    return calculateTotalHours(report);
  }, [calculateTotalHours, report]);

  const validateFormCompat = useCallback(() => {
    return validateForm(report, setErrors);
  }, [validateForm, report, setErrors]);

  const checkSameWorkTimesCompat = useCallback(() => {
    return checkSameWorkTimes(report);
  }, [checkSameWorkTimes, report]);

  return {
    report,
    loading,
    errors,
    totalHours,
    clientTotalHours,
    setReport,
    loadWeeklyReport,
    handleSelectCurrentWeek,
    handleSelectPreviousWeek,
    handleSelectNextWeek,
    handleWeekSelect,
    handleSaveDraft,
    handleSubmit,
    validateForm: validateFormCompat,
    checkSameWorkTimes: checkSameWorkTimesCompat,
    calculateTotalHours: calculateTotalHoursCompat,
    isSubmitted,
    isDraft,
    applyDefaultSettingsToCurrentReport,
    forceApplyDefaultSettingsToCurrentReport
  };
};