'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  CircularProgress,
  Breadcrumbs,
  Link as MuiLink,
  Alert,
  IconButton,
  Backdrop,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Computer as RemoteIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  Money as MoneyIcon,
  ArrowBack as ArrowBackIcon,
  Videocam as VideoIcon,
  Backpack as BackpackIcon,
  WbIncandescent as SkillIcon,
  Checkroom as ClothesIcon,
  Info as InfoIcon,
  AppRegistration as ApplyIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import { DebugLogger } from '@/lib/debug/logger';
import ActionButton from '@/components/common/ActionButton';
import { 
  PageContainer, 
  PageHeader, 
  ContentCard,
  DetailInfoGrid,
} from '@/components/common/layout';

// 仮の案件データ - 実際のアプリケーションではAPIから取得
const MOCK_PROJECTS = [
  {
    id: 1,
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
    details: '大手銀行の基幹システムリプレイスプロジェクトです。要件定義から設計、実装、テストまで幅広く担当していただきます。\n\nJavaを用いたバックエンド開発経験が必須です。金融系の業務知識がある方は優遇いたします。チームは10名程度で、アジャイル開発手法を採用しています。\n\n週2回程度のオンサイト作業が必要ですが、その他の日はリモートワークも可能です。',
    dress: 'ビジネスカジュアル',
    notes: '週2回のオンサイト勤務必須。リモートワーク環境の準備が必要です。\n\n守秘義務契約を締結いただきます。金融機関のプロジェクトのため、セキュリティ面での制約があります。',
    status: 'open',
    requiredSkills: ['Java', 'Spring Boot', 'Oracle', 'AWS'],
    preferredSkills: ['金融系業務経験', 'アジャイル開発経験', 'マイクロサービス設計'],
    teamSize: '10名程度',
    projectType: '新規開発・リプレイス',
  },
  {
    id: 2,
    name: 'ECサイトフロントエンド開発',
    category: 'アプリ開発',
    startDate: new Date('2023-11-15'),
    endDate: new Date('2024-03-31'),
    applicationDeadline: new Date('2023-10-31'),
    expectedDailyRate: '60,000円〜80,000円',
    interviewCount: 1,
    company: '株式会社デジタルショッピング',
    location: '東京都渋谷区',
    nearestStation: '渋谷駅',
    isFullRemote: true,
    workingHours: '10:00〜19:00（休憩1時間）',
    skillRequirements: 'React, TypeScript, Next.js, CSS/SCSS, レスポンシブデザイン',
    details: '大手ECサイトのフロントエンド開発を担当していただきます。React, Next.jsを用いた新機能の実装や既存機能の改善をお願いします。\n\n特にモバイル対応のUI/UX改善が主な業務となります。デザイナーと協力して、ユーザー体験の向上を目指します。\n\nフルリモートでの勤務が可能ですが、週1回程度のオンラインミーティングに参加していただきます。',
    dress: 'カジュアル',
    notes: 'フルリモートワーク可能。週1回のオンラインMTGあり。\n\nGitHubを用いたバージョン管理、Figmaを用いたデザイン共有を行っています。',
    status: 'open',
    requiredSkills: ['React', 'TypeScript', 'Next.js', 'CSS/SCSS'],
    preferredSkills: ['GraphQL', 'Storybook', 'Figma', 'パフォーマンス最適化経験'],
    teamSize: '5名程度',
    projectType: '既存システム改修・機能追加',
  },
  {
    id: 3,
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
    details: 'AWSを中心としたクラウドインフラの設計・構築・運用を担当していただきます。Terraformを用いたIaCの実践やKubernetesによるコンテナ環境の構築経験が活かせます。\n\n複数のプロジェクトに横断的に関わるため、多様な技術要素に触れることができます。\n\nインフラの自動化、監視体制の構築、セキュリティ強化など、幅広い業務に携わっていただきます。',
    dress: 'ビジネスカジュアル',
    notes: '週3回のオンサイト勤務。AWS認定資格保持者歓迎。\n\nAWS認定資格をお持ちの方は優遇いたします。プロジェクト参画後も、必要に応じて資格取得支援を行います。',
    status: 'open',
    requiredSkills: ['AWS', 'Terraform', 'Docker', 'Kubernetes'],
    preferredSkills: ['AWS認定資格', 'CI/CD経験', 'セキュリティ知識', '監視ツール経験'],
    teamSize: '8名程度',
    projectType: 'インフラ構築・運用',
  },
];

// ローディング用コンポーネント
function ProjectDetailLoading() {
  return (
    <PageContainer maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    </PageContainer>
  );
}

