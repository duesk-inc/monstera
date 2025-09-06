'use client';

import React, { useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Tabs, 
  Tab,
  Alert,
  Skeleton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  SwapHoriz as StatusChangeIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { Breadcrumbs } from '@/components/common';
import { useEngineerDetail } from '@/hooks/admin/useEngineersQuery';
import { BasicInfoTab } from '@/components/admin/engineers/BasicInfoTab';
import { SkillInfoTab } from '@/components/admin/engineers/SkillInfoTab';
import { ProjectHistoryTab } from '@/components/admin/engineers/ProjectHistoryTab';
import { StatusHistoryTab } from '@/components/admin/engineers/StatusHistoryTab';
import { StatusChangeDialog } from '@/components/admin/engineers/StatusChangeDialog';
import { useUpdateEngineerStatus } from '@/hooks/admin/useEngineersQuery';
import { useToast } from '@/components/common/Toast/ToastProvider';
import { EngineerStatus } from '@/types/engineer';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`engineer-tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function EngineerDetail() {
  const params = useParams();
  const router = useRouter();
  const { showSuccess } = useToast();
  const [tabValue, setTabValue] = useState(0);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);

  const engineerId = params.id as string;
  const { engineer, loading, error, refresh } = useEngineerDetail(engineerId);
  const updateStatusMutation = useUpdateEngineerStatus();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEdit = () => {
    router.push(`/admin/engineers/${engineerId}/edit`);
  };

  const handleStatusChange = () => {
    setStatusChangeDialogOpen(true);
  };

  const handleStatusChangeConfirm = async (newStatus: EngineerStatus, reason: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: engineerId, data: { status: newStatus, reason } as any });
      showSuccess('ステータスを変更しました');
      await refresh();
      setStatusChangeDialogOpen(false);
    } catch (error) {
      // エラーはuseUpdateEngineerStatus内で処理される
      console.error('Failed to update status:', error);
    }
  };

  if (error) {
    const status = (error as any)?.response?.status;
    const code = (error as any)?.enhanced?.code || (error as any)?.code;
    if (status === 404 || code === 'not_found' || code === 'NOT_FOUND') {
      notFound();
    }
    return (
      <PageContainer title="エンジニア詳細">
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={refresh}>
            再読み込み
          </Button>
        }>
          データの読み込みに失敗しました。
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title={loading ? 'エンジニア詳細' : engineer ? `${engineer.user.sei} ${engineer.user.mei}` : 'エンジニア詳細'}
      breadcrumbs={
        <Breadcrumbs 
          items={[
            { label: '管理者ダッシュボード', href: '/admin/dashboard' },
            { label: 'エンジニア管理', href: '/admin/engineers' },
            { label: loading ? '読み込み中...' : engineer ? `${engineer.user.sei} ${engineer.user.mei}` : 'エンジニア詳細' },
          ]}
        />
      }
    >
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/engineers')}
        >
          一覧に戻る
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<StatusChangeIcon />}
            onClick={handleStatusChange}
            disabled={loading}
          >
            ステータス変更
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            disabled={loading}
          >
            編集
          </Button>
        </Box>
      </Box>

      {loading ? (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Skeleton variant="rectangular" height={200} />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Skeleton variant="rectangular" height={400} />
            </CardContent>
          </Card>
        </>
      ) : engineer ? (
        <>
          <Card>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="基本情報" />
              <Tab label={`スキル (${engineer.skills.length})`} />
              <Tab label={`プロジェクト履歴 (${engineer.projectHistory.length})`} />
              <Tab label={`ステータス履歴 (${engineer.statusHistory.length})`} />
            </Tabs>

            <CardContent>
              {/* 基本情報 */}
              <TabPanel value={tabValue} index={0}>
                <BasicInfoTab engineer={engineer.user} />
              </TabPanel>

              {/* スキル一覧 */}
              <TabPanel value={tabValue} index={1}>
                <SkillInfoTab engineer={engineer} />
              </TabPanel>

              {/* プロジェクト履歴 */}
              <TabPanel value={tabValue} index={2}>
                <ProjectHistoryTab engineerId={engineerId} projectHistory={engineer.projectHistory as any} />
              </TabPanel>

              {/* ステータス履歴 */}
              <TabPanel value={tabValue} index={3}>
                <StatusHistoryTab engineer={engineer} />
              </TabPanel>
            </CardContent>
          </Card>

          {/* ステータス変更ダイアログ */}
          {engineer && (
            <StatusChangeDialog
              open={statusChangeDialogOpen}
              currentStatus={engineer.user.engineerStatus}
              engineerName={`${engineer.user.sei} ${engineer.user.mei}`}
              onClose={() => setStatusChangeDialogOpen(false)}
              onConfirm={handleStatusChangeConfirm}
              isSubmitting={updateStatusMutation.isPending}
            />
          )}
        </>
      ) : (
        // engineerが存在しない場合も404扱い
        (notFound(), null)
      )}
    </PageContainer>
  );
}
