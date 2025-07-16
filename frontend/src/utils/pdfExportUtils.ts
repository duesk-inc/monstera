import { AdminWeeklyReport } from '@/types/admin/weeklyReport';
import { formatDate } from '@/utils/dateUtils';

/**
 * HTMLコンテンツをPDFとしてエクスポート
 */
export const exportToPDF = async (content: string, filename: string) => {
  try {
    // jsPDFを動的にインポート
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');
    
    // 日本語フォントの設定が必要な場合はここで行う
    const doc = new jsPDF();
    
    // PDFにコンテンツを追加
    doc.html(content, {
      callback: function (doc) {
        doc.save(`${filename}.pdf`);
      },
      x: 10,
      y: 10,
      width: 180,
      windowWidth: 800,
    });
  } catch (error) {
    console.error('PDF export error:', error);
    throw error;
  }
};

/**
 * 週報詳細をHTML形式で生成
 */
export const generateWeeklyReportHTML = (report: AdminWeeklyReport): string => {
  const moodLabels: Record<number, string> = {
    1: 'サイテー 😞',
    2: 'イマイチ 😕',
    3: 'ふつう 😐',
    4: 'イイ感じ 😊',
    5: 'サイコー 🤩',
  };

  const statusLabels: Record<number, string> = {
    0: '未提出',
    1: '下書き',
    2: '提出済み',
  };

  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          padding: 20px;
        }
        .header {
          border-bottom: 2px solid #1976d2;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        h1 {
          color: #1976d2;
          margin: 0 0 10px 0;
        }
        .meta-info {
          display: flex;
          gap: 30px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
        }
        .meta-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 2px;
        }
        .meta-value {
          font-size: 16px;
          font-weight: 500;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #1976d2;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #e0e0e0;
        }
        .content {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          white-space: pre-wrap;
        }
        .work-hours {
          display: flex;
          gap: 20px;
          margin-top: 10px;
        }
        .work-hour-item {
          background-color: #e3f2fd;
          padding: 10px 15px;
          border-radius: 4px;
        }
        .comment-section {
          background-color: #fff3e0;
          padding: 15px;
          border-radius: 4px;
          border-left: 4px solid #ff9800;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>週報レポート</h1>
        <div class="meta-info">
          <div class="meta-item">
            <span class="meta-label">エンジニア</span>
            <span class="meta-value">${report.user_name}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">期間</span>
            <span class="meta-value">${formatDate(report.start_date)} 〜 ${formatDate(report.end_date)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">ステータス</span>
            <span class="meta-value">${statusLabels[report.status]}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">気分</span>
            <span class="meta-value">${moodLabels[report.mood] || '-'}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">案件情報</div>
        <div class="content">${report.project_summary || '記載なし'}</div>
      </div>

      <div class="section">
        <div class="section-title">今週の成果</div>
        <div class="content">${report.weekly_achievement || '記載なし'}</div>
      </div>

      <div class="section">
        <div class="section-title">課題事項</div>
        <div class="content">${report.issues || '記載なし'}</div>
      </div>

      <div class="section">
        <div class="section-title">来週の予定</div>
        <div class="content">${report.next_week_plan || '記載なし'}</div>
      </div>

      <div class="section">
        <div class="section-title">勤務時間</div>
        <div class="work-hours">
          <div class="work-hour-item">
            <div class="meta-label">総勤務時間</div>
            <div class="meta-value">${report.total_work_hours}時間</div>
          </div>
          <div class="work-hour-item">
            <div class="meta-label">残業時間</div>
            <div class="meta-value">${report.overtime_hours || 0}時間</div>
          </div>
        </div>
      </div>

      ${report.manager_comment ? `
        <div class="section">
          <div class="section-title">管理者コメント</div>
          <div class="comment-section">${report.manager_comment}</div>
        </div>
      ` : ''}

      <div class="footer">
        <p>作成日時: ${new Date().toLocaleString('ja-JP')}</p>
        <p>Monstera 週報管理システム</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * 簡易的なPDFエクスポート（ライブラリなし）
 */
export const exportWeeklyReportAsPDF = (report: AdminWeeklyReport) => {
  const html = generateWeeklyReportHTML(report);
  const filename = `weekly_report_${report.user_name}_${report.start_date.replace(/-/g, '')}`;
  
  // 新しいウィンドウで印刷ダイアログを開く
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    // 印刷ダイアログを開く
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
};