// ProjectDetailContentコンポーネントを分離
function ProjectDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  
  // URLパラメータからIDを取得
  const projectId = searchParams.get('id');
  
  // 状態管理
  const [project, setProject] = useState<typeof MOCK_PROJECTS[0] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [remainingDays, setRemainingDays] = useState<number | null>(null);
  const [formattedPeriod, setFormattedPeriod] = useState<string | null>(null);
  
  // プロジェクトデータの取得（実際のアプリケーションではAPIから取得）
  useEffect(() => {
    // データ取得のシミュレーション
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // 意図的に少し遅延を加えてローディング状態を表示
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (!projectId) {
          throw new Error('案件IDが指定されていません');
        }
        
        const foundProject = MOCK_PROJECTS.find(p => p.id === Number(projectId));
        
        if (!foundProject) {
          throw new Error('指定された案件が見つかりませんでした');
        }
        
        setProject(foundProject);
        setError(null);
      } catch (err) {
        DebugLogger.apiError({
          category: 'プロジェクト',
          operation: '詳細取得'
        }, {
          error: err
        });
        setError(err instanceof Error ? err.message : '案件データの取得中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [projectId]);
  
  // 日付関連の処理をクライアントサイドのみで実行
  useEffect(() => {
    if (project) {
      // 案件期間のフォーマット
      const formatProjectPeriod = (startDate: Date, endDate: Date) => {
        return `${format(startDate, 'yyyy/MM/dd', { locale: ja })} 〜 ${format(endDate, 'yyyy/MM/dd', { locale: ja })}`;
      };

      // 残り日数の計算
      const calculateRemainingDays = (deadline: Date) => {
        const today = new Date();
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
      };
      
      setFormattedPeriod(formatProjectPeriod(project.startDate, project.endDate));
      setRemainingDays(calculateRemainingDays(project.applicationDeadline));
    }
  }, [project]);
  
  // ブックマーク切り替え
  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    // 実際のアプリケーションではAPIを呼び出してブックマーク状態を保存
  };
  
  // 応募処理
  const handleApply = () => {
    DebugLogger.info({
      category: 'プロジェクト',
      operation: '応募'
    }, `案件ID: ${projectId}に応募`);
    // 実際のアプリケーションでは応募フォームへ遷移またはAPIを呼び出す
    router.push(`/project/apply?id=${projectId}`);
  };
  
  // 共有処理
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: project?.name,
        text: `${project?.company}の案件: ${project?.name}`,
        url: window.location.href,
      })
      .catch(err => {
        DebugLogger.apiError({
          category: 'プロジェクト',
          operation: '共有'
        }, {
          error: err
        });
      });
    } else {
      // Web Share APIがサポートされていない場合
      DebugLogger.info({
        category: 'プロジェクト',
        operation: '共有'
      }, '共有機能がサポートされていません');
      // URLをクリップボードにコピー
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          alert('URLがクリップボードにコピーされました');
        })
        .catch(err => {
          DebugLogger.apiError({
            category: 'プロジェクト',
            operation: 'クリップボードコピー'
          }, {
            error: err
          });
        });
    }
  };

  // ローディング表示
  if (isLoading) {
    return (
      <PageContainer maxWidth="lg">
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }
  
  // エラー表示
  if (error) {
    return (
      <PageContainer maxWidth="lg">
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <ActionButton
            component={Link}
            href="/project"
            buttonType="ghost"
            startIcon={<ArrowBackIcon />}
          >
            案件一覧に戻る
          </ActionButton>
        </Paper>
      </PageContainer>
    );
  }
  
  // 案件が見つからない場合
  if (!project) {
    return (
      <PageContainer maxWidth="lg">
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            案件情報が見つかりませんでした
          </Alert>
          <ActionButton
            component={Link}
            href="/project"
            buttonType="ghost"
            startIcon={<ArrowBackIcon />}
          >
            案件一覧に戻る
          </ActionButton>
        </Paper>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="lg">

      {/* パンくずナビゲーション */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <MuiLink component={Link} href="/" color="inherit">
          ホーム
        </MuiLink>
        <MuiLink component={Link} href="/project" color="inherit">
          案件情報
        </MuiLink>
        <Typography color="text.primary">案件詳細</Typography>
      </Breadcrumbs>

      <PageHeader
        title={project.name}
        subtitle={`${project.company} | ${project.category}`}
        breadcrumbs={
          <Breadcrumbs aria-label="breadcrumb">
            <MuiLink component={Link} href="/" color="inherit">
              ホーム
            </MuiLink>
            <MuiLink component={Link} href="/project" color="inherit">
              案件情報
            </MuiLink>
            <Typography color="text.primary">案件詳細</Typography>
          </Breadcrumbs>
        }
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={toggleBookmark} 
              color="primary"
              aria-label={isBookmarked ? "ブックマークを解除" : "ブックマークに追加"}
            >
              {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
            
            <IconButton 
              onClick={handleShare} 
              color="primary"
              aria-label="共有する"
            >
              <ShareIcon />
            </IconButton>
            
            <ActionButton
              component={Link}
              href="/project"
              buttonType="ghost"
              startIcon={<ArrowBackIcon />}
            >
              一覧に戻る
            </ActionButton>
          </Box>
        }
      />
      
      <ContentCard variant="elevated">
        {/* カテゴリチップ */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={project.category}
            color="primary"
            size="small"
          />
        </Box>
        
        {/* 応募情報バナー */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 3, 
            bgcolor: 'primary.main', 
            color: 'primary.contrastText',
            borderRadius: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2
          }}
        >
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              想定単価: {project.expectedDailyRate}
            </Typography>
            <Typography variant="body1">
              応募期限: {format(project.applicationDeadline, 'yyyy/MM/dd', { locale: ja })}
              {remainingDays !== null && `（残り${remainingDays}日）`}
            </Typography>
          </Box>
          
          <ActionButton 
            buttonType="primary"
            size="large"
            startIcon={<ApplyIcon />}
            onClick={handleApply}
            sx={{ 
              fontWeight: 'bold', 
              px: 4,
              bgcolor: 'white',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.9)',
              }
            }}
          >
            応募する
          </ActionButton>
        </Paper>
        
        {/* メインコンテンツ */}
        <DetailInfoGrid
          items={[
            // 基本情報セクション
            { 
              label: "会社名", 
              value: project.company,
              icon: <BusinessIcon fontSize="small" />,
              gridSize: { xs: 12, md: 6 }
            },
            { 
              label: "勤務地", 
              value: (
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                    {project.location} ({project.nearestStation})
                  </Box>
                  {project.isFullRemote && (
                    <Chip 
                      label="フルリモート可" 
                      size="small" 
                      color="success" 
                    />
                  )}
                </Box>
              ),
              gridSize: { xs: 12, md: 6 }
            },
            { 
              label: "リモートワーク", 
              value: (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <RemoteIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  {project.isFullRemote ? 'フルリモート' : '一部リモート可'}
                </Box>
              ),
              gridSize: { xs: 12, md: 6 }
            },
            { 
              label: "就業時間", 
              value: (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TimeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  {project.workingHours}
                </Box>
              ),
              gridSize: { xs: 12, md: 6 }
            },
            { 
              label: "服装", 
              value: (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ClothesIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  {project.dress}
                </Box>
              ),
              gridSize: { xs: 12, md: 6 }
            },
            { 
              label: "チーム規模", 
              value: project.teamSize,
              gridSize: { xs: 12, md: 6 }
            },
            
            // 期間・面談情報セクション
            { 
              label: "案件期間", 
              value: formattedPeriod || '読み込み中...',
              icon: <CalendarIcon fontSize="small" />,
              gridSize: { xs: 12, md: 6 }
            },
            { 
              label: "応募期限", 
              value: (
                <Typography variant="body2" color="error.main" fontWeight="bold">
                  {format(project.applicationDeadline, 'yyyy/MM/dd', { locale: ja })}
                  {remainingDays !== null && `（残り${remainingDays}日）`}
                </Typography>
              ),
              gridSize: { xs: 12, md: 6 }
            },
            { 
              label: "面談回数", 
              value: (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <VideoIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  {project.interviewCount}回
                </Box>
              ),
              gridSize: { xs: 12, md: 6 }
            },
            { 
              label: "想定単価", 
              value: (
                <Box sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                  <MoneyIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  {project.expectedDailyRate}
                </Box>
              ),
              gridSize: { xs: 12, md: 6 }
            },
            
            // スキル情報セクション
            { 
              label: "必須スキル", 
              value: (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {project.requiredSkills.map((skill, index) => (
                    <Chip
                      key={index}
                      label={skill}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              ),
              icon: <SkillIcon fontSize="small" />,
              gridSize: { xs: 12 }
            },
            { 
              label: "歓迎スキル", 
              value: (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {project.preferredSkills.map((skill, index) => (
                    <Chip
                      key={index}
                      label={skill}
                      color="secondary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              ),
              gridSize: { xs: 12 }
            },
            
            // 案件詳細セクション
            { 
              label: "詳細説明", 
              value: (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {project.details}
                </Typography>
              ),
              icon: <BackpackIcon fontSize="small" />,
              gridSize: { xs: 12 }
            },
            
            // 注意事項セクション
            { 
              label: "注意事項", 
              value: (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {project.notes}
                </Typography>
              ),
              icon: <InfoIcon fontSize="small" />,
              gridSize: { xs: 12 }
            },
          ]}
          spacing={3}
        />
        
        <Divider sx={{ my: 4 }} />
        
        {/* アクションボタン */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <ActionButton
            component={Link}
            href="/project"
            buttonType="secondary"
            startIcon={<ArrowBackIcon />}
          >
            案件一覧に戻る
          </ActionButton>
          
          <ActionButton
            buttonType="primary"
            size="large"
            startIcon={<ApplyIcon />}
            onClick={handleApply}
          >
            この案件に応募する
          </ActionButton>
        </Box>
      </ContentCard>
    </PageContainer>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<ProjectDetailLoading />}>
      <ProjectDetailContent />
    </Suspense>
  );
} 