'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  SelectChangeEvent,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Work as WorkIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { DebugLogger } from '@/lib/debug/logger';

// 共通コンポーネントをインポート
import { CommonTabPanel } from '@/components/common';
import { 
  PageContainer, 
  PageHeader, 
  FilterBar,
  EmptyState,
} from '@/components/common/layout';

// 新しく作成したコンポーネントをインポート
import ProjectList from '@/components/features/project/ProjectList';
import ProjectDetailDialog from '@/components/features/project/ProjectDetailDialog';

// プロジェクト項目の型定義
interface ProjectItem {
  id: string | number;
  name: string;
  category: string;
  startDate: Date;
  endDate: Date;
  expectedDailyRate: string;
  company: string;
  location: string;
  status: string;
  applicationDeadline?: Date;
  interviewCount?: number;
  nearestStation?: string;
  isFullRemote?: boolean;
  workingHours?: string;
  skillRequirements?: string;
  details?: string;
  dress?: string;
  notes?: string;
}

// モックデータ管理
const MOCK_PROJECTS: ProjectItem[] = [
  {
    id: 1,
    name: 'ECサイトフロントエンド開発',
    category: 'React',
    company: '株式会社テクノロジー',
    location: '東京都渋谷区',
    nearestStation: '渋谷駅',
    isFullRemote: true,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-07-31'),
    expectedDailyRate: '60,000円',
    interviewCount: 2,
    applicationDeadline: new Date('2024-01-20'),
    status: 'active',
    workingHours: '9:00 - 18:00',
    skillRequirements: 'React, TypeScript, Next.js, Redux',
    details: 'ECサイトのフロントエンド開発を担当していただきます。ユーザー体験を重視した設計と実装をお願いします。',
    dress: 'カジュアル',
    notes: 'リモートワーク中心ですが、月1〜2回の出社があります。'
  },
  {
    id: 2,
    status: 'open',
    name: '金融系基幹システムリプレイス案件',
    category: 'システム開発',
    startDate: new Date('2023-12-01'),
    endDate: new Date('2024-06-30'),
    applicationDeadline: new Date('2023-11-15'),
    expectedDailyRate: '70,000円〜90,000円',
    interviewCount: 2,
    company: '株式会社フィナンシャルテクノロジー',
    location: '東京都千代田区',
    nearestStation: '東京駅',
    isFullRemote: false,
    workingHours: '9:30〜18:30（休憩1時間）',
    skillRequirements: 'Java, Spring Boot, Oracle, AWS, 金融系業務経験',
    details: '大手銀行の基幹システムリプレイスプロジェクトです。要件定義から設計、実装、テストまで幅広く担当していただきます。',
    dress: 'ビジネスカジュアル',
    notes: '週2回のオンサイト勤務必須。リモートワーク環境の準備が必要です。',
  },
  {
    id: 3,
    status: 'open',
    name: 'クラウドインフラ構築・運用',
    category: 'インフラ構築',
    startDate: new Date('2023-12-15'),
    endDate: new Date('2024-12-14'),
    applicationDeadline: new Date('2023-11-30'),
    expectedDailyRate: '65,000円〜85,000円',
    interviewCount: 2,
    company: '株式会社クラウドテクノロジーズ',
    location: '東京都港区',
    nearestStation: '品川駅',
    isFullRemote: false,
    workingHours: '9:00〜18:00（休憩1時間）',
    skillRequirements: 'AWS, Terraform, Docker, Kubernetes, CI/CD',
    details: 'AWSを中心としたクラウドインフラの設計・構築・運用を担当していただきます。Terraformを用いたIaCの実践やKubernetesによるコンテナ環境の構築経験が活かせます。',
    dress: 'ビジネスカジュアル',
    notes: '週3回のオンサイト勤務。AWS認定資格保持者歓迎。',
  },
  {
    id: 4,
    status: 'closed',
    name: 'AI画像認識システム開発',
    category: 'AI/機械学習',
    startDate: new Date('2023-11-01'),
    endDate: new Date('2024-04-30'),
    applicationDeadline: new Date('2023-10-20'),
    expectedDailyRate: '75,000円〜95,000円',
    interviewCount: 3,
    company: '株式会社AIイノベーション',
    location: '東京都文京区',
    nearestStation: '後楽園駅',
    isFullRemote: true,
    workingHours: '9:30〜18:30（休憩1時間）',
    skillRequirements: 'Python, TensorFlow, PyTorch, OpenCV, 画像処理',
    details: '画像認識技術を活用した新規サービス開発プロジェクトです。AIモデルの設計から実装、評価までを担当していただきます。',
    dress: 'カジュアル',
    notes: 'フルリモート可。GPU搭載PCの貸与あり。',
  },
];

// 案件カテゴリーの選択肢
const PROJECT_CATEGORIES = [
  '全て',
  'システム開発',
  'インフラ構築',
  'アプリ開発',
  'AI/機械学習',
  'デザイン',
  'コンサルティング',
];

