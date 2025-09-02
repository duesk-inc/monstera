import { format, parseISO } from 'date-fns';
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';
import { calculateWorkHours } from '@/utils/dateUtils';
import type { 
  DailyRecord, 
  WeeklyReport
} from '@/types/weeklyReport';

// APIレコード型定義（一時的）
interface LocalAPIWeeklyReport {
  id?: string;
  start_date: string;
  end_date: string;
  status?: string;  // ENUM型文字列に統一
  submitted_at?: string;
  weekly_remarks?: string;
  daily_records?: Record<string, any>[];
  workplace_change_requested?: boolean;
}

// APIからのデータ変換ヘルパー関数
export const convertAPIResponseToUIModel = (apiReport: LocalAPIWeeklyReport): WeeklyReport => {
  const dailyRecords: DailyRecord[] = [];
  
  // 時刻文字列をHH:mm形式に変換するヘルパー関数
  const extractTimeString = (timeValue: any): string => {
    if (!timeValue) return '';
    
    const timeStr = String(timeValue);
    
    // ISO日時形式（例：2025-05-19T06:00:00）の場合
    if (timeStr.includes('T')) {
      const timePart = timeStr.split('T')[1];
      if (timePart) {
        return timePart.substring(0, 5); // HH:mm部分を抽出
      }
    }
    
    // 既にHH:mmまたはHH:mm:ss形式の場合
    if (timeStr.includes(':')) {
      return timeStr.substring(0, 5);
    }
    
    // その他の場合は空文字列を返す
    return '';
  };

  const convertDailyRecord = (record: Record<string, any>): DailyRecord => {
    const startTime = extractTimeString(record.start_time || record.startTime);
    const endTime = extractTimeString(record.end_time || record.endTime);
    const clientStartTime = extractTimeString(record.client_start_time || record.clientStartTime);
    const clientEndTime = extractTimeString(record.client_end_time || record.clientEndTime);
    
    const breakTime = typeof record.break_time === 'number' 
      ? record.break_time 
      : (typeof record.breakTime === 'number' ? record.breakTime : 1.0);
    
    const clientBreakTime = typeof record.client_break_time === 'number' 
      ? record.client_break_time 
      : (typeof record.clientBreakTime === 'number' ? record.clientBreakTime : 0);
    
    const hasClientWork = record.has_client_work === true || record.hasClientWork === true || false;
    const remarks = record.remarks !== undefined && record.remarks !== null ? String(record.remarks) : '';
    const isHolidayWork = record.is_holiday_work === true || record.isHolidayWork === true || false;
    
    return {
      date: record.date || '',
      startTime: startTime,
      endTime: endTime,
      breakTime: breakTime,
      clientStartTime: clientStartTime,
      clientEndTime: clientEndTime,
      clientBreakTime: clientBreakTime,
      hasClientWork: hasClientWork,
      remarks: remarks,
      isHolidayWork: isHolidayWork
    };
  };
  
  // convertSnakeToCamel後のデータを処理するため、camelCaseとsnake_case両方をチェック
  const records = (apiReport as any).dailyRecords || apiReport.daily_records;
  
  if (records && Array.isArray(records)) {
    records.forEach((record: Record<string, any>) => {
      if (record) {
        dailyRecords.push(convertDailyRecord(record));
      }
    });
  }
  
  // APIレスポンスは既にconvertSnakeToCamelで処理済みなのでキャメルケースでアクセス
  const apiData = apiReport as any;
  const totalWorkHours = apiData.totalWorkHours ?? apiData.total_work_hours ?? 0;
  const clientTotalWorkHours = apiData.clientTotalWorkHours ?? apiData.client_total_work_hours ?? 0;
  
  // デバッグ用にAPIレスポンスの日付データを確認
  const startDateStr = apiData.startDate || apiReport.start_date;
  const endDateStr = apiData.endDate || apiReport.end_date;
  
  if (!startDateStr || !endDateStr) {
    console.warn('週報の日付データが取得できません:', { startDateStr, endDateStr, apiReport });
  }
  
  const weeklyReport: WeeklyReport = {
    id: apiReport.id || undefined,
    startDate: startDateStr ? parseISO(startDateStr) : new Date(),
    endDate: endDateStr ? parseISO(endDateStr) : new Date(),
    dailyRecords: dailyRecords,
    weeklyRemarks: apiData.weeklyRemarks || apiReport.weekly_remarks || '',
    status: apiReport.status ?? WEEKLY_REPORT_STATUS.NOT_SUBMITTED,
    submittedAt: apiData.submittedAt || apiReport.submitted_at || '',
    totalWorkHours: totalWorkHours,
    clientTotalWorkHours: clientTotalWorkHours,
    workplaceChangeRequested: apiData.workplaceChangeRequested ?? apiReport.workplace_change_requested ?? false,
  };
  
  return weeklyReport;
};

// API送信用型定義（一時的）
interface APIReportType {
  id?: string;
  startDate: string;
  endDate: string;
  dailyRecords: Record<string, any>[];
  weeklyRemarks: string;
  status: string;  // ENUM型文字列に統一
  workplaceChangeRequested: boolean;
}

// UIモデルをAPI用に変換するヘルパー関数
export const convertUIModelToAPIRequest = (uiReport: WeeklyReport): APIReportType => {
  const dailyRecords: Record<string, any>[] = uiReport.dailyRecords.map(record => {
    const workHours = calculateWorkHours(record.startTime, record.endTime, record.breakTime);
    
    const formatTimeWithSeconds = (timeStr: string): string => {
      if (!timeStr) return '';
      if (timeStr.split(':').length === 3) return timeStr;
      return `${timeStr}:00`;
    };
    
    const clientStartTime = record.hasClientWork ? record.clientStartTime : record.startTime;
    const clientEndTime = record.hasClientWork ? record.clientEndTime : record.endTime;
    const clientBreakTime = record.hasClientWork ? (record.clientBreakTime || 0) : record.breakTime;
    const clientWorkHours = calculateWorkHours(
      clientStartTime || '',
      clientEndTime || '', 
      clientBreakTime
    );
    
    return {
      date: record.date,
      startTime: formatTimeWithSeconds(record.startTime),
      endTime: formatTimeWithSeconds(record.endTime),
      breakTime: record.breakTime,
      workHours: workHours,
      clientStartTime: formatTimeWithSeconds(clientStartTime || ''),
      clientEndTime: formatTimeWithSeconds(clientEndTime || ''),
      clientBreakTime: clientBreakTime,
      clientWorkHours: clientWorkHours,
      hasClientWork: !!record.hasClientWork,
      remarks: record.remarks,
      isHolidayWork: record.isHolidayWork
    };
  });
  
  const startDateStr = format(uiReport.startDate, 'yyyy-MM-dd');
  const endDateStr = format(uiReport.endDate, 'yyyy-MM-dd');
  
  const apiReport: APIReportType = {
    id: uiReport.id,
    startDate: startDateStr,
    endDate: endDateStr,
    status: uiReport.status ?? WEEKLY_REPORT_STATUS.NOT_SUBMITTED,
    weeklyRemarks: uiReport.weeklyRemarks,
    dailyRecords: dailyRecords,
    workplaceChangeRequested: uiReport.workplaceChangeRequested || false,
  };
  
  return apiReport;
};

