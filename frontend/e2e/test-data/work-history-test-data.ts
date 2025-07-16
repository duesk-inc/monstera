/**
 * 職務経歴テスト用データ
 */

export const workHistoryTestData = {
  // 基本的な職務経歴データ
  basicWorkHistory: {
    projectName: 'ECサイトリニューアルプロジェクト',
    startDate: '2023-04-01',
    endDate: '2023-12-31',
    industry: '小売・EC',
    companyName: '株式会社テストEC',
    teamSize: 8,
    role: 'フルスタックエンジニア',
    projectOverview: '既存ECサイトの全面リニューアル。パフォーマンス改善とUX向上を目的とした再構築。',
    responsibilities: 'フロントエンド開発、バックエンドAPI設計、インフラ構築',
    achievements: 'ページ読み込み速度を50%改善、コンバージョン率20%向上',
    processes: ['アジャイル', 'スクラム', 'CI/CD'],
    technologies: [
      { category: 'フロントエンド', technology: 'React' },
      { category: 'フロントエンド', technology: 'TypeScript' },
      { category: 'バックエンド', technology: 'Node.js' },
      { category: 'データベース', technology: 'PostgreSQL' },
      { category: 'インフラ', technology: 'AWS' }
    ]
  },

  // 進行中のプロジェクト
  ongoingProject: {
    projectName: '社内業務管理システム開発',
    startDate: '2024-01-15',
    endDate: '', // 進行中
    industry: 'IT・ソフトウェア',
    companyName: '自社開発',
    teamSize: 5,
    role: 'テックリード',
    projectOverview: '社内の各種業務を統合管理するシステムの新規開発',
    responsibilities: '技術選定、アーキテクチャ設計、コードレビュー、メンバー指導',
    achievements: '開発効率30%向上、バグ発生率を前プロジェクトより60%削減',
    processes: ['アジャイル', 'ペアプログラミング', 'TDD'],
    technologies: [
      { category: 'フロントエンド', technology: 'Next.js' },
      { category: 'フロントエンド', technology: 'Material-UI' },
      { category: 'バックエンド', technology: 'Go' },
      { category: 'データベース', technology: 'MySQL' },
      { category: 'その他', technology: 'Docker' }
    ]
  },

  // 短期プロジェクト
  shortTermProject: {
    projectName: 'APIゲートウェイ構築',
    startDate: '2023-10-01',
    endDate: '2023-11-30',
    industry: 'IT・ソフトウェア',
    companyName: '',
    teamSize: 3,
    role: 'バックエンドエンジニア',
    projectOverview: 'マイクロサービス間の通信を管理するAPIゲートウェイの構築',
    responsibilities: 'API設計、認証・認可機能実装、ロードバランシング設定',
    achievements: 'レスポンスタイム20%改善、99.9%の可用性達成',
    processes: ['ウォーターフォール'],
    technologies: [
      { category: 'バックエンド', technology: 'Node.js' },
      { category: 'その他', technology: 'Kong' },
      { category: 'インフラ', technology: 'Kubernetes' }
    ]
  },

  // 大規模プロジェクト
  largeScaleProject: {
    projectName: '金融系基幹システム移行',
    startDate: '2022-04-01',
    endDate: '2023-03-31',
    industry: '金融・保険',
    companyName: 'テスト銀行株式会社',
    teamSize: 50,
    role: 'システムアーキテクト',
    projectOverview: 'レガシーシステムからクラウドネイティブなアーキテクチャへの移行',
    responsibilities: 'システム設計、技術検証、移行計画策定、リスク管理',
    achievements: '無停止での移行完了、運用コスト40%削減、処理性能3倍向上',
    processes: ['ウォーターフォール', 'アジャイル'],
    technologies: [
      { category: 'バックエンド', technology: 'Java' },
      { category: 'バックエンド', technology: 'Spring Boot' },
      { category: 'データベース', technology: 'Oracle' },
      { category: 'インフラ', technology: 'AWS' },
      { category: 'その他', technology: 'Terraform' }
    ]
  },

  // バリデーションエラーテスト用データ
  invalidData: {
    emptyProjectName: {
      projectName: '',
      startDate: '2023-01-01',
      industry: 'IT・ソフトウェア',
      role: 'エンジニア'
    },
    invalidDateRange: {
      projectName: '無効な日付範囲プロジェクト',
      startDate: '2023-12-31',
      endDate: '2023-01-01', // 開始日より前
      industry: 'IT・ソフトウェア',
      role: 'エンジニア'
    },
    tooLongProjectName: {
      projectName: 'あ'.repeat(256), // 255文字を超える
      startDate: '2023-01-01',
      industry: 'IT・ソフトウェア',
      role: 'エンジニア'
    },
    invalidTeamSize: {
      projectName: '無効なチームサイズ',
      startDate: '2023-01-01',
      industry: 'IT・ソフトウェア',
      role: 'エンジニア',
      teamSize: 1001 // 1000を超える
    }
  },

  // 検索フィルター用データ
  searchFilterData: {
    byIndustry: {
      industry: '金融・保険'
    },
    byTechnology: {
      technology: 'React'
    },
    byDateRange: {
      startDateFrom: '2023-01-01',
      startDateTo: '2023-12-31'
    },
    byActiveStatus: {
      isActive: true
    }
  },

  // 一時保存テスト用データ
  tempSaveData: {
    projectName: '一時保存テストプロジェクト',
    startDate: '2024-01-01',
    industry: 'IT・ソフトウェア',
    role: 'エンジニア',
    // 他の必須項目は入力済み、詳細項目は未入力
  },

  // PDF出力確認用データ
  pdfExportData: {
    multipleProjects: [
      {
        projectName: 'プロジェクトA',
        startDate: '2023-01-01',
        endDate: '2023-06-30',
        industry: 'IT・ソフトウェア',
        role: 'エンジニア'
      },
      {
        projectName: 'プロジェクトB',
        startDate: '2023-07-01',
        endDate: '2023-12-31',
        industry: '製造業',
        role: 'リードエンジニア'
      }
    ]
  },

  // 統計情報確認用データ
  statisticsData: {
    expectedStats: {
      totalProjects: 3,
      totalMonths: 24,
      itExperienceYears: '2年0ヶ月',
      primaryIndustry: 'IT・ソフトウェア'
    }
  }
};

// 技術カテゴリマスタ
export const technologyCategories = [
  'フロントエンド',
  'バックエンド',
  'データベース',
  'インフラ',
  'モバイル',
  'その他'
];

// 業界マスタ
export const industries = [
  'IT・ソフトウェア',
  '金融・保険',
  '製造業',
  '小売・EC',
  '医療・ヘルスケア',
  '教育',
  'その他'
];

// 開発プロセスマスタ
export const developmentProcesses = [
  'ウォーターフォール',
  'アジャイル',
  'スクラム',
  'カンバン',
  'XP',
  'DevOps',
  'CI/CD',
  'TDD',
  'ペアプログラミング'
];