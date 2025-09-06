'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Tabs,
  Tab,
  Button,
  TextField,
} from '@mui/material';
import {
  Work as WorkIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { DebugLogger } from '@/lib/debug/logger';
import { listProjects, type ProjectItemDto } from '@/lib/api/projects';
import { handleApiError } from '@/lib/api/error';

// 共通コンポーネントをインポート
import { CommonTabPanel } from '@/components/common';
import { 
  PageContainer, 
  PageHeader, 
  FilterBar,
  EmptyState,
} from '@/components/common/layout';
import { useToast } from '@/components/common';

// 新しく作成したコンポーネントをインポート
import ProjectList from '@/components/features/project/ProjectList';
import ProjectDetailDialog from '@/components/features/project/ProjectDetailDialog';
import EngineerGuard from '@/components/common/EngineerGuard';

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
  status: string; // 'active' | 'archived' | 'draft'
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

// API DTO -> UIアイテム変換
const mapDtoToItem = (p: ProjectItemDto): ProjectItem => ({
  id: p.id,
  name: p.project_name,
  category: 'その他',
  startDate: p.start_date ? new Date(p.start_date) : new Date(),
  endDate: p.end_date ? new Date(p.end_date) : new Date(),
  expectedDailyRate: '',
  company: p.client_name || '',
  location: '',
  status: p.status,
  applicationDeadline: undefined,
});

export default function ProjectPage() {
  const router = useRouter();
  const { showError } = useToast();
  
  
  // タブ状態管理
  const [tabIndex, setTabIndex] = useState(0);
  
  // 詳細ダイアログの状態
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // ローディング/API状態
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'created_at' | 'project_name' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // タブ切り替え処理
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    setPage(1);
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
  
  // 検索クエリ変更
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(1);
  };

  // 検索デバウンス
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchQuery]);

  
  // フィルタリングされた案件リスト
  // 初回ロード & ページ変更時に取得
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      try {
        setIsLoading(true);
        const statusParam = tabIndex === 0 ? 'active' : (tabIndex === 1 ? 'archived' : undefined);
        const res = await listProjects({ 
          page, 
          limit, 
          q: debouncedSearch || undefined, 
          status: statusParam as any,
          sortBy, 
          sortOrder 
        });
        if (aborted) return;
        setProjects(res.items.map(mapDtoToItem));
        setTotal(res.total);
        setTotalPages(res.total_pages || Math.max(1, Math.ceil(res.total / limit)));
      } catch (e) {
        const err = handleApiError(e, '案件一覧取得', { logContext: 'project/list' });
        const enhanced = (err as any).enhanced;
        const msg = enhanced?.userMessage || err.message || '案件一覧の取得に失敗しました';
        showError(msg);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    };
    run();
    return () => { aborted = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, sortOrder, debouncedSearch, limit, tabIndex]);

  // フィルタリングされた案件リスト
  const filteredProjects = useMemo(() => projects, [projects]);

  return (
    <EngineerGuard>
    <PageContainer maxWidth="lg">

      <PageHeader
        title="案件情報"
        subtitle="参画可能な案件情報を一覧で確認できます。詳細を確認するには案件をクリックしてください。"
      />

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 'auto' }}>
          <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
        </Box>
        <Box>
          <button
            onClick={() => router.push('/project/new')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1976d2',
              color: 'white',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            新規作成
          </button>
        </Box>

        <FilterBar
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="案件名・企業名で検索"
          onRefresh={() => {
            setSearchQuery('');
            setPage(1);
          }}
        />

        {/* Sort controls */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ ml: 2, mt: { xs: 1, sm: 0 } }}>
          <TextField
            select
            label="表示件数"
            size="small"
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            sx={{ minWidth: 120 }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </TextField>
          <TextField
            select
            label="並び替え"
            size="small"
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
            sx={{ minWidth: 160 }}
          >
            <option value="created_at">作成日</option>
            <option value="project_name">案件名</option>
            <option value="status">ステータス</option>
          </TextField>
          <TextField
            select
            label="順序"
            size="small"
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value as any); setPage(1); }}
            sx={{ minWidth: 120 }}
          >
            <option value="desc">降順</option>
            <option value="asc">昇順</option>
          </TextField>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" size="small" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>前へ</Button>
            <Typography variant="body2">{page} / {Math.max(1, totalPages)}</Typography>
            <Button variant="outlined" size="small" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>次へ</Button>
          </Stack>
        </Stack>
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
          ) : projects.filter(p => p.status === 'archived').length > 0 ? (
            <Stack spacing={2}>
              {projects.filter(p => p.status === 'archived').map((project) => (
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
                        {project.startDate && (
                          <Typography variant="body2" color="text.secondary">
                            開始予定: {format(project.startDate, 'yyyy/MM/dd')}
                          </Typography>
                        )}
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
    </EngineerGuard>
  );
}
