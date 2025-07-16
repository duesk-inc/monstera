/**
 * 管理者週報管理画面のE2Eテスト用データ
 */

export const testUsers = {
  admin: {
    email: 'admin@duesk.co.jp',
    password: 'admin123',
    role: 'admin',
    name: '管理者太郎'
  },
  manager: {
    email: 'manager@duesk.co.jp',
    password: 'manager123',
    role: 'manager',
    name: 'マネージャー次郎'
  },
  user: {
    email: 'user@duesk.co.jp',
    password: 'user123',
    role: 'user',
    name: 'ユーザー三郎'
  }
};

export const testDepartments = [
  '開発部',
  '営業部',
  'デザイン部',
  '人事部',
  '経理部'
];

export const testWeeklyReports = [
  {
    userId: 'user-001',
    userName: '田中太郎',
    department: '開発部',
    weekStart: '2024-01-01',
    weekEnd: '2024-01-07',
    status: 'submitted',
    totalHours: 45,
    submittedAt: '2024-01-08T10:00:00Z'
  },
  {
    userId: 'user-002',
    userName: '佐藤花子',
    department: '開発部',
    weekStart: '2024-01-01',
    weekEnd: '2024-01-07',
    status: 'unsubmitted',
    totalHours: 0,
    submittedAt: null
  },
  {
    userId: 'user-003',
    userName: '鈴木一郎',
    department: '営業部',
    weekStart: '2024-01-01',
    weekEnd: '2024-01-07',
    status: 'draft',
    totalHours: 40,
    submittedAt: null
  }
];

export const testUnsubmittedData = [
  {
    userId: 'user-002',
    userName: '佐藤花子',
    department: '開発部',
    managerName: '山田課長',
    weekPeriod: '2024/01/01 - 2024/01/07',
    daysOverdue: 5,
    reminderCount: 0,
    lastReminderDate: null
  },
  {
    userId: 'user-004',
    userName: '高橋次郎',
    department: '営業部',
    managerName: '田中部長',
    weekPeriod: '2024/01/01 - 2024/01/07',
    daysOverdue: 10,
    reminderCount: 1,
    lastReminderDate: '2024-01-10'
  },
  {
    userId: 'user-005',
    userName: '伊藤美咲',
    department: 'デザイン部',
    managerName: '佐々木マネージャー',
    weekPeriod: '2023/12/25 - 2023/12/31',
    daysOverdue: 15,
    reminderCount: 2,
    lastReminderDate: '2024-01-12'
  }
];

export const testAlertSettings = {
  weeklyHoursLimit: 60,
  weeklyChangeLimit: 20,
  holidayWorkLimit: 3,
  monthlyOvertimeLimit: 80
};

export const testMonthlySummary = {
  year: 2024,
  month: 1,
  totalEngineers: 50,
  submissionRate: 85.5,
  averageWorkHours: 42.3,
  totalAlerts: 12,
  departmentStats: [
    {
      department: '開発部',
      engineerCount: 20,
      submissionRate: 90.0,
      averageWorkHours: 45.2,
      alertCount: 5
    },
    {
      department: '営業部',
      engineerCount: 15,
      submissionRate: 80.0,
      averageWorkHours: 40.5,
      alertCount: 3
    },
    {
      department: 'デザイン部',
      engineerCount: 10,
      submissionRate: 85.0,
      averageWorkHours: 41.0,
      alertCount: 2
    }
  ]
};

export const testAlerts = [
  {
    id: 'alert-001',
    userId: 'user-001',
    userName: '田中太郎',
    type: 'overwork',
    severity: 'high',
    detectedValue: { hours: 70 },
    thresholdValue: { limit: 60 },
    createdAt: '2024-01-15T10:00:00Z',
    status: 'unhandled'
  },
  {
    id: 'alert-002',
    userId: 'user-003',
    userName: '鈴木一郎',
    type: 'sudden_change',
    severity: 'medium',
    detectedValue: { changeRate: 35 },
    thresholdValue: { limit: 20 },
    createdAt: '2024-01-15T11:00:00Z',
    status: 'handling'
  }
];

export const testExportData = {
  csv: {
    filename: 'unsubmitted_reports_20240115.csv',
    contentType: 'text/csv',
    headers: ['エンジニア名', '部署', '未提出週', '経過日数', 'マネージャー', 'リマインド回数']
  },
  excel: {
    filename: 'unsubmitted_reports_20240115.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sheets: ['未提出者一覧', '統計情報']
  },
  pdf: {
    filename: 'monthly_report_202401.pdf',
    contentType: 'application/pdf',
    title: '月次レポート 2024年1月'
  }
};

export const reminderMessages = {
  default: '週報の提出をお願いします。',
  urgent: '【重要】週報が未提出です。至急提出をお願いします。',
  escalation: '週報が2週間以上未提出となっています。マネージャーに報告されます。'
};