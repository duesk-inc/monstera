'use client';

import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Tabs, Tab, Alert } from '@mui/material';
import { Add, CalendarMonth, ViewList, Sync } from '@mui/icons-material';

import { SalesLayout } from '@/components/features/sales/layout/SalesLayout';
import { InterviewCalendar } from '@/components/features/sales/interview/InterviewCalendar';
import { InterviewDialog } from '@/components/features/sales/interview/InterviewDialog';
import { SPACING } from '@/constants/dimensions';
import { useToast } from '@/components/common/Toast';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { interviewApi } from '@/lib/api/sales';
import type { InterviewSchedule, ConflictCheckResult } from '@/types/sales';

/**
 * 面談管理ページ
 */
export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<InterviewSchedule | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('view');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const { showSuccess, showError } = useToast();
  const { handleSubmissionError } = useErrorHandler();

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    try {
      setIsLoading(true);
      const response = await interviewApi.getList({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      });
      setInterviews(response.items || []);
    } catch (error) {
      handleSubmissionError(error, '面談一覧取得');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleInterviewClick = (interview: InterviewSchedule) => {
    setSelectedInterview(interview);
    setDialogMode('view');
    setShowDialog(true);
  };

  const handleCreateInterview = (date?: Date) => {
    setSelectedInterview(null);
    setSelectedDate(date || new Date());
    setDialogMode('create');
    setShowDialog(true);
  };

  const handleEditInterview = (interview: InterviewSchedule) => {
    setSelectedInterview(interview);
    setDialogMode('edit');
    setShowDialog(true);
  };

  const handleInterviewSave = async (data: any) => {
    try {
      if (dialogMode === 'create') {
        await interviewApi.create(data);
        showSuccess('面談を作成しました');
      } else {
        await interviewApi.update(selectedInterview!.id, data);
        showSuccess('面談を更新しました');
      }
      
      setShowDialog(false);
      setSelectedInterview(null);
      setSelectedDate(null);
      loadInterviews();
    } catch (error) {
      handleSubmissionError(error, dialogMode === 'create' ? '面談作成' : '面談更新');
    }
  };

  const handleInterviewDelete = async (id: string) => {
    if (!confirm('この面談を削除してもよろしいですか？')) {
      return;
    }

    try {
      await interviewApi.delete(id);
      showSuccess('面談を削除しました');
      setShowDialog(false);
      setSelectedInterview(null);
      loadInterviews();
    } catch (error) {
      handleSubmissionError(error, '面談削除');
    }
  };

  const handleConflictCheck = async (data: any): Promise<ConflictCheckResult> => {
    try {
      return await interviewApi.checkConflicts(data);
    } catch (error) {
      console.error('Conflict check failed:', error);
      return { hasConflict: false, conflicts: [] };
    }
  };

  const handleRefresh = () => {
    loadInterviews();
  };

  const upcomingInterviews = interviews.filter(interview => {
    const scheduledDate = new Date(interview.scheduledDate);
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return scheduledDate >= now && scheduledDate <= oneWeekFromNow;
  });

  const pendingInterviews = interviews.filter(interview => 
    interview.status === 'scheduled'
  );

  return (
    <SalesLayout
      title="面談管理"
      subtitle="エンジニア面談のスケジュール管理・進捗追跡"
      actions={
        <Box sx={{ display: 'flex', gap: SPACING.sm }}>
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            更新
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleCreateInterview()}
          >
            面談追加
          </Button>
        </Box>
      }
    >
      {/* 統計情報 */}
      <Box sx={{ mb: SPACING.lg }}>
        <Alert 
          severity={upcomingInterviews.length > 0 ? "info" : "success"}
          sx={{ mb: SPACING.md }}
        >
          今週の面談予定: {upcomingInterviews.length}件
          {pendingInterviews.length > 0 && `, 調整中: ${pendingInterviews.length}件`}
        </Alert>
      </Box>

      {/* 表示モード切り替え */}
      <Box sx={{ mb: SPACING.lg }}>
        <Tabs 
          value={viewMode} 
          onChange={(_, newValue) => setViewMode(newValue)}
        >
          <Tab 
            icon={<CalendarMonth />} 
            label="カレンダー表示" 
            value="calendar" 
          />
          <Tab 
            icon={<ViewList />} 
            label="リスト表示" 
            value="list" 
          />
        </Tabs>
      </Box>

      {/* コンテンツエリア */}
      {viewMode === 'calendar' ? (
        <InterviewCalendar
          interviews={interviews}
          isLoading={isLoading}
          onDateClick={handleDateClick}
          onInterviewClick={handleInterviewClick}
          onCreateInterview={handleCreateInterview}
        />
      ) : (
        <Box>
          {/* リスト表示は後で実装 */}
          <Typography variant="body1" color="textSecondary">
            リスト表示は準備中です
          </Typography>
        </Box>
      )}

      {/* 面談詳細・編集ダイアログ */}
      <InterviewDialog
        open={showDialog}
        interview={selectedInterview || undefined}
        isEdit={dialogMode === 'edit'}
        initialDate={selectedDate || undefined}
        onClose={() => {
          setShowDialog(false);
          setSelectedInterview(null);
          setSelectedDate(null);
        }}
        onSave={handleInterviewSave}
        onDelete={handleInterviewDelete}
        onConflictCheck={handleConflictCheck}
        isLoading={false}
      />
    </SalesLayout>
  );
}