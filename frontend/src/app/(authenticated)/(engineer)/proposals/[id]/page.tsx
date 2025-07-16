'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
  Typography,
  Stack,
  Chip,
  Divider,
  Alert,
  AlertTitle,
  Tab,
  Tabs,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HelpOutline as QuestionIcon,
  TrendingUp as TrendingUpIcon,
  BusinessCenter as BusinessIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarIcon,
  Computer as ComputerIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { PageContainer } from '../../../../../components/common/layout/PageContainer';
import { CommonTabPanel } from '../../../../../components/common/CommonTabPanel';
import { ProposalQuestionList } from '../../../../../components/features/proposal';
import { 
  useProposalDetail, 
  useUpdateProposalStatus,
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
} from '../../../../../hooks/proposal/useProposalQueries';
import type { ProposalQuestionDTO } from '../../../../../types/proposal';
import { 
  getProposalStatusLabel, 
  getProposalStatusColor,
  formatPriceRange,
  formatDate,
  formatDateTime,
  formatExperienceYears,
} from '../../../../../types/proposal';
import { useProposalErrorHandling } from '../../../../../hooks/proposal/useProposalErrorHandling';
import { useProposalPermissions } from '../../../../../hooks/proposal/useProposalPermissions';

/**
 * 提案詳細ページ
 * 提案の詳細情報表示、ステータス更新、質問管理機能を提供
 */
