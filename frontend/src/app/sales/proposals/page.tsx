'use client';

import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { Add, FileDownload, Upload } from '@mui/icons-material';

import { SalesLayout } from '@/components/features/sales/layout/SalesLayout';
import { ProposalDataTable } from '@/components/features/sales/proposal/ProposalDataTable';
import { InterviewDialog } from '@/components/features/sales/interview/InterviewDialog';
import { SPACING } from '@/constants/dimensions';
import { useToast } from '@/components/common/Toast';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { proposalApi } from '@/lib/api/sales';
import type { Proposal, ProposalStatus } from '@/types/sales';

/**
 * 提案管理ページ
 */
export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [filter, setFilter] = useState<{ status?: ProposalStatus[]; engineerId?: string; clientId?: string; search?: string }>({
    status: undefined,
    engineerId: undefined,
    clientId: undefined,
    search: undefined,
  });

  const { showSuccess, showError } = useToast();
  const { handleSubmissionError } = useErrorHandler();

  useEffect(() => {
    loadProposals();
  }, [filter]);

  const loadProposals = async () => {
    try {
      setIsLoading(true);
      const response = await proposalApi.getList(filter);
      setProposals(response.items || []);
    } catch (error) {
      handleSubmissionError(error, '提案一覧取得');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (proposal: Proposal, newStatus: ProposalStatus) => {
    try {
      await proposalApi.updateStatus(proposal.id, newStatus);
      showSuccess('ステータスを更新しました');
      loadProposals();
    } catch (error) {
      handleSubmissionError(error, 'ステータス更新');
    }
  };

  const handleEdit = (proposal: Proposal) => {
    // 提案編集ダイアログを開く
    console.log('Edit proposal:', proposal.id);
  };

  const handleDelete = async (proposal: Proposal) => {
    if (!confirm('この提案を削除してもよろしいですか？')) {
      return;
    }

    try {
      await proposalApi.delete(proposal.id);
      showSuccess('提案を削除しました');
      loadProposals();
    } catch (error) {
      handleSubmissionError(error, '提案削除');
    }
  };

  const handleSendEmail = (proposal: Proposal) => {
    // メール送信ダイアログを開く
    console.log('Send email for proposal:', proposal.id);
  };

  const handleScheduleInterview = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowInterviewDialog(true);
  };

  const handleInterviewSave = async (data: any) => {
    try {
      // 面談スケジュール作成API呼び出し
      console.log('Create interview:', data);
      showSuccess('面談を予定しました');
      setShowInterviewDialog(false);
      setSelectedProposal(null);
      loadProposals();
    } catch (error) {
      handleSubmissionError(error, '面談予定作成');
    }
  };

  const handleCreateProposal = () => {
    // 新規提案作成ページに遷移
    window.location.href = '/sales/proposals/new';
  };

  const handleExport = async () => {
    // エクスポートAPIは未実装のため未対応
    showError('エクスポート機能は現在未対応です');
  };

  const handleImport = () => {
    // インポートダイアログを開く
    console.log('Open import dialog');
  };

  return (
    <SalesLayout
      title="提案管理"
      actions={
        <Box sx={{ display: 'flex', gap: SPACING.SM }}>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={handleImport}
          >
            インポート
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
            onClick={handleCreateProposal}
          >
            新規提案
          </Button>
        </Box>
      }
    >
      {/* フィルター・検索エリア */}
      <Box sx={{ mb: SPACING.LG }}>
        {/* フィルターコンポーネントは後で実装 */}
      </Box>

      {/* 統計情報 */}
      <Box sx={{ mb: SPACING.LG }}>
        <Alert severity="info">
          全{proposals.length}件の提案があります。
          進行中: {proposals.filter(p => ['pending', 'in_interview'].includes(p.status)).length}件
        </Alert>
      </Box>

      {/* 提案一覧テーブル */}
      <ProposalDataTable
        data={proposals}
        isLoading={isLoading}
        onRowClick={(proposal) => console.log('View proposal details:', proposal.id)}
        onStatusChange={handleStatusChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSendEmail={handleSendEmail}
        onScheduleInterview={handleScheduleInterview}
      />

      {/* 面談スケジュールダイアログ */}
      <InterviewDialog
        open={showInterviewDialog}
        proposalId={selectedProposal?.id}
        onClose={() => {
          setShowInterviewDialog(false);
          setSelectedProposal(null);
        }}
        onSave={handleInterviewSave}
        isLoading={false}
      />
    </SalesLayout>
  );
}
