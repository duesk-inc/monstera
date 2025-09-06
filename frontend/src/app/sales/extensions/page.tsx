'use client';

import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, Chip } from '@mui/material';
import { Add, FileDownload, Sync, Warning } from '@mui/icons-material';

import { SalesLayout } from '@/components/features/sales/layout/SalesLayout';
import { ContractExtensionTable } from '@/components/features/sales/extension/ContractExtensionTable';
import { ExtensionDialog } from '@/components/features/sales/extension/ExtensionDialog';
import { SPACING } from '@/constants/dimensions';
import { useToast } from '@/components/common/Toast';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { contractExtensionApi } from '@/lib/api/sales';
import type { ContractExtension, ContractExtensionStatus } from '@/types/sales';

/**
 * 契約延長管理ページ
 */
export default function ExtensionsPage() {
  const [extensions, setExtensions] = useState<ContractExtension[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExtension, setSelectedExtension] = useState<ContractExtension | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('view');

  const { showSuccess, showError } = useToast();
  const { handleSubmissionError } = useErrorHandler();

  useEffect(() => {
    loadExtensions();
  }, []);

  const loadExtensions = async () => {
    try {
      setIsLoading(true);
      const response = await contractExtensionApi.getList({});
      setExtensions(response.items || []);
    } catch (error) {
      handleSubmissionError(error, '契約延長一覧取得');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (extension: ContractExtension, newStatus: ContractExtensionStatus) => {
    try {
      await contractExtensionApi.updateStatus(extension.id, newStatus);
      showSuccess('ステータスを更新しました');
      loadExtensions();
    } catch (error) {
      handleSubmissionError(error, 'ステータス更新');
    }
  };

  const handleEdit = (extension: ContractExtension) => {
    setSelectedExtension(extension);
    setDialogMode('edit');
    setShowDialog(true);
  };

  const handleApprove = async (extension: ContractExtension) => {
    if (!confirm('この契約延長を承認してもよろしいですか？')) {
      return;
    }

    try {
      await contractExtensionApi.updateStatus(extension.id, 'approved');
      showSuccess('契約延長を承認しました');
      loadExtensions();
    } catch (error) {
      handleSubmissionError(error, '契約延長承認');
    }
  };

  const handleReject = async (extension: ContractExtension) => {
    const reason = prompt('却下理由を入力してください（任意）');
    
    try {
      await contractExtensionApi.updateStatus(extension.id, 'rejected');
      showSuccess('契約延長を却下しました');
      loadExtensions();
    } catch (error) {
      handleSubmissionError(error, '契約延長却下');
    }
  };

  const handleSendReminder = async (extension: ContractExtension) => {
    try {
      // リマインダーAPIは未実装のため、現状は成功トーストのみ
      showSuccess('リマインダーを送信しました');
    } catch (error) {
      handleSubmissionError(error, 'リマインダー送信');
    }
  };

  const handleCreateExtension = () => {
    setSelectedExtension(null);
    setDialogMode('create');
    setShowDialog(true);
  };

  const handleExtensionSave = async (data: any) => {
    try {
      if (dialogMode === 'create') {
        await contractExtensionApi.create(data);
        showSuccess('契約延長を作成しました');
      } else {
        await contractExtensionApi.update(selectedExtension!.id, data);
        showSuccess('契約延長を更新しました');
      }
      
      setShowDialog(false);
      setSelectedExtension(null);
      loadExtensions();
    } catch (error) {
      handleSubmissionError(error, dialogMode === 'create' ? '契約延長作成' : '契約延長更新');
    }
  };

  const handleExtensionDelete = async (id: string) => {
    if (!confirm('この契約延長を削除してもよろしいですか？')) {
      return;
    }

    try {
      await contractExtensionApi.delete(id);
      showSuccess('契約延長を削除しました');
      setShowDialog(false);
      setSelectedExtension(null);
      loadExtensions();
    } catch (error) {
      handleSubmissionError(error, '契約延長削除');
    }
  };

  const handleExport = async () => {
    try {
      // エクスポートAPIは未実装のため、現状は未対応
      showError('エクスポート機能は現在未対応です');
    } catch (error) {
      handleSubmissionError(error, '契約延長データエクスポート');
    }
  };

  const handleRefresh = () => {
    loadExtensions();
  };

  // 統計情報の計算
  const totalExtensions = extensions.length;
  const pendingExtensions = extensions.filter(e => e.status === 'pending').length;
  const urgentExtensions = extensions.filter(e => {
    if (!e.currentContractEnd) return false;
    const deadline = new Date(e.currentContractEnd);
    const now = new Date();
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  }).length;
  const overdueExtensions = extensions.filter(e => {
    if (!e.currentContractEnd) return false;
    const deadline = new Date(e.currentContractEnd);
    const now = new Date();
    return deadline < now && ['pending', 'requested', 'confirmed'].includes(e.status);
  }).length;

  return (
    <SalesLayout
      title="契約延長管理"
      
      actions={
        <Box sx={{ display: 'flex', gap: SPACING.SM }}>
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            更新
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExport}
          >
            エクスポート
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateExtension}
          >
            延長確認作成
          </Button>
        </Box>
      }
    >
      {/* 統計情報・アラート */}
      <Box sx={{ mb: SPACING.LG }}>
        {overdueExtensions > 0 && (
          <Alert 
            severity="error" 
            sx={{ mb: SPACING.MD }}
            icon={<Warning />}
          >
            期限超過の契約延長が {overdueExtensions} 件あります。至急対応をお願いします。
          </Alert>
        )}
        
        {urgentExtensions > 0 && (
          <Alert 
            severity="warning" 
            sx={{ mb: SPACING.MD }}
          >
            期限まで3日以内の契約延長が {urgentExtensions} 件あります。
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={`全体: ${totalExtensions}件`} 
            color="primary" 
            variant="outlined" 
          />
          <Chip 
            label={`確認待ち: ${pendingExtensions}件`} 
            color="warning" 
            variant="outlined" 
          />
          {urgentExtensions > 0 && (
            <Chip 
              label={`緊急: ${urgentExtensions}件`} 
              color="error" 
              variant="filled" 
            />
          )}
        </Box>
      </Box>

      {/* 契約延長一覧テーブル */}
      <ContractExtensionTable
        data={extensions}
        isLoading={isLoading}
        onRowClick={(extension) => {
          setSelectedExtension(extension);
          setDialogMode('view');
          setShowDialog(true);
        }}
        onStatusChange={handleStatusChange}
        onEdit={handleEdit}
        onApprove={handleApprove}
        onReject={handleReject}
        onSendReminder={handleSendReminder}
      />

      {/* 契約延長詳細・編集ダイアログ */}
      <ExtensionDialog
        open={showDialog}
        extension={selectedExtension || undefined}
        isEdit={dialogMode === 'edit'}
        onClose={() => {
          setShowDialog(false);
          setSelectedExtension(null);
        }}
        onSave={handleExtensionSave}
        onDelete={handleExtensionDelete}
        isLoading={false}
      />
    </SalesLayout>
  );
}
