'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Alert,
  Divider,
} from '@mui/material';
import {
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SentimentDissatisfied as SadIcon,
  SentimentVeryDissatisfied as VerySadIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { LowMoodUser } from '@/types/admin/weeklyReportSummary';

interface LowMoodAlertProps {
  lowMoodUsers: LowMoodUser[];
  onUserClick?: (userId: string) => void;
  maxDisplayUsers?: number;
}

export default function LowMoodAlert({
  lowMoodUsers,
  onUserClick,
  maxDisplayUsers = 5,
}: LowMoodAlertProps) {
  const [expanded, setExpanded] = useState(false);

  if (lowMoodUsers.length === 0) {
    return null;
  }

  const displayUsers = expanded ? lowMoodUsers : lowMoodUsers.slice(0, maxDisplayUsers);
  const hasMoreUsers = lowMoodUsers.length > maxDisplayUsers;

  const getMoodIcon = (mood: string, moodValue: number) => {
    if (moodValue <= 1) {
      return <VerySadIcon color="error" />;
    } else if (moodValue <= 2) {
      return <SadIcon color="warning" />;
    }
    return <SadIcon color="action" />;
  };

  const getMoodColor = (moodValue: number): 'error' | 'warning' | 'default' => {
    if (moodValue <= 1) return 'error';
    if (moodValue <= 2) return 'warning';
    return 'default';
  };

  const getSeverityLevel = (): 'error' | 'warning' => {
    const criticalUsers = lowMoodUsers.filter(user => user.moodValue <= 1).length;
    return criticalUsers > 0 ? 'error' : 'warning';
  };

  const criticalCount = lowMoodUsers.filter(user => user.moodValue <= 1).length;
  const warningCount = lowMoodUsers.filter(user => user.moodValue === 2).length;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Alert 
          severity={getSeverityLevel()} 
          sx={{ mb: 2 }}
          icon={<WarningIcon />}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            ムードが低いメンバーがいます
          </Typography>
          <Typography variant="body2">
            {criticalCount > 0 && (
              <>緊急対応が必要: {criticalCount}名　</>
            )}
            注意が必要: {warningCount}名　
            合計: {lowMoodUsers.length}名
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            フォローアップ対象者
          </Typography>
          {hasMoreUsers && (
            <Button
              size="small"
              onClick={() => setExpanded(!expanded)}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {expanded ? '折りたたむ' : `他${lowMoodUsers.length - maxDisplayUsers}名を表示`}
            </Button>
          )}
        </Box>

        <List disablePadding>
          {displayUsers.map((user, index) => (
            <React.Fragment key={user.userId}>
              <ListItem
                sx={{
                  px: 0,
                  cursor: onUserClick ? 'pointer' : 'default',
                  '&:hover': onUserClick ? {
                    backgroundColor: 'action.hover',
                    borderRadius: 1,
                  } : {},
                }}
                onClick={() => onUserClick?.(user.userId)}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'transparent' }}>
                    {getMoodIcon(user.mood, user.moodValue)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight="medium">
                        {user.userName}
                      </Typography>
                      <Chip
                        label={`ムード: ${user.mood}`}
                        size="small"
                        color={getMoodColor(user.moodValue)}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        連続{user.consecutiveWeeks}週間低ムード
                      </Typography>
                      {user.moodValue <= 1 && (
                        <Typography variant="caption" color="error.main" sx={{ fontWeight: 'bold' }}>
                          至急フォローアップが必要
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
              {index < displayUsers.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>

        <Collapse in={expanded}>
          {/* 追加のユーザーは上記のリストに含まれる */}
        </Collapse>

        {/* アクションボタン */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PersonIcon />}
            onClick={() => onUserClick?.('all')}
          >
            全員にメッセージ送信
          </Button>
          <Button
            variant="contained"
            size="small"
            color={getSeverityLevel()}
            onClick={() => {
              // フォローアップページに遷移
              window.location.href = '/admin/engineers/follow-up';
            }}
          >
            フォローアップ画面へ
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}