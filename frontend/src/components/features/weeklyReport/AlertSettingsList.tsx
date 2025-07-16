import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { AlertSettings } from '@/types/admin/alert';
import { useAlertSettings } from '@/hooks/admin/useAlertSettings';
import { CommonPagination } from '@/components/common';
import { SectionLoader } from '@/components/common';
import { usePermission, PermissionGate, Permission } from '@/hooks/common/usePermission';

interface AlertSettingsListProps {
  onEdit: (alertSettings: AlertSettings) => void;
  onCreate: () => void;
}

export const AlertSettingsList: React.FC<AlertSettingsListProps> = ({
  onEdit,
  onCreate,
}) => {
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSettings, setSelectedSettings] = useState<AlertSettings | null>(null);
  
  const limit = 20;
  const { useAlertSettingsList, deleteAlertSettings, isDeleting } = useAlertSettings();
  const { canManageAlerts, hasPermission } = usePermission();
  
  const { data, isLoading, error } = useAlertSettingsList(page, limit);

  // 権限チェック - アラート設定を閲覧する権限がない場合
  if (!hasPermission(Permission.ALERT_SETTINGS_VIEW)) {
    return (
      <Card>
        <CardContent>
          <Typography color="error" align="center">
            アラート設定を閲覧する権限がありません
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const handleDeleteClick = (alertSettings: AlertSettings) => {
    setSelectedSettings(alertSettings);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedSettings) {
      try {
        await deleteAlertSettings(selectedSettings.id);
        setDeleteDialogOpen(false);
        setSelectedSettings(null);
      } catch (error) {
        // エラーハンドリングはuseAlertSettingsで処理済み
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedSettings(null);
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">
            アラート設定の読み込みに失敗しました
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const alertSettings = data?.settings || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Card>
        <CardHeader
          title="アラート設定一覧"
          subheader={`全 ${total} 件`}
          action={
            <PermissionGate permission={Permission.ALERT_SETTINGS_MANAGE}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onCreate}
              >
                新規作成
              </Button>
            </PermissionGate>
          }
        />
        <CardContent sx={{ p: 0 }}>
          {alertSettings.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                アラート設定がありません
              </Typography>
              <PermissionGate permission={Permission.ALERT_SETTINGS_MANAGE}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={onCreate}
                  sx={{ mt: 2 }}
                >
                  最初の設定を作成
                </Button>
              </PermissionGate>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>設定名</TableCell>
                      <TableCell align="center">状態</TableCell>
                      <TableCell align="right">週間時間上限</TableCell>
                      <TableCell align="right">変動率上限</TableCell>
                      <TableCell align="right">休日出勤上限</TableCell>
                      <TableCell align="right">月間残業上限</TableCell>
                      <TableCell>作成者</TableCell>
                      <TableCell>更新日時</TableCell>
                      <TableCell align="center">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alertSettings.map((settings) => (
                      <TableRow key={settings.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {settings.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={settings.isActive ? '有効' : '無効'}
                            color={settings.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {settings.weeklyHoursLimit}時間
                        </TableCell>
                        <TableCell align="right">
                          {settings.weeklyHoursChangeLimit}%
                        </TableCell>
                        <TableCell align="right">
                          {settings.consecutiveHolidayWorkLimit}日
                        </TableCell>
                        <TableCell align="right">
                          {settings.monthlyOvertimeLimit}時間
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {settings.creator?.name || '不明'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(settings.updatedAt), 'yyyy/MM/dd HH:mm', {
                              locale: ja,
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <PermissionGate permission={Permission.ALERT_SETTINGS_MANAGE}>
                              <Tooltip title="編集">
                                <IconButton
                                  size="small"
                                  onClick={() => onEdit(settings)}
                                  color="primary"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="削除">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteClick(settings)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </PermissionGate>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* ページネーション */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CommonPagination
                    page={page}
                    count={totalPages}
                    onPageChange={setPage}
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          アラート設定の削除
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            「{selectedSettings?.name}」を削除してもよろしいですか？
            <br />
            この操作は取り消すことができません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            キャンセル
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};