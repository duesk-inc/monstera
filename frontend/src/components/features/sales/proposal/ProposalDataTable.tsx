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
  Tooltip,
  Button
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Delete,
  Email,
  Event,
  Visibility
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

import { StatusChip } from '@/components/common';
import { PROPOSAL_STATUS, PROPOSAL_STATUS_COLORS, AMOUNT_TYPE } from '@/constants/sales';
import type { Proposal, ProposalStatus } from '@/types/sales';
import { formatCurrency, formatDate } from '@/utils/formatUtils';

interface ProposalDataTableProps {
  data: Proposal[];
  isLoading?: boolean;
  onRowClick?: (proposal: Proposal) => void;
  onStatusChange?: (proposal: Proposal, newStatus: ProposalStatus) => void;
  onEdit?: (proposal: Proposal) => void;
  onDelete?: (proposal: Proposal) => void;
  onSendEmail?: (proposal: Proposal) => void;
  onScheduleInterview?: (proposal: Proposal) => void;
}

/**
 * 提案一覧データテーブル
 */
export const ProposalDataTable: React.FC<ProposalDataTableProps> = ({
  data,
  isLoading = false,
  onRowClick,
  onStatusChange,
  onEdit,
  onDelete,
  onSendEmail,
  onScheduleInterview
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, proposal: Proposal) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedProposal(proposal);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProposal(null);
  };

  const handleMenuAction = (action: string) => {
    if (!selectedProposal) return;

    switch (action) {
      case 'edit':
        onEdit?.(selectedProposal);
        break;
      case 'delete':
        onDelete?.(selectedProposal);
        break;
      case 'email':
        onSendEmail?.(selectedProposal);
        break;
      case 'interview':
        onScheduleInterview?.(selectedProposal);
        break;
    }
    handleMenuClose();
  };

  const handleStatusClick = (proposal: Proposal, newStatus: ProposalStatus) => {
    onStatusChange?.(proposal, newStatus);
  };

  const getStatusActions = (status: ProposalStatus): ProposalStatus[] => {
    switch (status) {
      case 'draft':
        return ['pending'];
      case 'pending':
        return ['in_interview', 'rejected', 'cancelled'];
      case 'in_interview':
        return ['accepted', 'rejected'];
      default:
        return [];
    }
  };

  const canEdit = (status: ProposalStatus) => {
    return ['draft', 'pending', 'in_interview'].includes(status);
  };

  const canDelete = (status: ProposalStatus) => {
    return ['draft'].includes(status);
  };

  if (isLoading) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>エンジニア</TableCell>
              <TableCell>クライアント</TableCell>
              <TableCell>提案金額</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>提案日</TableCell>
              <TableCell>回答期限</TableCell>
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
          提案データがありません
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          新しい提案を作成してください
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
              <TableCell>クライアント</TableCell>
              <TableCell>提案金額</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>提案日</TableCell>
              <TableCell>回答期限</TableCell>
              <TableCell>面談日</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((proposal) => (
              <TableRow
                key={proposal.id}
                hover
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover
                  }
                }}
                onClick={() => onRowClick?.(proposal)}
              >
                {/* エンジニア */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ width: 32, height: 32, mr: 1, fontSize: '0.875rem' }}>
                      {proposal.engineerName.charAt(0)}
                    </Avatar>
                    <Typography variant="body2" noWrap>
                      {proposal.engineerName}
                    </Typography>
                  </Box>
                </TableCell>

                {/* クライアント */}
                <TableCell>
                  <Typography variant="body2" noWrap>
                    {proposal.clientName}
                  </Typography>
                  {proposal.projectName && (
                    <Typography variant="caption" color="textSecondary" display="block">
                      {proposal.projectName}
                    </Typography>
                  )}
                </TableCell>

                {/* 提案金額 */}
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(proposal.proposalAmount)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {AMOUNT_TYPE[proposal.amountType]}
                  </Typography>
                </TableCell>

                {/* ステータス */}
                <TableCell>
                  <StatusChip
                    status={proposal.status}
                    statusLabels={PROPOSAL_STATUS}
                    statusColors={PROPOSAL_STATUS_COLORS}
                    size="small"
                  />
                  
                  {/* ステータス変更ボタン */}
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusActions(proposal.status).map((nextStatus) => (
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
                          handleStatusClick(proposal, nextStatus);
                        }}
                      >
                        {PROPOSAL_STATUS[nextStatus]}
                      </Button>
                    ))}
                  </Box>
                </TableCell>

                {/* 提案日 */}
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(proposal.proposalDate)}
                  </Typography>
                </TableCell>

                {/* 回答期限 */}
                <TableCell>
                  {proposal.responseDeadline ? (
                    <Typography 
                      variant="body2"
                      color={
                        new Date(proposal.responseDeadline) < new Date() 
                          ? 'error' 
                          : 'textPrimary'
                      }
                    >
                      {formatDate(proposal.responseDeadline)}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      未設定
                    </Typography>
                  )}
                </TableCell>

                {/* 面談日 */}
                <TableCell>
                  {proposal.interviewDate ? (
                    <Typography variant="body2">
                      {formatDate(proposal.interviewDate)}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      未設定
                    </Typography>
                  )}
                </TableCell>

                {/* 操作 */}
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, proposal)}
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 操作メニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => onRowClick?.(selectedProposal!)}>
          <Visibility sx={{ mr: 1 }} />
          詳細表示
        </MenuItem>
        
        {selectedProposal && canEdit(selectedProposal.status) && (
          <MenuItem onClick={() => handleMenuAction('edit')}>
            <Edit sx={{ mr: 1 }} />
            編集
          </MenuItem>
        )}
        
        <MenuItem onClick={() => handleMenuAction('email')}>
          <Email sx={{ mr: 1 }} />
          メール送信
        </MenuItem>
        
        {selectedProposal && ['pending', 'in_interview'].includes(selectedProposal.status) && (
          <MenuItem onClick={() => handleMenuAction('interview')}>
            <Event sx={{ mr: 1 }} />
            面談予定
          </MenuItem>
        )}
        
        {selectedProposal && canDelete(selectedProposal.status) && (
          <MenuItem onClick={() => handleMenuAction('delete')}>
            <Delete sx={{ mr: 1 }} />
            削除
          </MenuItem>
        )}
      </Menu>
    </>
  );
};