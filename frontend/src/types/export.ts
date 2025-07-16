// エクスポートジョブ関連の型定義

export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ExportJobType = 'weekly_report' | 'monthly_attendance' | 'monthly_summary';
export type ExportJobFormat = 'csv' | 'excel' | 'pdf';

export interface ExportJob {
  job_id: string;
  status: ExportJobStatus;
  job_type: ExportJobType;
  format: ExportJobFormat;
  progress: number;
  total_records: number;
  processed_rows: number;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface CreateExportJobRequest {
  job_type: ExportJobType;
  format: ExportJobFormat;
  parameters: WeeklyReportExportParams | MonthlyAttendanceExportParams | MonthlySummaryExportParams;
}

export interface WeeklyReportExportParams {
  start_date: string;
  end_date: string;
  status?: string[];
  user_ids?: string[];
  department_id?: string;
}

export interface MonthlyAttendanceExportParams {
  year: number;
  month: number;
  user_ids?: string[];
  department_id?: string;
}

export interface MonthlySummaryExportParams {
  year: number;
  month: number;
  department_id?: string;
}

export interface ExportJobStatusResponse {
  job_id: string;
  status: ExportJobStatus;
  progress: number;
  total_records: number;
  processed_rows: number;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  created_at: string;
}