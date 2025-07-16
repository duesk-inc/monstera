'use client';

import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Tabs, Tab, Alert } from '@mui/material';
import { Add, Email, Send, Settings } from '@mui/icons-material';

import { SalesLayout } from '@/components/features/sales/layout/SalesLayout';
import { EmailTemplateDialog } from '@/components/features/sales/email/EmailTemplateDialog';
import { EmailCampaignDialog } from '@/components/features/sales/email/EmailCampaignDialog';
import { SPACING } from '@/constants/dimensions';
import { useToast } from '@/components/common/Toast';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { emailTemplateApi, emailCampaignApi, proposalApi } from '@/lib/api/sales';
import type { EmailTemplate, EmailCampaign, Proposal } from '@/types/sales';

/**
 * メール管理ページ
 */
export default function EmailsPage() {
  const [currentTab, setCurrentTab] = useState<'templates' | 'campaigns'>('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('view');

  const { showSuccess, showError } = useToast();
  const { handleSubmissionError } = useErrorHandler();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [templatesResponse, campaignsResponse, proposalsResponse] = await Promise.all([
        emailTemplateApi.getList({}),
        emailCampaignApi.getList({}),
        proposalApi.getList({ status: 'pending' }) // 送信対象の提案のみ
      ]);
      
      setTemplates(templatesResponse.items || []);
      setCampaigns(campaignsResponse.items || []);
      setProposals(proposalsResponse.items || []);
    } catch (error) {
      handleSubmissionError(error, 'メールデータ取得');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue as 'templates' | 'campaigns');
  };

  // テンプレート関連のハンドラー
  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setDialogMode('create');
    setShowTemplateDialog(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setDialogMode('edit');
    setShowTemplateDialog(true);
  };

  const handleTemplateSave = async (data: any) => {
    try {
      if (dialogMode === 'create') {
        await emailTemplateApi.create(data);
        showSuccess('メールテンプレートを作成しました');
      } else {
        await emailTemplateApi.update(selectedTemplate!.id, data);
        showSuccess('メールテンプレートを更新しました');
      }
      
      setShowTemplateDialog(false);
      setSelectedTemplate(null);
      loadData();
    } catch (error) {
      handleSubmissionError(error, dialogMode === 'create' ? 'テンプレート作成' : 'テンプレート更新');
    }
  };

  const handleTemplateDelete = async (id: string) => {
    if (!confirm('このテンプレートを削除してもよろしいですか？')) {
      return;
    }

    try {
      await emailTemplateApi.delete(id);
      showSuccess('メールテンプレートを削除しました');
      setShowTemplateDialog(false);
      setSelectedTemplate(null);
      loadData();
    } catch (error) {
      handleSubmissionError(error, 'テンプレート削除');
    }
  };

  const handleTemplatePreview = (template: any) => {
    // プレビューダイアログを開く
    console.log('Preview template:', template);
  };

  // キャンペーン関連のハンドラー
  const handleCreateCampaign = () => {
    setSelectedCampaign(null);
    setDialogMode('create');
    setShowCampaignDialog(true);
  };

  const handleEditCampaign = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    setDialogMode('edit');
    setShowCampaignDialog(true);
  };

  const handleCampaignSave = async (data: any) => {
    try {
      if (dialogMode === 'create') {
        await emailCampaignApi.create(data);
        showSuccess('メールキャンペーンを作成しました');
      } else {
        await emailCampaignApi.update(selectedCampaign!.id, data);
        showSuccess('メールキャンペーンを更新しました');
      }
      
      setShowCampaignDialog(false);
      setSelectedCampaign(null);
      loadData();
    } catch (error) {
      handleSubmissionError(error, dialogMode === 'create' ? 'キャンペーン作成' : 'キャンペーン更新');
    }
  };

  const handleCampaignDelete = async (id: string) => {
    if (!confirm('このキャンペーンを削除してもよろしいですか？')) {
      return;
    }

    try {
      await emailCampaignApi.delete(id);
      showSuccess('メールキャンペーンを削除しました');
      setShowCampaignDialog(false);
      setSelectedCampaign(null);
      loadData();
    } catch (error) {
      handleSubmissionError(error, 'キャンペーン削除');
    }
  };

  const handleCampaignSend = async (id: string) => {
    if (!confirm('キャンペーンの送信を開始してもよろしいですか？')) {
      return;
    }

    try {
      await emailCampaignApi.send(id);
      showSuccess('メール送信を開始しました');
      loadData();
    } catch (error) {
      handleSubmissionError(error, 'メール送信開始');
    }
  };

  const handleCampaignPreview = (campaign: any) => {
    // プレビューダイアログを開く
    console.log('Preview campaign:', campaign);
  };

  // 統計情報の計算
  const activeTemplates = templates.filter(t => t.isActive !== false).length;
  const pendingCampaigns = campaigns.filter(c => c.status === 'scheduled').length;
  const sentToday = campaigns.filter(c => {
    if (c.status !== 'sent' || !c.sentDate) return false;
    const sentDate = new Date(c.sentDate);
    const today = new Date();
    return sentDate.toDateString() === today.toDateString();
  }).length;

  return (
    <SalesLayout
      title="メール管理"
      subtitle="テンプレート作成・一斉送信・配信管理"
      actions={
        <Box sx={{ display: 'flex', gap: SPACING.sm }}>
          {currentTab === 'templates' && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateTemplate}
            >
              テンプレート作成
            </Button>
          )}
          {currentTab === 'campaigns' && (
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleCreateCampaign}
            >
              一斉送信作成
            </Button>
          )}
        </Box>
      }
    >
      {/* 統計情報 */}
      <Box sx={{ mb: SPACING.lg }}>
        <Alert severity="info" sx={{ mb: SPACING.md }}>
          アクティブテンプレート: {activeTemplates}件、
          送信予定: {pendingCampaigns}件、
          本日送信: {sentToday}件
        </Alert>
      </Box>

      {/* タブ切り替え */}
      <Box sx={{ mb: SPACING.lg }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab 
            icon={<Settings />} 
            label="テンプレート管理" 
            value="templates" 
          />
          <Tab 
            icon={<Email />} 
            label="一斉送信管理" 
            value="campaigns" 
          />
        </Tabs>
      </Box>

      {/* コンテンツエリア */}
      {currentTab === 'templates' ? (
        <Box>
          {/* テンプレート一覧テーブルは後で実装 */}
          <Typography variant="h6" gutterBottom>
            メールテンプレート一覧
          </Typography>
          <Typography variant="body2" color="textSecondary">
            テンプレート一覧テーブルを準備中です
          </Typography>
          
          {/* 仮のテンプレート一覧 */}
          <Box sx={{ mt: 2 }}>
            {templates.map((template) => (
              <Box 
                key={template.id} 
                sx={{ 
                  p: 2, 
                  border: `1px solid #ddd`, 
                  borderRadius: 1, 
                  mb: 1,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
                onClick={() => handleEditTemplate(template)}
              >
                <Typography variant="subtitle1">{template.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {template.subject}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ) : (
        <Box>
          {/* キャンペーン一覧テーブルは後で実装 */}
          <Typography variant="h6" gutterBottom>
            メールキャンペーン一覧
          </Typography>
          <Typography variant="body2" color="textSecondary">
            キャンペーン一覧テーブルを準備中です
          </Typography>
          
          {/* 仮のキャンペーン一覧 */}
          <Box sx={{ mt: 2 }}>
            {campaigns.map((campaign) => (
              <Box 
                key={campaign.id} 
                sx={{ 
                  p: 2, 
                  border: `1px solid #ddd`, 
                  borderRadius: 1, 
                  mb: 1,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
                onClick={() => handleEditCampaign(campaign)}
              >
                <Typography variant="subtitle1">{campaign.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  ステータス: {campaign.status}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* テンプレートダイアログ */}
      <EmailTemplateDialog
        open={showTemplateDialog}
        template={selectedTemplate || undefined}
        isEdit={dialogMode === 'edit'}
        onClose={() => {
          setShowTemplateDialog(false);
          setSelectedTemplate(null);
        }}
        onSave={handleTemplateSave}
        onDelete={handleTemplateDelete}
        onPreview={handleTemplatePreview}
        isLoading={false}
      />

      {/* キャンペーンダイアログ */}
      <EmailCampaignDialog
        open={showCampaignDialog}
        campaign={selectedCampaign || undefined}
        isEdit={dialogMode === 'edit'}
        templates={templates}
        proposals={proposals}
        onClose={() => {
          setShowCampaignDialog(false);
          setSelectedCampaign(null);
        }}
        onSave={handleCampaignSave}
        onDelete={handleCampaignDelete}
        onSend={handleCampaignSend}
        onPreview={handleCampaignPreview}
        isLoading={false}
      />
    </SalesLayout>
  );
}