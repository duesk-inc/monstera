'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Button,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  MoreVert,
  Sync,
  Edit,
  Delete,
  Launch,
  CheckCircle,
  Error,
  Warning,
  Schedule
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

import { StatusChip } from '@/components/common';
import { POC_SYNC_STATUS, POC_SYNC_STATUS_COLORS } from '@/constants/sales';
import type { PocProject, PocSyncStatus } from '@/types/sales';
import { formatDate, formatDateTime } from '@/utils/formatUtils';

interface PocProjectTableProps {
  data: PocProject[];
  isLoading?: boolean;
  onRowClick?: (project: PocProject) => void;
  onSync?: (project: PocProject) => void;
  onEdit?: (project: PocProject) => void;
  onDelete?: (project: PocProject) => void;
  onViewOriginal?: (project: PocProject) => void;
  onForceSync?: () => void;
}

/**
 * POCプロジェクト一覧テーブル
 */
export const PocProjectTable: React.FC<PocProjectTableProps> = ({
  data,
  isLoading = false,
  onRowClick,
  onSync,
  onEdit,
  onDelete,
  onViewOriginal,
  onForceSync
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<PocProject | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, project: PocProject) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedProject(project);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProject(null);
  };

  const handleMenuAction = (action: string) => {
    if (!selectedProject) return;

    switch (action) {
      case 'sync':
        onSync?.(selectedProject);
        break;
      case 'edit':
        onEdit?.(selectedProject);
        break;
      case 'delete':
        onDelete?.(selectedProject);
        break;
      case 'view_original':
        onViewOriginal?.(selectedProject);
        break;
    }
    handleMenuClose();
  };

  const getSyncStatusIcon = (status: PocSyncStatus) => {
    switch (status) {
      case 'synced':
        return <CheckCircle fontSize="small" color="success" />;
      case 'failed':
        return <Error fontSize="small" color="error" />;
      case 'pending':
        return <Schedule fontSize="small" color="info" />;
      case 'conflict':
        return <Warning fontSize="small" color="warning" />;
      default:
        return <Sync fontSize="small" />;
    }
  };

  const getSyncHealthLevel = (project: PocProject) => {
    if (!project.lastSyncDate) return 'never';
    
    const lastSync = new Date(project.lastSyncDate);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 168) return 'stale'; // 1週間以上
    if (hoursDiff > 24) return 'old'; // 1日以上
    return 'fresh';
  };

  const getSyncHealthColor = (health: string) => {
    switch (health) {
      case 'fresh':
        return theme.palette.success.main;
      case 'old':
        return theme.palette.warning.main;
      case 'stale':
        return theme.palette.error.main;
      default:
        return theme.palette.text.disabled;
    }
  };

  const canSync = (status: PocSyncStatus) => {
    return ['failed', 'conflict', 'never'].includes(status);
  };

  if (isLoading) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>プロジェクト名</TableCell>
              <TableCell>タイプ</TableCell>
              <TableCell>同期ステータス</TableCell>
              <TableCell>最終同期</TableCell>
              <TableCell>取り込み済み提案</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                <TableCell>読み込み中...</TableCell>
                <TableCell>読み込み中...</TableCell>
                <TableCell>読み込み中...</TableCell>
                <TableCell>読み込み中...</TableCell>
                <TableCell>読み込み中...</TableCell>
                <TableCell>読み込み中...</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          POCプロジェクトがありません
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          monstera-pocとの同期を実行してください
        </Typography>
        <Button
          variant="contained"
          startIcon={<Sync />}
          sx={{ mt: 2 }}
          onClick={onForceSync}
        >
          今すぐ同期
        </Button>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>プロジェクト名</TableCell>
              <TableCell>タイプ</TableCell>
              <TableCell>同期ステータス</TableCell>
              <TableCell>最終同期</TableCell>
              <TableCell>取り込み済み提案</TableCell>
              <TableCell>作成日</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((project) => {
              const syncHealth = getSyncHealthLevel(project);
              const syncHealthColor = getSyncHealthColor(syncHealth);

              return (
                <TableRow
                  key={project.id}
                  hover
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    },
                    backgroundColor: project.syncStatus === 'failed' 
                      ? theme.palette.error.light + '20'
                      : project.syncStatus === 'conflict'
                      ? theme.palette.warning.light + '20'
                      : 'inherit'
                  }}
                  onClick={() => onRowClick?.(project)}
                >
                  {/* プロジェクト名 */}
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {project.projectName}
                      </Typography>
                      {project.description && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          {project.description.substring(0, 50)}
                          {project.description.length > 50 ? '...' : ''}
                        </Typography>
                      )}
                      {project.pocProjectId && (
                        <Chip
                          label={`POC-${project.pocProjectId}`}
                          size="small"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  </TableCell>

                  {/* タイプ */}
                  <TableCell>
                    <Chip
                      label={project.projectType}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>

                  {/* 同期ステータス */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getSyncStatusIcon(project.syncStatus)}
                      <StatusChip
                        status={project.syncStatus}
                        statusLabels={POC_SYNC_STATUS}
                        statusColors={POC_SYNC_STATUS_COLORS}
                        size="small"
                      />
                    </Box>
                    
                    {project.syncStatus === 'failed' && project.errorMessage && (
                      <Tooltip title={project.errorMessage}>
                        <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                          エラー詳細を確認
                        </Typography>
                      </Tooltip>
                    )}
                  </TableCell>

                  {/* 最終同期 */}
                  <TableCell>
                    {project.lastSyncDate ? (
                      <Box>
                        <Typography 
                          variant="body2"
                          sx={{ color: syncHealthColor }}
                        >
                          {formatDateTime(project.lastSyncDate)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {syncHealth === 'fresh' && '最新'}
                          {syncHealth === 'old' && '要更新'}
                          {syncHealth === 'stale' && '要同期'}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        未同期
                      </Typography>
                    )}
                  </TableCell>

                  {/* 取り込み済み提案 */}
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {project.importedProposalsCount || 0}件
                      </Typography>
                      {project.totalProposalsCount && (
                        <>
                          <Typography variant="caption" color="textSecondary" display="block">
                            / {project.totalProposalsCount}件
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(project.importedProposalsCount || 0) / project.totalProposalsCount * 100}
                            sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                          />
                        </>
                      )}
                    </Box>
                  </TableCell>

                  {/* 作成日 */}
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(project.createdAt)}
                    </Typography>
                  </TableCell>

                  {/* 操作 */}
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {canSync(project.syncStatus) && (
                        <Tooltip title="同期実行">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSync?.(project);
                            }}
                          >
                            <Sync />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, project)}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 操作メニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => onRowClick?.(selectedProject!)}>
          <Launch sx={{ mr: 1 }} />
          詳細表示
        </MenuItem>
        
        {selectedProject && canSync(selectedProject.syncStatus) && (
          <MenuItem onClick={() => handleMenuAction('sync')}>
            <Sync sx={{ mr: 1 }} />
            同期実行
          </MenuItem>
        )}
        
        <MenuItem onClick={() => handleMenuAction('edit')}>
          <Edit sx={{ mr: 1 }} />
          編集
        </MenuItem>
        
        {selectedProject?.pocProjectId && (
          <MenuItem onClick={() => handleMenuAction('view_original')}>
            <Launch sx={{ mr: 1 }} />
            POC元データ表示
          </MenuItem>
        )}
        
        <MenuItem onClick={() => handleMenuAction('delete')}>
          <Delete sx={{ mr: 1 }} />
          削除
        </MenuItem>
      </Menu>
    </>
  );
};