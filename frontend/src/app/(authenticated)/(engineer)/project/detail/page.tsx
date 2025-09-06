'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, notFound } from 'next/navigation';
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
import { getProject, type ProjectItemDto } from '@/lib/api/projects';
import { handleApiError } from '@/lib/api/error';
import ActionButton from '@/components/common/ActionButton';
import { 
  PageContainer, 
  PageHeader, 
  ContentCard,
  DetailInfoGrid,
} from '@/components/common/layout';
import EngineerGuard from '@/components/common/EngineerGuard';
import { useToast } from '@/components/common';

// DTO→UI 変換
const mapDto = (p: ProjectItemDto) => ({
  id: p.id,
  name: p.project_name,
  category: 'その他',
  startDate: p.start_date ? new Date(p.start_date) : new Date(),
  endDate: p.end_date ? new Date(p.end_date) : new Date(),
  applicationDeadline: undefined as Date | undefined,
  expectedDailyRate: '',
  interviewCount: 0,
  company: p.client_name || '',
  location: '',
  isFullRemote: false,
  workingHours: '',
  skillRequirements: '',
  details: p.description || '',
  dress: '',
  notes: '',
  status: p.status,
  requiredSkills: [] as string[],
  preferredSkills: [] as string[],
  teamSize: '',
  projectType: '',
});

// ローディング用コンポーネント
function ProjectDetailLoading() {
  return (
    <EngineerGuard>
    <PageContainer maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    </PageContainer>
    </EngineerGuard>
  );
}

// ProjectDetailContentコンポーネントを分離
function ProjectDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError } = useToast();
  
  
  // URLパラメータからIDを取得
  const projectId = searchParams.get('id');
  
  // 状態管理
  const [project, setProject] = useState<ReturnType<typeof mapDto> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [remainingDays, setRemainingDays] = useState<number | null>(null);
  const [formattedPeriod, setFormattedPeriod] = useState<string | null>(null);
  
  // プロジェクトデータの取得（API）
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        if (!projectId) {
          throw new Error('案件IDが指定されていません');
        }
        const data = await getProject(String(projectId));
        setProject(mapDto(data));
        setError(null);
      } catch (err) {
        DebugLogger.apiError({
          category: 'プロジェクト',
          operation: '詳細取得'
        }, {
          error: err
        });
        const handled = handleApiError(err, '案件詳細取得', { logContext: 'project/detail' });
        const enhanced = (handled as any).enhanced;
        const status = (err as any)?.response?.status;
        const code = enhanced?.code || (err as any)?.response?.data?.code;
        if (status === 404 || code === 'not_found' || code === 'NOT_FOUND') {
          // グローバル404へ直送
          notFound();
          return;
        }
        const msg = enhanced?.userMessage || handled.message || '案件データの取得中にエラーが発生しました';
        setError(msg);
        showError(msg);
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
      
      if (project.startDate && project.endDate) {
        setFormattedPeriod(formatProjectPeriod(project.startDate as any, project.endDate as any));
      }
      if (project.applicationDeadline) {
        setRemainingDays(calculateRemainingDays(project.applicationDeadline as any));
      } else {
        setRemainingDays(null);
      }
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
              応募期限: {project.applicationDeadline ? format(project.applicationDeadline as any, 'yyyy/MM/dd', { locale: ja }) : '-'}
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
                    {project.location} ({(project as any).nearestStation || ''})
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
                  {project.applicationDeadline ? format(project.applicationDeadline as any, 'yyyy/MM/dd', { locale: ja }) : '-'}
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
