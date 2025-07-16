/**
 * 未提出者管理機能のテストデータ
 */

export const unsubmittedTestData = {
  // テスト用ユーザー
  users: [
    {
      id: 'user-1',
      name: '山田 太郎',
      email: 'yamada@duesk.co.jp',
      department: '開発部',
      manager: '佐藤 次郎',
    },
    {
      id: 'user-2',
      name: '鈴木 花子',
      email: 'suzuki@duesk.co.jp',
      department: '営業部',
      manager: '田中 三郎',
    },
    {
      id: 'user-3',
      name: '高橋 健一',
      email: 'takahashi@duesk.co.jp',
      department: '開発部',
      manager: '佐藤 次郎',
    },
  ],

  // 未提出レポート
  unsubmittedReports: [
    {
      userId: 'user-1',
      weekStart: '2024-01-01',
      weekEnd: '2024-01-07',
      daysOverdue: 7,
      reminderCount: 1,
      lastReminderSent: '2024-01-08',
    },
    {
      userId: 'user-2',
      weekStart: '2023-12-25',
      weekEnd: '2023-12-31',
      daysOverdue: 14,
      reminderCount: 2,
      lastReminderSent: '2024-01-05',
    },
    {
      userId: 'user-3',
      weekStart: '2023-12-18',
      weekEnd: '2023-12-24',
      daysOverdue: 21,
      reminderCount: 0,
      lastReminderSent: null,
    },
  ],

  // サマリー統計
  summary: {
    totalUnsubmitted: 3,
    overdue7Days: 3,
    overdue14Days: 2,
    escalationTargets: 2,
  },

  // 部署リスト
  departments: [
    { id: 'dept-1', name: '開発部' },
    { id: 'dept-2', name: '営業部' },
    { id: 'dept-3', name: '人事部' },
    { id: 'dept-4', name: '経理部' },
  ],

  // リマインダーメッセージテンプレート
  reminderTemplates: {
    default: '週報の提出をお願いいたします。',
    urgent: '至急、週報の提出をお願いいたします。',
    final: '最終通知：週報が未提出です。速やかに提出してください。',
  },
};

/**
 * モックレスポンスを生成
 */
export const generateMockResponses = () => {
  return {
    // 未提出者一覧API
    unsubmittedList: {
      success: true,
      data: {
        reports: unsubmittedTestData.unsubmittedReports.map((report, index) => {
          const user = unsubmittedTestData.users[index];
          return {
            id: `report-${index}`,
            user_id: report.userId,
            user_name: user.name,
            user_email: user.email,
            department: user.department,
            manager_name: user.manager,
            start_date: report.weekStart,
            end_date: report.weekEnd,
            days_overdue: report.daysOverdue,
            reminder_count: report.reminderCount,
            reminder_sent_at: report.lastReminderSent,
          };
        }),
        summary: {
          total_unsubmitted: unsubmittedTestData.summary.totalUnsubmitted,
          overdue_7days: unsubmittedTestData.summary.overdue7Days,
          overdue_14days: unsubmittedTestData.summary.overdue14Days,
          escalation_targets: unsubmittedTestData.summary.escalationTargets,
        },
      },
    },

    // リマインダー送信API
    sendReminder: {
      success: true,
      message: 'リマインダーを送信しました',
    },

    // 一括リマインダー送信API
    sendBulkReminders: {
      success: true,
      message: '3名にリマインダーを送信しました',
      sent_count: 3,
    },
  };
};

/**
 * テスト用の待機時間
 */
export const testTimeouts = {
  short: 1000,
  medium: 3000,
  long: 5000,
  networkIdle: 10000,
};