export default function ProjectPage() {
  const router = useRouter();
  
  
  // タブ状態管理
  const [tabIndex, setTabIndex] = useState(0);
  
  // 詳細ダイアログの状態
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // フィルター状態
  const [categoryFilter, setCategoryFilter] = useState('全て');
  const [searchQuery, setSearchQuery] = useState('');
  
  // ローディング状態（実際のアプリではAPIリクエスト状態から）
  const [isLoading] = useState(false);
  
  // タブ切り替え処理
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };
  
  // 詳細ダイアログを開く
  const handleOpenDialog = (project: ProjectItem) => {
    setSelectedProject(project);
    setDialogOpen(true);
  };
  
  // 詳細ダイアログを閉じる
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  // カテゴリーフィルター変更
  const handleCategoryChange = (event: SelectChangeEvent<string | number>) => {
    setCategoryFilter(event.target.value as string);
  };
  
  // 検索クエリ変更
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  // フィルタリングされた案件リスト
  const filteredProjects = MOCK_PROJECTS.filter(project => {
    // 検索クエリによるフィルタリング
    if (searchQuery && !project.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !project.company.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(project.skillRequirements || '').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // カテゴリーによるフィルタリング
    if (categoryFilter !== '全て' && project.category !== categoryFilter) {
      return false;
    }
    
    // ステータスによるフィルタリング（タブ）
    if (tabIndex === 0 && project.status !== 'open') {
      return false;
    } else if (tabIndex === 1 && project.status !== 'closed') {
      return false;
    }
    
    return true;
  });

  return (
    <PageContainer maxWidth="lg">

      <PageHeader
        title="案件情報"
        subtitle="参画可能な案件情報を一覧で確認できます。詳細を確認するには案件をクリックしてください。"
      />

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 'auto' }}>
          <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
        </Box>

        <FilterBar
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="検索..."
          filterValue={categoryFilter}
          onFilterChange={handleCategoryChange}
          filterOptions={PROJECT_CATEGORIES.map(category => ({ value: category, label: category }))}
          onRefresh={() => {
            setCategoryFilter('全て');
            setSearchQuery('');
          }}
        />
      </Box>

      {/* タブ切り替え */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          aria-label="project tabs"
          variant="fullWidth"
        >
          <Tab label="募集中の案件" />
          <Tab label="過去の案件" />
          <Tab label="参画履歴" />
        </Tabs>
      </Box>

      {/* 検索可能案件タブ */}
      <CommonTabPanel value={tabIndex} index={0} prefix="project" padding={2}>
        <Box sx={{ mb: 3 }}>
          <ProjectList
            projects={filteredProjects}
            isLoading={isLoading}
            onCardClick={handleOpenDialog}
            onDetailClick={(projectId) => router.push(`/project/detail?id=${projectId}`)}
          />
        </Box>
      </CommonTabPanel>
      
      {/* 過去の案件タブ */}
      <CommonTabPanel value={tabIndex} index={1} prefix="project" padding={2}>
        <Box sx={{ mb: 3 }}>
          {isLoading ? (
            <ProjectList
              projects={[]}
              isLoading={true}
              onCardClick={handleOpenDialog}
              onDetailClick={(projectId) => router.push(`/project/detail?id=${projectId}`)}
            />
          ) : MOCK_PROJECTS.filter(p => p.status === 'closed').length > 0 ? (
            <Stack spacing={2}>
              {MOCK_PROJECTS.filter(p => p.status === 'closed').map((project) => (
                <Card
                  key={project.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    opacity: 0.7,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      opacity: 1,
                      boxShadow: 2,
                    },
                  }}
                  onClick={() => handleOpenDialog(project)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {project.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <Chip label={project.category} size="small" />
                          <Typography variant="body2" color="text.secondary">
                            {project.company}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          開始予定: {format(project.startDate, 'yyyy/MM/dd')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          想定単価: {project.expectedDailyRate}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <EmptyState
              type="empty"
              message="募集終了した案件はありません"
              description="現在、募集終了した案件はありません。"
            />
          )}
        </Box>
      </CommonTabPanel>
      
      {/* 参画予定案件タブ */}
      <CommonTabPanel value={tabIndex} index={2} prefix="project" padding={2}>
        <EmptyState
          type="empty"
          message="参画履歴はありません"
          description="まだ参画した案件はありません。"
        />
      </CommonTabPanel>

      {/* 案件詳細ダイアログ */}
      <ProjectDetailDialog
        open={dialogOpen}
        project={selectedProject}
        onClose={handleCloseDialog}
        onApply={(projectId) => {
          DebugLogger.info({
            category: 'プロジェクト',
            operation: '応募'
          }, `案件ID: ${projectId}に応募`);
        }}
      />
    </PageContainer>
  );
} 