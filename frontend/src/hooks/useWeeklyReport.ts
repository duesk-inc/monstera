import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  WeeklyReport, 
  DailyRecord, 
  SnackbarState, 
  ErrorState 
} from '@/types/weeklyReport';
import { 
  getWeeklyReport,
  getWeeklyReportByDateRange,
  saveWeeklyReportAsDraft,
  saveAndSubmitWeeklyReport
} from '@/lib/api/weeklyReport';
import { convertAPIResponseToUIModel, convertUIModelToAPIRequest } from '@/lib/mappers/weeklyReport';
import { 
  getCurrentWeek, 
  getPreviousWeek, 
  getNextWeek 
} from '@/utils/dateUtils';
import { 
  checkSameWorkTimes,
  calculateTotalHours,
  validateWeeklyReport,
  isSubmitted,
  isDraft
} from '@/utils/weeklyReportUtils';
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';
import { WEEKLY_REPORT_MOOD } from '@/constants/weeklyMood';

export const useWeeklyReport = (reportId?: string | null) => {
  // 初期値の設定
  const defaultWeek = getCurrentWeek();
  
  // 週報の状態
  const [report, setReport] = useState<WeeklyReport>({
    startDate: defaultWeek.startDate,
    endDate: defaultWeek.endDate,
    dailyRecords: [],
    mood: WEEKLY_REPORT_MOOD.NEUTRAL,
    weeklyRemarks: '',
    status: WEEKLY_REPORT_STATUS.NOT_SUBMITTED,
    totalWorkHours: 0,
    clientTotalWorkHours: 0,
    workplaceChangeRequested: false,
  });

  // 入力バリデーション
  const [errors, setErrors] = useState<ErrorState>({});

  // ローディング状態
  const [loading, setLoading] = useState(false);
  
  // 週の日付配列を生成
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  
  // スナックバー状態
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  // 日々の記録更新ハンドラー
  const handleDailyRecordChange = (index: number, field: keyof DailyRecord, value: string | number | boolean) => {
    const newDailyRecords = [...report.dailyRecords];
    newDailyRecords[index] = {
      ...newDailyRecords[index],
      [field]: value,
    };
    
    setReport({
      ...report,
      dailyRecords: newDailyRecords,
    });
  };

  // 時間入力ハンドラー
  const handleTimeChange = (index: number, field: 'startTime' | 'endTime', time: Date | null) => {
    if (!time) return;
    
    // HH:MM形式で保存（UIでの表示用）
    const timeString = format(time, 'HH:mm');
    handleDailyRecordChange(index, field, timeString);
  };
  
  // 休憩時間の入力ハンドラー（数値用）
  const handleBreakTimeChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    handleDailyRecordChange(index, 'breakTime', numValue);
  };

  // 休日出勤フラグ切替ハンドラー
  const handleHolidayWorkToggle = (index: number) => {
    const record = report.dailyRecords[index];
    const isEnabling = !record.isHolidayWork; // 切り替え後の状態（trueなら有効化）
    
    // 現状のフラグを反転
    handleDailyRecordChange(index, 'isHolidayWork', isEnabling);
  };

  // テキスト入力ハンドラー
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setReport({
      ...report,
      [name]: value,
    });
    
    // バリデーションエラーをクリア
    if (errors[name as keyof ErrorState]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
  };

  // 客先勤怠関連フィールド更新ハンドラー
  const handleClientDailyRecordChange = (
    index: number, 
    field: 'clientStartTime' | 'clientEndTime' | 'hasClientWork', 
    value: string | boolean
  ) => {
    const newDailyRecords = [...report.dailyRecords];
    const record = newDailyRecords[index];
    
    if (field === 'hasClientWork' && typeof value === 'boolean') {
      if (value) {
        // 有効化する場合、自社勤怠の値をコピーする
        newDailyRecords[index] = {
          ...record,
          hasClientWork: true,
          clientStartTime: record.startTime || '',
          clientEndTime: record.endTime || '',
          clientBreakTime: record.breakTime || 0,
        };
      } else {
        // 無効化する場合、客先勤怠の値をクリア
        newDailyRecords[index] = {
          ...record,
          hasClientWork: false,
          clientStartTime: '',
          clientEndTime: '',
          clientBreakTime: 0,
          clientWorkHours: 0
        };
      }
    } else if (typeof value === 'string') {
      // 客先勤怠の時間を直接更新
      newDailyRecords[index] = {
        ...record,
        [field]: value,
        hasClientWork: true
      };
    }
    
    setReport({
      ...report,
      dailyRecords: newDailyRecords,
    });
  };
  
  // 客先休憩時間の入力ハンドラー
  const handleClientBreakTimeChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newDailyRecords = [...report.dailyRecords];
    newDailyRecords[index] = {
      ...newDailyRecords[index],
      clientBreakTime: numValue,
      // 客先勤怠が入力された場合、hasClientWorkをtrueに
      hasClientWork: true
    };
    
    setReport({
      ...report,
      dailyRecords: newDailyRecords,
    });
  };
  
  // バリデーションチェック
  const validateForm = (): boolean => {
    const { isValid, errors: validationErrors } = validateWeeklyReport(report);
    setErrors(validationErrors);
    return isValid;
  };
  
  // 下書き保存ハンドラー
  const handleSaveDraft = async () => {
    if (validateForm()) {
      setLoading(true);
      
      try {
        // APIリクエスト用のデータを準備
        const apiReport = convertUIModelToAPIRequest(report);
        
        // 下書き保存用のAPIを呼び出し
        const savedReport = await saveWeeklyReportAsDraft(apiReport);
        
        // 保存したレポートから必要な情報だけを取得して状態を更新
        if (savedReport) {
          // ステータスと週報IDのみ更新
          setReport(prev => ({
            ...prev,
            id: savedReport.id || prev.id,
            status: savedReport.status || WEEKLY_REPORT_STATUS.DRAFT
          }));
          
          // 成功メッセージを表示
          setSnackbar({
            open: true,
            message: '下書きとして保存しました',
            severity: 'success',
          });
          
          return true;
        } else {
          // レスポンスがない場合のエラーハンドリング
          throw new Error('保存後のレスポンスデータが空です');
        }
      } catch (error) {
        console.error('保存に失敗しました', error);
        setSnackbar({
          open: true,
          message: '保存に失敗しました',
          severity: 'error',
        });
        return false;
      } finally {
        setLoading(false);
      }
    }
    return false;
  };
  
  // 提出ハンドラー
  const handleSubmit = async () => {
    if (validateForm()) {
      // 自社勤怠と客先勤怠の時間が同じかチェック
      const { hasSameTime, message } = checkSameWorkTimes(report.dailyRecords);
      
      if (hasSameTime) {
        setSnackbar({
          open: true,
          message: message,
          severity: 'error',
        });
        return false; // エラーがある場合は処理を中断
      }
      
      setLoading(true);
      
      try {
        // APIリクエスト用のデータを準備
        const apiReport = convertUIModelToAPIRequest(report);
        
        // 提出用のAPIを呼び出し
        const submittedReport = await saveAndSubmitWeeklyReport(apiReport);
        
        // 提出したレポートから必要な情報だけを取得して状態を更新
        if (submittedReport) {
          // ステータスのみを更新
          setReport(prev => ({
            ...prev,
            status: submittedReport.status || WEEKLY_REPORT_STATUS.SUBMITTED,
            submittedAt: submittedReport.submittedAt 
          }));
          
          // 成功メッセージを表示
          setSnackbar({
            open: true,
            message: '週報を提出しました',
            severity: 'success',
          });
          
          return true;
        } else {
          // レスポンスがない場合のエラーハンドリング
          throw new Error('提出後のレスポンスデータが空です');
        }
      } catch (error) {
        console.error('提出に失敗しました', error);
        setSnackbar({
          open: true,
          message: '提出に失敗しました',
          severity: 'error',
        });
        return false;
      } finally {
        setLoading(false);
      }
    }
    return false;
  };
  
  // 週報データの読み込み
  const loadWeeklyReport = async (reportId: string) => {
    try {
      setLoading(true);
      const apiReport = await getWeeklyReport(reportId);
      const uiReport = convertAPIResponseToUIModel(apiReport);
      setReport(uiReport);
      return uiReport;
    } catch (error) {
      console.error('週報の読み込みに失敗しました', error);
      setSnackbar({
        open: true,
        message: '週報の読み込みに失敗しました',
        severity: 'error',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // 週の選択ハンドラー
  const loadWeekReport = async (startDate: Date, endDate: Date) => {
    setLoading(true);
    
    try {
      // 週の日付から既存の週報データを取得
      const response = await getWeeklyReportByDateRange(
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      );	
      
      if (response) {
        // 既存の週報データがある場合、それを変換して設定
        const uiReport = convertAPIResponseToUIModel(response);
        setReport(uiReport);
        
        // 成功メッセージを表示
        setSnackbar({
          open: true,
          message: '週報データを読み込みました',
          severity: 'success',
        });
        
        return uiReport;
      } else {
        // 既存の週報データがない場合は、新しい週だけ設定
        const newReport = {
          ...report,
          startDate,
          endDate,
          // 既存のID等をリセット（新規作成モードに）
          id: undefined,
          submittedAt: undefined,
          status: WEEKLY_REPORT_STATUS.NOT_SUBMITTED,
          workplaceChangeRequested: false,
        };
        
        setReport(newReport);
        
        // 情報メッセージを表示
        setSnackbar({
          open: true,
          message: '選択した週の新規週報を作成します',
          severity: 'info',
        });
        
        return newReport;
      }
    } catch (error) {
      console.error('週報データの取得に失敗しました', error);
      
      // エラーメッセージを表示
      setSnackbar({
        open: true,
        message: '週報データの取得に失敗しました',
        severity: 'error',
      });
      
      // エラー時も日付は更新
      const errorReport = {
        ...report,
        startDate,
        endDate,
      };
      
      setReport(errorReport);
      return errorReport;
    } finally {
      // ローディング状態を終了
      setLoading(false);
    }
  };
  
  // 前週を選択するハンドラー
  const handleSelectPreviousWeek = async () => {
    const previousWeek = getPreviousWeek(report.startDate);
    return await loadWeekReport(previousWeek.startDate, previousWeek.endDate);
  };
  
  // 今週を選択するハンドラー
  const handleSelectCurrentWeek = async () => {
    const currentWeek = getCurrentWeek();
    return await loadWeekReport(currentWeek.startDate, currentWeek.endDate);
  };
  
  // 次週を選択するハンドラー
  const handleSelectNextWeek = async () => {
    const nextWeek = getNextWeek(report.startDate);
    return await loadWeekReport(nextWeek.startDate, nextWeek.endDate);
  };
  
  // 初期データの読み込み
  useEffect(() => {
    const initWeeklyReport = async () => {
      if (reportId) {
        await loadWeeklyReport(reportId);
      } else {
        // 今週の週報を自動的に読み込む
        await handleSelectCurrentWeek();
      }
    };
    
    initWeeklyReport();
  }, [reportId]);
  
  // 週の日付配列を生成
  useEffect(() => {
    if (report.startDate && report.endDate) {
      const days: Date[] = [];
      const startDate = new Date(report.startDate);
      const endDate = new Date(report.endDate);
      
      // 開始日から終了日までの日付を配列に追加
      for (let currentDate = new Date(startDate); 
           currentDate <= endDate; 
           currentDate.setDate(currentDate.getDate() + 1)) {
        days.push(new Date(currentDate));
      }
      
      setWeekDays(days);
    }
  }, [report.startDate, report.endDate]);
  
  // 合計時間を計算
  const totals = calculateTotalHours(report.dailyRecords);
  
  return {
    report,
    setReport,
    loading,
    errors,
    weekDays,
    snackbar,
    setSnackbar,
    totalHours: totals.companyTotal,
    clientTotalHours: totals.clientTotal,
    handleDailyRecordChange,
    handleTimeChange,
    handleBreakTimeChange,
    handleHolidayWorkToggle,
    handleClientDailyRecordChange,
    handleClientBreakTimeChange,
    handleTextChange,
    handleSaveDraft,
    handleSubmit,
    handleSelectPreviousWeek,
    handleSelectCurrentWeek,
    handleSelectNextWeek,
    loadWeekReport,
    validateForm,
    isSubmitted: (status: string | undefined) => isSubmitted(status),
    isDraft: (status: string | undefined) => isDraft(status),
  };
}; 
