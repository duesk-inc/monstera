'use client';

import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, Chip } from '@mui/material';
import { Sync, Settings, CloudDownload, Info } from '@mui/icons-material';

import { SalesLayout } from '@/components/features/sales/layout/SalesLayout';
import { PocProjectTable } from '@/components/features/sales/poc/PocProjectTable';
import { PocSyncDialog } from '@/components/features/sales/poc/PocSyncDialog';
import { SPACING } from '@/constants/dimensions';
import { useToast } from '@/components/common/Toast';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { pocProjectApi } from '@/lib/api/sales';
import type { PocProject } from '@/types/sales';

/**
 * POC同期管理ページ
 */
export default function PocPage() {
  const [projects, setProjects] = useState<PocProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<PocProject | null>(null);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const { showSuccess, showError } = useToast();
  const { handleSubmissionError } = useErrorHandler();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      // APIに一覧取得は無いため、未同期プロジェクトの取得で代替
      const list = await pocProjectApi.getUnsynced();
      setProjects(list || []);
    } catch (error) {
      handleSubmissionError(error, 'POCプロジェクト一覧取得');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async (projectId?: string) => {
    try {
      setIsSyncing(true);
      setSyncResult(null);
      
      if (projectId) {
        await pocProjectApi.syncProject(projectId);
        showSuccess('プロジェクト同期を開始しました');
      } else {
        await pocProjectApi.syncAll();
        showSuccess('全体同期を開始しました');
      }
      // 結果の詳細は未対応のため即時再読込
      setSyncResult(null);
      loadProjects();
    } catch (error) {
      handleSubmissionError(error, 'POC同期実行');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleProjectSync = (project: PocProject) => {
    setSelectedProject(project);
    setShowSyncDialog(true);
  };

  const handleForceSync = () => {
    setSelectedProject(null);
    setShowSyncDialog(true);
  };

  const handleEdit = (project: PocProject) => {
    // プロジェクト編集ダイアログを開く
    console.log('Edit project:', project.id);
  };

  const handleDelete = async (project: PocProject) => {
    if (!confirm('このPOCプロジェクトを削除してもよろしいですか？\n※元のPOCデータは削除されません。')) {
      return;
    }

    try {
      // 削除APIは未実装のため未対応
      showError('削除機能は現在未対応です');
      loadProjects();
    } catch (error) {
      handleSubmissionError(error, 'POCプロジェクト削除');
    }
  };

  const handleViewOriginal = (project: PocProject) => {
    // 元のPOCプロジェクトを新しいタブで開く
    if (project.pocProjectId) {
      window.open(`${process.env.NEXT_PUBLIC_POC_URL}/projects/${project.pocProjectId}`, '_blank');
    }
  };

  const handleRetry = async (projectId: string) => {
    await handleSync(projectId);
  };

  const handleAllForceSync = async () => {
    try {
      setIsSyncing(true);
      const result = await pocProjectApi.forceSync();
      setSyncResult(result);
      showSuccess('強制同期を実行しました');
      loadProjects();
    } catch (error) {
      handleSubmissionError(error, '強制同期実行');
    } finally {
      setIsSyncing(false);
    }
  };

  // 統計情報の計算
  const totalProjects = projects.length;
  const syncedProjects = projects.filter(p => p.syncStatus === 'success').length;
  const failedProjects = projects.filter(p => p.syncStatus === 'error').length;
  const conflictProjects = 0;
  const neverSyncedProjects = projects.filter(p => p.syncStatus === 'idle').length;

  const lastSyncTime = projects.reduce((latest, project) => {
    if (!project.lastSyncAt) return latest;
    const syncDate = new Date(project.lastSyncAt);
    return !latest || syncDate > latest ? syncDate : latest;
  }, null as Date | null);

  return (
    <SalesLayout
      title="POC同期管理"
      actions={
        <Box sx={{ display: 'flex', gap: SPACING.SM }}>
          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={handleAllForceSync}
            disabled={isSyncing}
          >
            強制同期
          </Button>
          <Button
            variant="contained"
            startIcon={<Sync />}
            onClick={handleForceSync}
            disabled={isSyncing}
          >
            全体同期
          </Button>
        </Box>
      }
    >
      {/* 統計情報・ステータス */}
      <Box sx={{ mb: SPACING.LG }}>
        {/* 同期エラーアラート */}
        {failedProjects > 0 && (
          <Alert severity="error" sx={{ mb: SPACING.MD }}>
            {failedProjects}件のプロジェクトで同期エラーが発生しています。
            各プロジェクトの詳細を確認してください。
          </Alert>
        )}

        {/* 競合アラート */}
        {conflictProjects > 0 && (
          <Alert severity="warning" sx={{ mb: SPACING.MD }}>
            {conflictProjects}件のプロジェクトでデータ競合が検出されています。
            手動で解決してください。
          </Alert>
        )}

        {/* 同期情報 */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: SPACING.MD }}>
          <Chip 
            label={`全体: ${totalProjects}件`} 
            color="primary" 
            variant="outlined" 
          />
          <Chip 
            label={`同期済み: ${syncedProjects}件`} 
            color="success" 
            variant="outlined" 
          />
          {failedProjects > 0 && (
            <Chip 
              label={`エラー: ${failedProjects}件`} 
              color="error" 
              variant="filled" 
            />
          )}
          {conflictProjects > 0 && (
            <Chip 
              label={`競合: ${conflictProjects}件`} 
              color="warning" 
              variant="filled" 
            />
          )}
          {neverSyncedProjects > 0 && (
            <Chip 
              label={`未同期: ${neverSyncedProjects}件`} 
              color="default" 
              variant="outlined" 
            />
          )}
        </Box>

        {/* 最終同期時間 */}
        {lastSyncTime && (
          <Alert severity="info" icon={<Info />}>
            最終同期: {lastSyncTime.toLocaleString('ja-JP')}
          </Alert>
        )}
      </Box>

      {/* 同期についての説明 */}
      {totalProjects === 0 && (
        <Box sx={{ mb: SPACING.LG }}>
          <Alert severity="info">
            <Typography variant="body2" gutterBottom>
              <strong>POC同期について:</strong>
            </Typography>
            <Typography variant="body2" component="div">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>monstera-pocシステムからプロジェクトデータを自動取得します</li>
                <li>新規プロジェクトは自動的に提案として取り込まれます</li>
                <li>定期的な同期により最新状態を維持します</li>
                <li>データ競合が発生した場合は手動で解決が必要です</li>
              </ul>
            </Typography>
          </Alert>
        </Box>
      )}

      {/* POCプロジェクト一覧テーブル */}
      <PocProjectTable
        data={projects}
        isLoading={isLoading}
        onRowClick={(project) => console.log('View project details:', project.id)}
        onSync={handleProjectSync}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewOriginal={handleViewOriginal}
        onForceSync={handleForceSync}
      />

      {/* POC同期ダイアログ */}
      <PocSyncDialog
        open={showSyncDialog}
        project={selectedProject || undefined}
        syncResult={syncResult || undefined}
        isLoading={isSyncing}
        onClose={() => {
          setShowSyncDialog(false);
          setSelectedProject(null);
          setSyncResult(null);
        }}
        onSync={handleSync}
        onRetry={handleRetry}
        onForceSync={handleAllForceSync}
      />
    </SalesLayout>
  );
}
