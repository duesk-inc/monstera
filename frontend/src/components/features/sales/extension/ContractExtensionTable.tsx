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
  Avatar,
  Button,
  Tooltip
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Check,
  Close,
  Email,
  Visibility,
  Warning,
  Schedule
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

import { StatusChip } from '@/components/common';
import { EXTENSION_STATUS, EXTENSION_STATUS_COLORS, EXTENSION_TYPE } from '@/constants/sales';
import type { ContractExtension, ExtensionStatus } from '@/types/sales';
import { formatCurrency, formatDate } from '@/utils/formatUtils';

interface ContractExtensionTableProps {
  data: ContractExtension[];
  isLoading?: boolean;
  onRowClick?: (extension: ContractExtension) => void;
  onStatusChange?: (extension: ContractExtension, newStatus: ExtensionStatus) => void;
  onEdit?: (extension: ContractExtension) => void;
  onApprove?: (extension: ContractExtension) => void;
  onReject?: (extension: ContractExtension) => void;
  onSendReminder?: (extension: ContractExtension) => void;
}

/**
 * 契約延長管理テーブル
 */
export const ContractExtensionTable: React.FC<ContractExtensionTableProps> = ({
  data,
  isLoading = false,
  onRowClick,
  onStatusChange,
  onEdit,
  onApprove,
  onReject,
  onSendReminder
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedExtension, setSelectedExtension] = useState<ContractExtension | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, extension: ContractExtension) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedExtension(extension);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedExtension(null);
  };

  const handleMenuAction = (action: string) => {
    if (!selectedExtension) return;

    switch (action) {
      case 'edit':
        onEdit?.(selectedExtension);
        break;
      case 'approve':
        onApprove?.(selectedExtension);
        break;
      case 'reject':
        onReject?.(selectedExtension);
        break;
      case 'reminder':
        onSendReminder?.(selectedExtension);
        break;
    }
    handleMenuClose();
  };

  const handleQuickStatusChange = (extension: ContractExtension, newStatus: ExtensionStatus) => {
    onStatusChange?.(extension, newStatus);
  };

  const getQuickActions = (status: ExtensionStatus): ExtensionStatus[] => {
    switch (status) {
      case 'pending':
        return ['in_progress'];
      case 'in_progress':
        return ['approved', 'rejected'];
      default:
        return [];
    }
  };

  const canEdit = (status: ExtensionStatus) => {
    return ['pending', 'in_progress'].includes(status);
  };

  const canApprove = (status: ExtensionStatus) => {
    return ['pending', 'in_progress'].includes(status);
  };

  const getUrgencyLevel = (extension: ContractExtension) => {
    if (!extension.deadlineDate) return 'normal';
    
    const deadline = new Date(extension.deadlineDate);
    const today = new Date();
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'urgent';
    if (diffDays <= 7) return 'warning';
    return 'normal';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
        return theme.palette.error.main;
      case 'urgent':
        return theme.palette.warning.main;
      case 'warning':
        return theme.palette.info.main;
      default:
        return theme.palette.text.primary;
    }
  };

  if (isLoading) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>エンジニア</TableCell>
              <TableCell>現在単価</TableCell>
              <TableCell>延長期間</TableCell>
              <TableCell>延長単価</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>期限</TableCell>
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
          契約延長データがありません
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          新しい延長確認を作成してください
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>エンジニア</TableCell>
              <TableCell>現在単価</TableCell>
              <TableCell>延長期間</TableCell>
              <TableCell>延長単価</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>期限</TableCell>
              <TableCell>担当者</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((extension) => {
              const urgency = getUrgencyLevel(extension);
              const urgencyColor = getUrgencyColor(urgency);

              return (
                <TableRow
                  key={extension.id}
                  hover
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    },
                    backgroundColor: urgency === 'overdue' 
                      ? theme.palette.error.light + '20'
                      : urgency === 'urgent'
                      ? theme.palette.warning.light + '20'
                      : 'inherit'
                  }}
                  onClick={() => onRowClick?.(extension)}
                >
                  {/* エンジニア */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ width: 32, height: 32, mr: 1, fontSize: '0.875rem' }}>
                        {extension.engineerName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" noWrap>
                          {extension.engineerName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {extension.currentClientName}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* 現在単価 */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(extension.currentRate)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {extension.currentRateType}
                    </Typography>
                  </TableCell>

                  {/* 延長期間 */}
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {formatDate(extension.extensionStartDate)} -
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(extension.extensionEndDate)}
                      </Typography>
                      <Chip
                        label={EXTENSION_TYPE[extension.extensionType]}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </TableCell>

                  {/* 延長単価 */}
                  <TableCell>
                    {extension.proposedRate ? (
                      <>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(extension.proposedRate)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {extension.proposedRateType}
                        </Typography>
                        {extension.proposedRate !== extension.currentRate && (
                          <Typography 
                            variant="caption" 
                            color={extension.proposedRate > extension.currentRate ? 'success.main' : 'error.main'}
                            display="block"
                          >
                            {extension.proposedRate > extension.currentRate ? '+' : ''}
                            {formatCurrency(extension.proposedRate - extension.currentRate)}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        未設定
                      </Typography>
                    )}
                  </TableCell>

                  {/* ステータス */}
                  <TableCell>
                    <StatusChip
                      status={extension.status}
                      statusLabels={EXTENSION_STATUS}
                      statusColors={EXTENSION_STATUS_COLORS}
                      size="small"
                    />
                    
                    {/* クイックアクション */}
                    <Box sx={{ mt: 0.5 }}>
                      {getQuickActions(extension.status).map((nextStatus) => (
                        <Button
                          key={nextStatus}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            mr: 0.5, 
                            mb: 0.5,
                            minWidth: 'auto',
                            fontSize: '0.625rem',
                            py: 0.25,
                            px: 0.5
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickStatusChange(extension, nextStatus);
                          }}
                        >
                          {EXTENSION_STATUS[nextStatus]}
                        </Button>
                      ))}
                    </Box>
                  </TableCell>

                  {/* 期限 */}
                  <TableCell>
                    {extension.deadlineDate ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {urgency !== 'normal' && (
                          <Warning 
                            sx={{ 
                              fontSize: '1rem', 
                              color: urgencyColor,
                              mr: 0.5 
                            }} 
                          />
                        )}
                        <Typography 
                          variant="body2"
                          sx={{ color: urgencyColor }}
                        >
                          {formatDate(extension.deadlineDate)}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        未設定
                      </Typography>
                    )}
                  </TableCell>

                  {/* 担当者 */}
                  <TableCell>
                    {extension.assignedTo ? (
                      <Typography variant="body2">
                        {extension.assignedTo}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        未割当
                      </Typography>
                    )}
                  </TableCell>

                  {/* 操作 */}
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, extension)}
                    >
                      <MoreVert />
                    </IconButton>
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
        <MenuItem onClick={() => onRowClick?.(selectedExtension!)}>
          <Visibility sx={{ mr: 1 }} />
          詳細表示
        </MenuItem>
        
        {selectedExtension && canEdit(selectedExtension.status) && (
          <MenuItem onClick={() => handleMenuAction('edit')}>
            <Edit sx={{ mr: 1 }} />
            編集
          </MenuItem>
        )}
        
        {selectedExtension && canApprove(selectedExtension.status) && (
          <>
            <MenuItem onClick={() => handleMenuAction('approve')}>
              <Check sx={{ mr: 1 }} />
              承認
            </MenuItem>
            <MenuItem onClick={() => handleMenuAction('reject')}>
              <Close sx={{ mr: 1 }} />
              却下
            </MenuItem>
          </>
        )}
        
        <MenuItem onClick={() => handleMenuAction('reminder')}>
          <Email sx={{ mr: 1 }} />
          リマインダー送信
        </MenuItem>
      </Menu>
    </>
  );
};