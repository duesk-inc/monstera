import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  LinearProgress,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Save as SaveIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Devices as DeviceIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { TempSaveData } from '../../../utils/tempSaveUtils';

const StyledAlert = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiAlert-action': {
    alignItems: 'flex-start',
    paddingTop: theme.spacing(0.5),
  },
}));

const DetailsList = styled(List)(({ theme }) => ({
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1),
  marginTop: theme.spacing(1),
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

interface TempSaveAlertProps {
  tempData: TempSaveData | null;
  hasLocalData: boolean;
  hasServerData: boolean;
  completionRate: number;
  lastSaved: Date | null;
  isAutoSaving: boolean;
  onRestore: () => void;
  onClear: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
}

export const TempSaveAlert: React.FC<TempSaveAlertProps> = ({
  tempData,
  hasLocalData,
  hasServerData,
  completionRate,
  lastSaved,
  isAutoSaving,
  onRestore,
  onClear,
  onDismiss,
  showDetails = false,
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!tempData || dismissed) {
    return null;
  }

  const lastModified = new Date(tempData.metadata.lastModified);
  const timeAgo = formatDistanceToNow(lastModified, { 
    addSuffix: true, 
    locale: ja 
  });

  const getSeverity = () => {
    if (completionRate >= 80) return 'success';
    if (completionRate >= 50) return 'info';
    if (completionRate >= 20) return 'warning';
    return 'error';
  };

  const getTitle = () => {
    if (isAutoSaving) return '自動保存中...';
    if (hasLocalData && hasServerData) return '一時保存データがあります';
    if (hasLocalData) return 'ローカルに一時保存データがあります';
    if (hasServerData) return 'サーバーに一時保存データがあります';
    return '一時保存データがあります';
  };

  const getDescription = () => {
    if (isAutoSaving) return 'データを自動保存しています。しばらくお待ちください。';
    
    const stepInfo = tempData.metadata.totalSteps 
      ? `（ステップ ${tempData.metadata.step}/${tempData.metadata.totalSteps}）`
      : '';
      
    return `${timeAgo}に保存された未完了のフォームデータがあります${stepInfo}。続きから入力を再開できます。`;
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleClearConfirm = () => {
    setShowDialog(true);
  };

  const handleClearExecute = () => {
    onClear();
    setShowDialog(false);
    setDismissed(true);
  };

  const renderDetails = () => (
    <DetailsList dense>
      <ListItem>
        <ListItemIcon>
          <ScheduleIcon color="action" />
        </ListItemIcon>
        <ListItemText
          primary="最終更新"
          secondary={lastModified.toLocaleString('ja-JP')}
        />
      </ListItem>
      
      <Divider component="li" />
      
      <ListItem>
        <ListItemIcon>
          <InfoIcon color="action" />
        </ListItemIcon>
        <ListItemText
          primary="完了率"
          secondary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={completionRate}
                sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                color={getSeverity() as any}
              />
              <Typography variant="caption">
                {completionRate}%
              </Typography>
            </Box>
          }
        />
      </ListItem>

      <Divider component="li" />

      <ListItem>
        <ListItemIcon>
          {hasLocalData ? <StorageIcon color="action" /> : <CloudIcon color="action" />}
        </ListItemIcon>
        <ListItemText
          primary="保存場所"
          secondary={
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              {hasLocalData && (
                <Chip 
                  label="ローカル" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  icon={<StorageIcon />}
                />
              )}
              {hasServerData && (
                <Chip 
                  label="サーバー" 
                  size="small" 
                  color="secondary" 
                  variant="outlined"
                  icon={<CloudIcon />}
                />
              )}
            </Box>
          }
        />
      </ListItem>

      {tempData.metadata.deviceInfo && (
        <>
          <Divider component="li" />
          <ListItem>
            <ListItemIcon>
              <DeviceIcon color="action" />
            </ListItemIcon>
            <ListItemText
              primary="デバイス情報"
              secondary={
                <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                  {tempData.metadata.deviceInfo.substring(0, 100)}
                  {tempData.metadata.deviceInfo.length > 100 && '...'}
                </Typography>
              }
            />
          </ListItem>
        </>
      )}
    </DetailsList>
  );

  return (
    <>
      <StyledAlert
        severity={getSeverity()}
        action={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<RestoreIcon />}
              onClick={onRestore}
              disabled={isAutoSaving}
            >
              復元
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={handleClearConfirm}
              disabled={isAutoSaving}
            >
              削除
            </Button>
            {showDetails && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                disabled={isAutoSaving}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={handleDismiss}
              disabled={isAutoSaving}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        }
      >
        <AlertTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getTitle()}
            {isAutoSaving && (
              <Chip 
                label="保存中" 
                size="small" 
                color="info" 
                variant="filled"
              />
            )}
          </Box>
        </AlertTitle>
        
        <Typography variant="body2">
          {getDescription()}
        </Typography>

        {completionRate > 0 && (
          <ProgressContainer>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                フォーム完了率:
              </Typography>
              <LinearProgress
                variant="determinate"
                value={completionRate}
                sx={{ flexGrow: 1, height: 4, borderRadius: 2 }}
                color={getSeverity() as any}
              />
              <Typography variant="caption" color="text.secondary">
                {completionRate}%
              </Typography>
            </Box>
          </ProgressContainer>
        )}

        <Collapse in={expanded && showDetails}>
          {renderDetails()}
        </Collapse>
      </StyledAlert>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            一時保存データの削除
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography gutterBottom>
            一時保存されたフォームデータを削除してもよろしいですか？
          </Typography>
          <Typography variant="body2" color="text.secondary">
            この操作は取り消すことができません。削除後は入力内容を復元することはできなくなります。
          </Typography>
          
          {tempData && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                削除対象のデータ:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • 最終更新: {lastModified.toLocaleString('ja-JP')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • 完了率: {completionRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • ステップ: {tempData.metadata.step}/{tempData.metadata.totalSteps}
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleClearExecute}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TempSaveAlert;