export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;
  
  // 権限チェック
  const { 
    canViewProposals, 
    canAccessProposal, 
    canRespondToProposals,
    canCreateQuestions,
    canEditQuestionComprehensive,
    canDeleteQuestionComprehensive,
    currentUserId 
  } = useProposalPermissions();
  
  // エラーハンドリング
  const { proposalHandlers, questionHandlers } = useProposalErrorHandling();

  // タブ状態
  const [tabIndex, setTabIndex] = useState(0);
  
  // ステータス更新確認ダイアログ状態
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'proceed' | 'declined' | null>(null);

  // 提案詳細データを取得
  const { 
    data: proposal, 
    isLoading: proposalLoading, 
    isError: proposalError,
    refetch: refetchProposal 
  } = useProposalDetail(proposalId);

  // 質問一覧データを取得
  const { 
    questions, 
    isLoading: questionsLoading,
    refetch: refetchQuestions 
  } = useQuestions({
    proposalId,
    enabled: !!proposalId,
  });

  // ステータス更新
  const updateStatus = useUpdateProposalStatus({
    onSuccess: () => {
      proposalHandlers.onStatusUpdateSuccess();
      refetchProposal();
      setStatusDialogOpen(false);
      setSelectedStatus(null);
    },
    onError: proposalHandlers.onStatusUpdateError,
  });

  // 質問投稿
  const createQuestion = useCreateQuestion({
    onSuccess: () => {
      questionHandlers.onCreateSuccess();
      refetchQuestions();
      setTabIndex(1); // 質問タブに切り替え
    },
    onError: questionHandlers.onCreateError,
  });

  // 質問更新
  const updateQuestion = useUpdateQuestion({
    onSuccess: () => {
      questionHandlers.onUpdateSuccess();
      refetchQuestions();
    },
    onError: questionHandlers.onUpdateError,
  });

  // 質問削除
  const deleteQuestion = useDeleteQuestion({
    onSuccess: () => {
      questionHandlers.onDeleteSuccess();
      refetchQuestions();
    },
    onError: questionHandlers.onDeleteError,
  });

  // タブ切り替え
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  // 戻るボタン
  const handleBack = () => {
    router.push('/proposals');
  };

  // ステータス更新
  const handleStatusUpdate = (status: 'proceed' | 'declined') => {
    setSelectedStatus(status);
    setStatusDialogOpen(true);
  };

  const confirmStatusUpdate = () => {
    if (selectedStatus && proposalId) {
      updateStatus.mutate({ id: proposalId, status: selectedStatus });
    }
  };

  // ローディング状態
  if (proposalLoading) {
    return (
      <PageContainer maxWidth="lg">
        <Box sx={{ mb: 2 }}>
          <Skeleton variant="text" width={300} height={32} />
        </Box>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={200} height={48} />
        </Box>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="100%" height={32} />
            <Skeleton variant="text" width="80%" height={24} sx={{ mt: 2 }} />
            <Skeleton variant="text" width="60%" height={24} sx={{ mt: 1 }} />
            <Box sx={{ mt: 3 }}>
              <Skeleton variant="rectangular" width="100%" height={200} />
            </Box>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // 権限チェック（基本権限）
  if (!canViewProposals) {
    return (
      <PageContainer maxWidth="lg">
        <Alert severity="error">
          <AlertTitle>アクセス権限がありません</AlertTitle>
          提案情報を閲覧する権限がありません。システム管理者にお問い合わせください。
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            一覧に戻る
          </Button>
        </Box>
      </PageContainer>
    );
  }

  // エラー状態
  if (proposalError || !proposal) {
    return (
      <PageContainer maxWidth="lg">
        <Alert severity="error">
          <AlertTitle>提案情報の取得に失敗しました</AlertTitle>
          指定された提案が見つからないか、アクセス権限がありません。
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            一覧に戻る
          </Button>
        </Box>
      </PageContainer>
    );
  }

  // 具体的な提案アクセス権限チェック
  const hasProposalAccess = canAccessProposal(proposal.userId);
  if (!hasProposalAccess) {
    return (
      <PageContainer maxWidth="lg">
        <Alert severity="error">
          <AlertTitle>この提案にアクセスする権限がありません</AlertTitle>
          自分に提案された案件のみ閲覧することができます。
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            一覧に戻る
          </Button>
        </Box>
      </PageContainer>
    );
  }

  const isResponseable = proposal.status === 'proposed' && canRespondToProposals;

  return (
    <PageContainer maxWidth="lg">
      {/* パンくずリスト */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => router.push('/proposals')}
          sx={{
            textDecoration: 'none',
            color: 'text.primary',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          提案一覧
        </Link>
        <Typography color="text.primary">詳細</Typography>
      </Breadcrumbs>

      {/* ページヘッダー */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 1 }}>
            提案詳細
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={getProposalStatusLabel(proposal.status)}
              color={getProposalStatusColor(proposal.status) as any}
              sx={{ fontWeight: 'medium' }}
            />
            {questions.length > 0 && (
              <Chip
                icon={<QuestionIcon sx={{ fontSize: 16 }} />}
                label={`質問 ${questions.length}件`}
                size="small"
                variant="outlined"
                color="info"
              />
            )}
          </Stack>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          一覧に戻る
        </Button>
      </Box>

      {/* ステータス変更アクション */}
      {isResponseable && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>回答をお待ちしています</AlertTitle>
          この提案について、選考に進むかどうかをお選びください。質問がある場合は、質問タブから投稿できます。
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => handleStatusUpdate('proceed')}
              disabled={updateStatus.isPending}
            >
              選考へ進む
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => handleStatusUpdate('declined')}
              disabled={updateStatus.isPending}
            >
              見送り
            </Button>
          </Stack>
        </Alert>
      )}

      {/* タブナビゲーション */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          aria-label="proposal detail tabs"
        >
          <Tab label="基本情報" />
          <Tab 
            label={`質問 (${questions.length})`}
            icon={questions.some(q => !q.isResponded) ? <QuestionIcon color="warning" /> : undefined}
            iconPosition="end"
          />
        </Tabs>
      </Box>

      {/* 基本情報タブ */}
      <CommonTabPanel value={tabIndex} index={0} prefix="proposal" padding={0}>
        <Card>
          <CardContent>
            {/* プロジェクト基本情報 */}
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              {proposal.project.projectName}
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" color="text.secondary" paragraph>
                {proposal.project.description}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 詳細情報グリッド */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {/* 左列 */}
              <Stack spacing={3}>
                {/* 想定単価 */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TrendingUpIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      想定単価
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary.main" fontWeight="bold">
                    {formatPriceRange(proposal.project.minPrice, proposal.project.maxPrice)}
                  </Typography>
                </Box>

                {/* 勤務地 */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      勤務地
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {proposal.project.workLocation}
                  </Typography>
                </Box>

                {/* リモートワーク */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <ComputerIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      リモートワーク
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {proposal.project.remoteWorkType}
                  </Typography>
                </Box>

                {/* 勤務時間 */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AccessTimeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      勤務時間
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {proposal.project.workingTime}
                  </Typography>
                </Box>
              </Stack>

              {/* 右列 */}
              <Stack spacing={3}>
                {/* 契約期間 */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      契約期間
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {proposal.project.contractPeriod}
                  </Typography>
                </Box>

                {/* 開始予定日 */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <ScheduleIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      開始予定日
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {proposal.project.startDate 
                      ? formatDate(proposal.project.startDate)
                      : proposal.project.startDateText
                    }
                  </Typography>
                </Box>

                {/* 提案日時 */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PersonIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      提案日時
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {formatDateTime(proposal.createdAt)}
                  </Typography>
                </Box>

                {/* 回答日時 */}
                {proposal.respondedAt && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
                      <Typography variant="subtitle1" fontWeight="medium">
                        回答日時
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {formatDateTime(proposal.respondedAt)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            {/* スキル要件 */}
            {(proposal.project.requiredSkills.length > 0 || proposal.project.preferredSkills.length > 0) && (
              <>
                <Divider sx={{ my: 3 }} />
                
                {/* 必須スキル */}
                {proposal.project.requiredSkills.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <WorkIcon sx={{ fontSize: 20, color: 'error.main' }} />
                      <Typography variant="subtitle1" fontWeight="medium">
                        必須スキル
                      </Typography>
                    </Box>
                    <Stack spacing={1}>
                      {proposal.project.requiredSkills.map((skill, index) => (
                        <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1" fontWeight="medium">
                              {skill.skillName}
                            </Typography>
                            {(skill.experienceYearsMin || skill.experienceYearsMax) && (
                              <Chip
                                label={formatExperienceYears(skill.experienceYearsMin, skill.experienceYearsMax)}
                                size="small"
                                color="error"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* 歓迎スキル */}
                {proposal.project.preferredSkills.length > 0 && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <SettingsIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                      <Typography variant="subtitle1" fontWeight="medium">
                        歓迎スキル
                      </Typography>
                    </Box>
                    <Stack spacing={1}>
                      {proposal.project.preferredSkills.map((skill, index) => (
                        <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1" fontWeight="medium">
                              {skill.skillName}
                            </Typography>
                            {(skill.experienceYearsMin || skill.experienceYearsMax) && (
                              <Chip
                                label={formatExperienceYears(skill.experienceYearsMin, skill.experienceYearsMax)}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </CommonTabPanel>

      {/* 質問タブ */}
      <CommonTabPanel value={tabIndex} index={1} prefix="proposal" padding={0}>
        <ProposalQuestionList
          questions={questions}
          isLoading={questionsLoading}
          isEditable={isResponseable}
          onCreateQuestion={async (text) => {
            await createQuestion.mutateAsync({ proposalId, questionText: text });
          }}
          onUpdateQuestion={async (id, text) => {
            await updateQuestion.mutateAsync({ id, questionText: text });
          }}
          onDeleteQuestion={async (id) => {
            await deleteQuestion.mutateAsync(id);
          }}
          onRefresh={refetchQuestions}
          emptyMessage={
            isResponseable 
              ? '疑問点があれば質問を投稿してください'
              : '質問は提案中のみ投稿できます'
          }
        />
      </CommonTabPanel>

      {/* ステータス更新確認ダイアログ */}
      <Dialog 
        open={statusDialogOpen} 
        onClose={() => setStatusDialogOpen(false)}
      >
        <DialogTitle>
          {selectedStatus === 'proceed' ? '選考へ進む' : '見送り'}の確認
        </DialogTitle>
        <DialogContent>
          <Typography>
            この提案について「
            {selectedStatus === 'proceed' ? '選考へ進む' : '見送り'}
            」として回答しますか？
          </Typography>
          {selectedStatus === 'declined' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              見送りを選択すると、後から変更することはできません。
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color={selectedStatus === 'proceed' ? 'success' : 'error'}
            onClick={confirmStatusUpdate}
            disabled={updateStatus.isPending}
            startIcon={updateStatus.isPending ? <CircularProgress size={16} /> : undefined}
          >
            確定
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}