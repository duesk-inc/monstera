'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  Collapse,
  Alert,
  AlertTitle,
  Skeleton,
  Paper,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  QuestionAnswer as QuestionIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  MoreVert as MoreIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import { formatDateTime } from '../../../types/proposal';
import { useProposalQuickHandlers } from '../../../hooks/proposal/useProposalErrorHandler';
import { useProposalPermissions } from '../../../hooks/proposal/useProposalPermissions';
import type { ProposalQuestionDTO } from '../../../types/proposal';

// 24時間以内かどうかを判定する関数
const isWithin24Hours = (question: ProposalQuestionDTO): boolean => {
  const createdAt = new Date(question.createdAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return hoursDiff < 24;
};

/**
 * 質問リストコンポーネントのプロパティ
 */
export interface ProposalQuestionListProps {
  /** 質問一覧 */
  questions: ProposalQuestionDTO[];
  /** ローディング状態 */
  isLoading?: boolean;
  /** エラー状態 */
  error?: Error | null;
  /** 編集可能かどうか（提案中のみ） */
  isEditable?: boolean;
  /** 質問投稿ハンドラー */
  onCreateQuestion?: (questionText: string) => Promise<void>;
  /** 質問編集ハンドラー */
  onUpdateQuestion?: (id: string, questionText: string) => Promise<void>;
  /** 質問削除ハンドラー */
  onDeleteQuestion?: (id: string) => Promise<void>;
  /** リフレッシュハンドラー */
  onRefresh?: () => void;
  /** 営業担当者向けかどうか */
  isSalesView?: boolean;
  /** 回答投稿ハンドラー（営業向け） */
  onRespondQuestion?: (id: string, responseText: string) => Promise<void>;
  /** コンポーネントタイトル */
  title?: string;
  /** 空状態のメッセージ */
  emptyMessage?: string;
}

/**
 * 質問カードコンポーネント
 */
const QuestionCard: React.FC<{
  question: ProposalQuestionDTO;
  isEditable: boolean;
  isSalesView: boolean;
  onUpdate?: (id: string, text: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onRespond?: (id: string, text: string) => Promise<void>;
}> = ({ question, isEditable, isSalesView, onUpdate, onDelete, onRespond }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [editText, setEditText] = useState(question.questionText);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 権限チェック
  const { 
    canEditQuestionComprehensive, 
    canDeleteQuestionComprehensive, 
    canRespondToQuestions,
    currentUserId 
  } = useProposalPermissions();

  // 質問の作成者IDを取得
  // TODO: バックエンドのProposalQuestionDTOにcreatedByIdフィールドを追加する必要がある
  // 現在は、エンジニアが自分の質問のみ編集・削除できるという前提で、
  // currentUserIdを使用してチェックする
  const questionCreatorId = currentUserId; // 現在のユーザーIDを使用

  const canEdit = isEditable && 
                 !question.isResponded && 
                 canEditQuestionComprehensive(questionCreatorId, question.createdAt);
  const canDelete = isEditable && 
                   !question.isResponded && 
                   canDeleteQuestionComprehensive(questionCreatorId, question.createdAt);
  const canRespond = isSalesView && !question.isResponded && canRespondToQuestions;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = async () => {
    if (!onUpdate) return;
    setIsSubmitting(true);
    try {
      await onUpdate(question.id, editText);
      setEditDialogOpen(false);
      handleMenuClose();
    } catch (error) {
      // エラーはhookで処理
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsSubmitting(true);
    try {
      await onDelete(question.id);
      setDeleteDialogOpen(false);
      handleMenuClose();
    } catch (error) {
      // エラーはhookで処理
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespond = async () => {
    if (!onRespond) return;
    setIsSubmitting(true);
    try {
      await onRespond(question.id, responseText);
      setRespondDialogOpen(false);
      setResponseText('');
    } catch (error) {
      // エラーはhookで処理
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          {/* ヘッダー */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <QuestionIcon color="primary" />
                <Typography variant="h6" component="h3">
                  質問
                </Typography>
                <Chip
                  label={question.isResponded ? '回答済み' : '未回答'}
                  color={question.isResponded ? 'success' : 'warning'}
                  size="small"
                  icon={question.isResponded ? <CheckCircleIcon /> : <ScheduleIcon />}
                />
              </Stack>
            </Box>
            
            {(canEdit || canDelete || canRespond) && (
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                aria-label="質問メニュー"
              >
                <MoreIcon />
              </IconButton>
            )}
          </Box>

          {/* 質問内容 */}
          <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
            {question.questionText}
          </Typography>

          {/* メタ情報 */}
          <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                投稿: {formatDateTime(question.createdAt)}
              </Typography>
            </Box>
            {question.updatedAt && question.updatedAt !== question.createdAt && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EditIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  編集: {formatDateTime(question.updatedAt)}
                </Typography>
              </Box>
            )}
            {question.salesUser && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  担当: {question.salesUser.firstName} {question.salesUser.lastName}
                </Typography>
              </Box>
            )}
          </Stack>

          {/* 回答がある場合 */}
          {question.isResponded && question.responseText && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <ReplyIcon color="success" sx={{ fontSize: 20 }} />
                  <Typography variant="subtitle2" color="success.main">
                    営業担当者からの回答
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                  {question.responseText}
                </Typography>
                {question.respondedAt && (
                  <Typography variant="caption" color="text.secondary">
                    回答日時: {formatDateTime(question.respondedAt)}
                  </Typography>
                )}
              </Box>
            </>
          )}

          {/* 編集削除の制限警告 */}
          {isEditable && !question.isResponded && !isWithin24Hours(question) && (
            <Alert severity="info" sx={{ mt: 2 }}>
              投稿から24時間以上経過したため、編集・削除はできません。
            </Alert>
          )}
        </CardContent>

        {/* アクション（営業向け） */}
        {canRespond && (
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<SendIcon />}
              onClick={() => setRespondDialogOpen(true)}
            >
              回答する
            </Button>
          </CardActions>
        )}
      </Card>

      {/* メニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {canEdit && (
          <MenuItem onClick={() => { setEditDialogOpen(true); handleMenuClose(); }}>
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            編集
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={() => { setDeleteDialogOpen(true); handleMenuClose(); }}>
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
            削除
          </MenuItem>
        )}
        {canRespond && (
          <MenuItem onClick={() => { setRespondDialogOpen(true); handleMenuClose(); }}>
            <SendIcon sx={{ mr: 1 }} fontSize="small" />
            回答する
          </MenuItem>
        )}
      </Menu>

      {/* 編集ダイアログ */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>質問を編集</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            label="質問内容"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            inputProps={{ maxLength: 2000 }}
            helperText={`${editText.length}/2000文字`}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleEdit}
            disabled={!editText.trim() || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <EditIcon />}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>質問を削除</DialogTitle>
        <DialogContent>
          <Typography>
            この質問を削除してもよろしいですか？削除した質問は復元できません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 回答ダイアログ */}
      <Dialog
        open={respondDialogOpen}
        onClose={() => setRespondDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>質問に回答</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              質問内容
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2">
                {question.questionText}
              </Typography>
            </Paper>
          </Box>
          <TextField
            autoFocus
            multiline
            rows={6}
            fullWidth
            label="回答内容"
            placeholder="回答内容を入力してください"
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            inputProps={{ maxLength: 2000 }}
            helperText={`${responseText.length}/2000文字`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRespondDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleRespond}
            disabled={!responseText.trim() || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <SendIcon />}
          >
            回答を送信
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * 提案質問一覧コンポーネント
 * 質問の一覧表示、投稿、編集、削除、回答機能を提供
 */
export const ProposalQuestionList: React.FC<ProposalQuestionListProps> = ({
  questions,
  isLoading = false,
  error = null,
  isEditable = false,
  onCreateQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onRefresh,
  isSalesView = false,
  onRespondQuestion,
  title = '質問・回答',
  emptyMessage = 'まだ質問はありません',
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateQuestion = async () => {
    if (!onCreateQuestion) return;
    setIsSubmitting(true);
    try {
      await onCreateQuestion(newQuestionText.trim());
      setCreateDialogOpen(false);
      setNewQuestionText('');
    } catch (error) {
      // エラーはhookで処理
    } finally {
      setIsSubmitting(false);
    }
  };

  // ローディング状態
  if (isLoading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Stack spacing={2}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} variant="outlined">
              <CardContent>
                <Skeleton variant="text" width="30%" height={32} />
                <Skeleton variant="text" width="100%" height={24} sx={{ mt: 2 }} />
                <Skeleton variant="text" width="80%" height={24} />
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Skeleton variant="text" width={120} />
                  <Skeleton variant="text" width={150} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    );
  }

  // エラー状態
  if (error) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Alert severity="error">
          <AlertTitle>質問の取得に失敗しました</AlertTitle>
          {error.message}
          {onRefresh && (
            <Button
              size="small"
              onClick={onRefresh}
              sx={{ mt: 1 }}
            >
              再読み込み
            </Button>
          )}
        </Alert>
      </Box>
    );
  }

  // 未回答の質問数
  const unansweredCount = questions.filter(q => !q.isResponded).length;

  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          {questions.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              全{questions.length}件
              {unansweredCount > 0 && ` (未回答: ${unansweredCount}件)`}
            </Typography>
          )}
        </Box>
        
        {isEditable && onCreateQuestion && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            質問を投稿
          </Button>
        )}
      </Box>

      {/* 質問一覧 */}
      {questions.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <QuestionIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {emptyMessage}
          </Typography>
          {isEditable && onCreateQuestion && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ mt: 2 }}
            >
              最初の質問を投稿
            </Button>
          )}
        </Paper>
      ) : (
        <Stack spacing={2}>
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              isEditable={isEditable}
              isSalesView={isSalesView}
              onUpdate={onUpdateQuestion}
              onDelete={onDeleteQuestion}
              onRespond={onRespondQuestion}
            />
          ))}
        </Stack>
      )}

      {/* 質問投稿ダイアログ */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>質問を投稿</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            質問は投稿から24時間以内のみ編集・削除が可能です。
          </Alert>
          <TextField
            autoFocus
            multiline
            rows={6}
            fullWidth
            label="質問内容"
            placeholder="質問内容を入力してください（最大2000文字）"
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            inputProps={{ maxLength: 2000 }}
            helperText={`${newQuestionText.length}/2000文字`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateQuestion}
            disabled={!newQuestionText.trim() || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <SendIcon />}
          >
            投稿
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProposalQuestionList;