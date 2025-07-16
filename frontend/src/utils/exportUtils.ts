import { AdminWeeklyReport } from '@/types/admin/weeklyReport';
import { formatDate } from '@/utils/dateUtils';

// 未提出者管理用の型定義
interface UnsubmittedReport {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  department: string;
  manager_name: string;
  start_date: string;
  end_date: string;
  days_overdue: number;
  reminder_sent_at?: string;
  reminder_count: number;
}

/**
 * CSV形式でデータをエクスポート
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    alert('エクスポートするデータがありません');
    return;
  }

  // BOMを追加（Excelで日本語が文字化けしないように）
  const BOM = '\uFEFF';
  
  // ヘッダーを取得
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  // データ行を生成
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // 値にカンマや改行が含まれる場合はダブルクォートで囲む
      if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',');
  });
  
  // CSVデータを結合
  const csvContent = BOM + csvHeaders + '\n' + csvRows.join('\n');
  
  // Blobを作成してダウンロード
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 週報データをCSV用に整形
 */
export const formatWeeklyReportsForExport = (reports: AdminWeeklyReport[]) => {
  return reports.map(report => ({
    'エンジニア名': report.user_name,
    'メールアドレス': report.user_email,
    '週開始日': formatDate(report.start_date),
    '週終了日': formatDate(report.end_date),
    'ステータス': getStatusLabel(report.status),
    '気分': getMoodLabel(report.mood),
    '総勤務時間': `${report.total_work_hours}時間`,
    '案件情報': report.project_summary || '',
    'コメント返信': report.manager_comment ? '済' : '未',
    '管理者コメント': report.manager_comment || '',
    '提出日時': report.submitted_at ? formatDate(report.submitted_at, 'YYYY/MM/DD HH:mm') : '',
  }));
};

/**
 * ステータスのラベルを取得
 */
const getStatusLabel = (status: number): string => {
  const statusMap: Record<number, string> = {
    0: '未提出',
    1: '下書き',
    2: '提出済み',
  };
  return statusMap[status] || '不明';
};

/**
 * 気分のラベルを取得
 */
const getMoodLabel = (mood: number): string => {
  const moodMap: Record<number, string> = {
    1: 'サイテー',
    2: 'イマイチ',
    3: 'ふつう',
    4: 'イイ感じ',
    5: 'サイコー',
  };
  return moodMap[mood] || '-';
};

/**
 * Excel形式でデータをエクスポート（ライブラリなしの簡易版）
 */
export const exportToExcel = async (data: any[], filename: string) => {
  // SheetJSを動的にインポート
  try {
    const XLSX = await import('xlsx');
    
    // ワークシートを作成
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // 列幅を自動調整
    const maxWidth = 50;
    const colWidths = Object.keys(data[0]).map(key => {
      const maxLength = Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      );
      return { wch: Math.min(maxLength + 2, maxWidth) };
    });
    worksheet['!cols'] = colWidths;
    
    // ワークブックを作成
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '週報一覧');
    
    // Excelファイルとして保存
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('Excel export error:', error);
    // xlsxライブラリがない場合はCSVにフォールバック
    alert('Excel形式でのエクスポートに失敗しました。CSV形式でエクスポートします。');
    exportToCSV(data, filename);
  }
};

/**
 * 日付範囲を含むファイル名を生成
 */
export const generateExportFilename = (
  prefix: string,
  startDate?: string,
  endDate?: string
): string => {
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  if (startDate && endDate) {
    const start = startDate.replace(/-/g, '');
    const end = endDate.replace(/-/g, '');
    return `${prefix}_${start}-${end}_${timestamp}`;
  }
  
  return `${prefix}_${timestamp}`;
};

/**
 * 未提出者データをCSV用に整形
 */
export const formatUnsubmittedReportsForExport = (reports: UnsubmittedReport[]) => {
  return reports.map(report => ({
    'エンジニア名': report.user_name,
    'メールアドレス': report.user_email,
    '部署': report.department,
    '週開始日': formatDate(report.start_date),
    '週終了日': formatDate(report.end_date),
    '経過日数': `${report.days_overdue}日`,
    'マネージャー': report.manager_name,
    'リマインド送信回数': report.reminder_count,
    '最終リマインド送信日': report.reminder_sent_at ? formatDate(report.reminder_sent_at, 'YYYY/MM/DD HH:mm') : '未送信',
    'ステータス': report.days_overdue >= 14 ? '要エスカレーション' : report.days_overdue >= 7 ? '要注意' : '経過観察',
  }));
};