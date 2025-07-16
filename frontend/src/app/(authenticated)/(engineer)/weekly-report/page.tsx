'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  FormHelperText,
  Stack,
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
  CalendarToday as CalendarTodayIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';

// 共通コンポーネントをインポート
import ActionButton from '@/components/common/ActionButton';
import { StatusChip, type ApplicationStatus, ConfirmDialog, FormDialog, useToast, PageContainer, PageHeader } from '@/components/common';

// 機能コンポーネントをインポート
import WeekSelector from '@/components/features/weeklyReport/WeekSelector';
import DailyRecordAccordion from '@/components/features/weeklyReport/DailyRecordAccordion';
import WeeklyWorkSummary from '@/components/features/weeklyReport/WeeklyWorkSummary';
import WeeklyReportContainer from '@/components/features/weeklyReport/WeeklyReportContainer';

// カスタムフックをインポート
import { useWeeklyReport } from '@/hooks/weeklyReport/useWeeklyReport';
import { useDefaultSettings } from '@/hooks/weeklyReport/useDefaultSettings';
import { useDailyRecords } from '@/hooks/weeklyReport/useDailyRecords';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';

// 定数をインポート
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';
import { WeeklyReportMoodType } from '@/constants/weeklyMood';
import { SUCCESS_MESSAGES } from '@/constants/errorMessages';

// ユーティリティをインポート
import { generateCurrentAndPreviousMonthWeeks, getDayOfWeek } from '@/utils/dateUtils';
import { LoadingOverlay } from '@/components/common';
import { DEFAULT_WORK_TIME } from '@/constants/defaultWorkTime';

export default function WeeklyReport() {
  // 統一Toastシステムを使用
  const { showSuccess } = useToast();
  
  // エラーハンドリングフックを使用
  const { handleError } = useEnhancedErrorHandler();
  
  // デフォルト設定フックを先に呼び出す
  const {
    defaultSettings,
    loading: defaultSettingsLoading,
    // error: defaultSettingsError,
    loadDefaultSettings,
    saveDefaultSettings,
    handleDefaultSettingChange,
    isDataLoaded
  } = useDefaultSettings();

  // カスタムフックを使用（デフォルト設定を渡す）
  const {
    report,
    loading,
    errors,
    totalHours,
    clientTotalHours,
    setReport,
    loadWeeklyReport,
    handleSelectCurrentWeek,
    handleSelectPreviousWeek,
    handleSelectNextWeek,
    handleWeekSelect,
    handleSaveDraft,
    handleSubmit,
    validateForm,
    isSubmitted,
    isDraft,
    forceApplyDefaultSettingsToCurrentReport
  } = useWeeklyReport(defaultSettings);

  const {
    handleDailyRecordChange,
    handleTimeChange,
    handleBreakTimeChange,
    handleHolidayWorkToggle,
    handleClientDailyRecordChange,
    handleClientBreakTimeChange,
    applyBulkSettings
  } = useDailyRecords();

  // ローカルステート
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openDefaultSettingsDialog, setOpenDefaultSettingsDialog] = useState(false);
  const [openBulkSettingDialog, setOpenBulkSettingDialog] = useState(false);
  const [expandedDays, setExpandedDays] = useState<{[key: string]: boolean}>({});
  const [availableWeeks, setAvailableWeeks] = useState<{ startDate: Date; endDate: Date }[]>([]);
  const [bulkSettings, setBulkSettings] = useState({
    startTime: DEFAULT_WORK_TIME.START,
    endTime: DEFAULT_WORK_TIME.END,
    breakTime: DEFAULT_WORK_TIME.BREAK,
    remarks: '',
  });
  
  // 週のリストを生成
  useEffect(() => {
    const weeksInMonths = generateCurrentAndPreviousMonthWeeks();
    setAvailableWeeks(weeksInMonths);
  }, []);

  // 週報の提出をラップする関数
  const handleSubmitReport = async () => {
    await handleSubmit();
    // 提出が完了したら常にモーダルを閉じる
    setOpenSubmitDialog(false);
  };
  
  // 週報の下書き保存をラップする関数
  const handleSaveDraftReport = async () => {
    await handleSaveDraft();
    // 下書き保存が完了したら常にモーダルを閉じる
    setOpenSaveDialog(false);
  };
  
  // 初期データの読み込み
  useEffect(() => {
    // デフォルト設定を読み込む
    loadDefaultSettings();
  }, [loadDefaultSettings]);
  
  // デフォルト設定が読み込まれた後に週報を読み込む
  useEffect(() => {
    // APIからデフォルト設定が読み込まれていて、週報がまだ読み込まれていない場合
    if (isDataLoaded && !report.id && report.dailyRecords.length === 0) {
      loadWeeklyReport();
    }
  }, [isDataLoaded, report.id, report.dailyRecords.length, loadWeeklyReport]);

  // このuseEffectは削除 - デフォルト設定の適用は週報データ生成時に行われるべき

  // 一括設定適用ハンドラー
  const handleApplyBulkSettings = () => {
    // 新しい日々の記録を作成
    const updatedDailyRecords = applyBulkSettings(
      report.dailyRecords,
      bulkSettings
    );

    // 週報を更新
    setReport({
      ...report,
      dailyRecords: updatedDailyRecords,
    });

    // ダイアログを閉じる
    setOpenBulkSettingDialog(false);
    
    // 統一Toastシステムで成功メッセージを表示
    showSuccess(SUCCESS_MESSAGES.BULK_WORK_TIME_SET);
  };

  // アコーディオン展開状態の切り替え
  const handleToggleAccordion = (dateStr: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  // 週報の保存前にダイアログを表示
  const handleOpenSaveDialog = () => {
    if (validateForm()) {
      setOpenSaveDialog(true);
    }
  };

  // 週報の提出前にダイアログを表示
  const handleOpenSubmitDialog = () => {
    if (validateForm()) {
      setOpenSubmitDialog(true);
    }
  };

  // 気分選択ハンドラー
  const handleMoodChange = (mood: WeeklyReportMoodType) => {
    if (!isSubmitted(report.status)) {
      setReport({
        ...report,
        mood,
      });
    }
  };

  // デフォルト設定を保存する
  const handleSaveDefaultSettings = () => {
    saveDefaultSettings(defaultSettings).then((success) => {
      if (success) {
        // 現在表示中の週報が未提出の場合、デフォルト設定を強制適用
        if (!isSubmitted(report.status) && !isDraft(report.status)) {
          forceApplyDefaultSettingsToCurrentReport(defaultSettings);
          showSuccess(SUCCESS_MESSAGES.DEFAULT_SETTINGS_SAVED);
        } else {
          showSuccess(SUCCESS_MESSAGES.DEFAULT_SETTINGS_SAVED);
        }
        
        // ダイアログを閉じる
        setOpenDefaultSettingsDialog(false);
      }
    });
  };

  // 日別レコードの更新を処理する
  const handleUpdateDailyRecord = (index: number, field: keyof typeof report.dailyRecords[0], value: string) => {
    const updatedRecords = handleDailyRecordChange(
      report.dailyRecords,
      index,
      field,
      value
    );
    
    setReport({
      ...report,
      dailyRecords: updatedRecords,
    });
  };

  // 日別レコードの時間変更を処理する
  const handleUpdateTimeChange = (index: number, field: 'startTime' | 'endTime', time: Date | null) => {
    const updatedRecords = handleTimeChange(
      report.dailyRecords,
      index,
      field,
      time
    );
    
    setReport({
      ...report,
      dailyRecords: updatedRecords,
    });
  };

  // 日別レコードの休憩時間変更を処理する
  const handleUpdateBreakTimeChange = (index: number, value: string) => {
    const updatedRecords = handleBreakTimeChange(
      report.dailyRecords,
      index,
      value
    );
    
    setReport({
      ...report,
      dailyRecords: updatedRecords,
    });
  };

  // 休日出勤トグルを処理する
  const handleUpdateHolidayWorkToggle = (index: number) => {
    // 下書き状態の場合はデフォルト設定を適用しない
    const settingsToApply = isDraft(report.status) ? {
      ...defaultSettings,
      weekdayStart: '',
      weekdayEnd: '',
      weekdayBreak: 0
    } : defaultSettings;
    
    const updatedRecords = handleHolidayWorkToggle(
      report.dailyRecords,
      index,
      settingsToApply
    );
    
    setReport({
      ...report,
      dailyRecords: updatedRecords,
    });
  };

  // 客先勤怠フィールドの変更を処理する
  const handleUpdateClientDailyRecord = (index: number, field: 'clientStartTime' | 'clientEndTime' | 'hasClientWork', value: boolean | string) => {
    // 下書き状態の場合はデフォルト設定を適用しない
    const settingsToApply = isDraft(report.status) ? {
      ...defaultSettings,
      weekdayStart: '',
      weekdayEnd: '',
      weekdayBreak: 0
    } : defaultSettings;
    
    const updatedRecords = handleClientDailyRecordChange(
      report.dailyRecords,
      index,
      field,
      value,
      settingsToApply
    );
    
    setReport({
      ...report,
      dailyRecords: updatedRecords,
    });
  };

  // 客先休憩時間の変更を処理する
  const handleUpdateClientBreakTimeChange = (index: number, value: string) => {
    const updatedRecords = handleClientBreakTimeChange(
      report.dailyRecords,
      index,
      value
    );
    
    setReport({
      ...report,
      dailyRecords: updatedRecords,
    });
  };

  // 週報ステータスをApplicationStatus型に変換する関数
  const convertWeeklyStatusToApplicationStatus = (status: string | undefined): ApplicationStatus => {
    switch (status) {
      case WEEKLY_REPORT_STATUS.NOT_SUBMITTED:
        return 'not_submitted';
      case WEEKLY_REPORT_STATUS.DRAFT:
        return 'draft';
      case WEEKLY_REPORT_STATUS.SUBMITTED:
        return 'submitted';
      case WEEKLY_REPORT_STATUS.APPROVED:
        return 'approved';
      case WEEKLY_REPORT_STATUS.REJECTED:
        return 'rejected';
      default:
        return 'not_submitted';
    }
  };

  return (
    <PageContainer>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
        <PageHeader 
          title="週報"
          actions={
            <Box sx={{ display: 'flex', gap: 2 }}>
              <ActionButton
                buttonType="save"
                icon={<SaveIcon />}
                onClick={handleOpenSaveDialog}
                disabled={loading || isSubmitted(report.status)}
              >
                下書き保存
              </ActionButton>
              <ActionButton
                buttonType="submit"
                icon={<SendIcon />}
                onClick={handleOpenSubmitDialog}
                disabled={loading || isSubmitted(report.status)}
              >
                提出する
              </ActionButton>
            </Box>
          }
        />
            
        {/* メインコンテンツ */}
        <Stack spacing={3}>
          {/* 報告期間と設定 */}
          <WeeklyWorkSummary
            totalHours={totalHours}
            clientTotalHours={clientTotalHours}
            isSubmitted={isSubmitted(report.status)}
            loading={loading}
            onBulkSettings={() => {
              // 一括設定ダイアログを開く時に、デフォルト設定の値を設定
              setBulkSettings({
                startTime: defaultSettings.weekdayStart,
                endTime: defaultSettings.weekdayEnd,
                breakTime: defaultSettings.weekdayBreak,
                remarks: bulkSettings.remarks // 備考は既存の値を維持
              });
              setOpenBulkSettingDialog(true);
            }}
            onDefaultSettings={() => setOpenDefaultSettingsDialog(true)}
          />

          {/* 週選択部分 */}
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)', bgcolor: '#fafafa' }}>
            <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarTodayIcon sx={{ mr: 1, color: 'primary.main' }} />
                  週報の提出
                </Typography>
                
                {/* 提出状況表示 */}
                <StatusChip
                  status={convertWeeklyStatusToApplicationStatus(report.status)}
                />
              </Box>
              
              {/* ヘッダーコンテンツ */}
              <WeekSelector
                currentStartDate={report.startDate}
                currentEndDate={report.endDate}
                availableWeeks={availableWeeks}
                onWeekSelect={(startStr, endStr) => handleWeekSelect(startStr, endStr)}
                onSelectPreviousWeek={() => handleSelectPreviousWeek()}
                onSelectCurrentWeek={() => handleSelectCurrentWeek()}
                onSelectNextWeek={() => handleSelectNextWeek()}
                disabled={loading}
              />
            </Box>
          </Paper>

          {/* 日ごとの稼働記録 */}
          {report.dailyRecords.map((record, index) => {
            const day = new Date(record.date);
            const dayOfWeek = getDayOfWeek(day);
            const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
            
            return (
              <DailyRecordAccordion
                key={record.date}
                date={day}
                dayOfWeek={dayOfWeek}
                isWeekend={isWeekend}
                record={record}
                recordIndex={index}
                isExpanded={expandedDays[record.date] || false}
                isSubmitted={isSubmitted(report.status)}
                onToggleExpand={() => handleToggleAccordion(record.date)}
                onHolidayWorkToggle={() => handleUpdateHolidayWorkToggle(index)}
                onClientWorkToggle={(checked) => handleUpdateClientDailyRecord(index, 'hasClientWork', checked)}
                onTimeChange={(field, time) => handleUpdateTimeChange(index, field, time)}
                onClientTimeChange={(field, time) => {
                  if (!time) return;
                  const timeString = format(time, 'HH:mm');
                  handleUpdateClientDailyRecord(index, field, timeString);
                }}
                onBreakTimeChange={(value) => handleUpdateBreakTimeChange(index, value)}
                onClientBreakTimeChange={(value) => handleUpdateClientBreakTimeChange(index, value)}
                onRemarksChange={(value) => handleUpdateDailyRecord(index, 'remarks', value)}
              />
            );
          })}

          {/* 週間総括 */}
          <WeeklyReportContainer
            mood={report.mood}
            weeklyRemarks={report.weeklyRemarks}
            weeklyRemarksError={errors.weeklyRemarks}
            isSubmitted={isSubmitted(report.status)}
            loading={loading}
            onMoodChange={handleMoodChange}
            onWeeklyRemarksChange={(value) => setReport({ ...report, weeklyRemarks: value })}
            onSave={handleOpenSaveDialog}
            onSubmit={handleOpenSubmitDialog}
          />

          {/* 送信ボタン（モバイル用） - PCサイズでは非表示 */}
          <Box sx={{ display: { sm: 'none' } }}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <ActionButton
                buttonType="save"
                icon={<SaveIcon />}
                onClick={handleOpenSaveDialog}
                disabled={loading || isSubmitted(report.status)}
                fullWidth
              >
                下書き保存
              </ActionButton>
              <ActionButton
                buttonType="submit"
                icon={<SendIcon />}
                onClick={handleOpenSubmitDialog}
                disabled={loading || isSubmitted(report.status)}
                fullWidth
              >
                提出する
              </ActionButton>
            </Box>
          </Box>
        </Stack>

        {/* 下書き保存ダイアログ */}
        <ConfirmDialog
          open={openSaveDialog}
          onConfirm={handleSaveDraftReport}
          onCancel={() => setOpenSaveDialog(false)}
          title="下書きとして保存"
          message="入力内容を下書きとして保存しますか？保存後も引き続き編集可能です。"
          confirmText="保存する"
          cancelText="キャンセル"
          loading={loading}
        />

        {/* 提出ダイアログ */}
        <ConfirmDialog
          open={openSubmitDialog}
          onConfirm={handleSubmitReport}
          onCancel={() => setOpenSubmitDialog(false)}
          title="週報を提出"
          message="週報を提出しますか？提出後は編集ができなくなります。"
          confirmText="提出する"
          cancelText="キャンセル"
          loading={loading}
        />

        {/* 一括設定ダイアログ */}
        <FormDialog
          open={openBulkSettingDialog}
          onClose={() => setOpenBulkSettingDialog(false)}
          onSubmit={handleApplyBulkSettings}
          title="一括設定"
          icon={<SettingsIcon />}
          submitText="一括設定を適用"
          submitButtonType="submit"
          maxWidth="sm"
        >
          {/* 一括設定フォーム */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'medium', mb: 1.5 }}>
              勤務時間設定
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              平日（月〜金）の勤務時間を一括で設定します。土日は設定されません。
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {/* 出勤時間 */}
              <FormControl sx={{ minWidth: 120 }}>
                <Typography variant="caption" sx={{ mb: 0.5 }}>
                  出勤時間
                </Typography>
                <TextField
                  size="small"
                  type="time"
                  value={bulkSettings.startTime}
                  onChange={(e) => {
                    setBulkSettings(prev => ({
                      ...prev,
                      startTime: e.target.value
                    }));
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    step: 300, // 5分単位
                  }}
                />
              </FormControl>

              {/* 退勤時間 */}
              <FormControl sx={{ minWidth: 120 }}>
                <Typography variant="caption" sx={{ mb: 0.5 }}>
                  退勤時間
                </Typography>
                <TextField
                  size="small"
                  type="time"
                  value={bulkSettings.endTime}
                  onChange={(e) => {
                    setBulkSettings(prev => ({
                      ...prev,
                      endTime: e.target.value
                    }));
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    step: 300, // 5分単位
                  }}
                />
              </FormControl>

              {/* 休憩時間 */}
              <FormControl sx={{ minWidth: 120 }}>
                <Typography variant="caption" sx={{ mb: 0.5 }}>
                  休憩時間（時間）
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  value={bulkSettings.breakTime}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setBulkSettings(prev => ({
                      ...prev,
                      breakTime: isNaN(value) ? 0 : value
                    }));
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: 0,
                    step: 0.5,
                  }}
                />
              </FormControl>
            </Box>

            {/* 備考欄 */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>
                備考（任意）
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder="備考を入力（全ての日に同じ備考が設定されます）"
                value={bulkSettings.remarks}
                onChange={(e) => {
                  setBulkSettings(prev => ({
                    ...prev,
                    remarks: e.target.value
                  }));
                }}
                inputProps={{ maxLength: 200 }}
              />
              <FormHelperText>
                {`${bulkSettings.remarks.length}/200文字`}
              </FormHelperText>
            </Box>
          </Box>
        </FormDialog>

        {/* デフォルト勤務時間設定ダイアログ */}
        <FormDialog
          open={openDefaultSettingsDialog}
          onClose={() => setOpenDefaultSettingsDialog(false)}
          onSubmit={handleSaveDefaultSettings}
          title="個人勤務時間デフォルト設定"
          icon={<PersonIcon />}
          submitText="保存する"
          submitButtonType="submit"
          loading={defaultSettingsLoading}
          maxWidth="md"
        >
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
              平日共通設定
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              {/* 出勤時間 */}
              <FormControl sx={{ minWidth: 120 }}>
                <Typography variant="caption" sx={{ mb: 0.5 }}>
                  出勤時間
                </Typography>
                <TextField
                  size="small"
                  type="time"
                  value={defaultSettings.weekdayStart}
                  onChange={(e) => handleDefaultSettingChange('weekday', 'Start', e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    step: 300, // 5分単位
                  }}
                />
              </FormControl>

              {/* 退勤時間 */}
              <FormControl sx={{ minWidth: 120 }}>
                <Typography variant="caption" sx={{ mb: 0.5 }}>
                  退勤時間
                </Typography>
                <TextField
                  size="small"
                  type="time"
                  value={defaultSettings.weekdayEnd}
                  onChange={(e) => handleDefaultSettingChange('weekday', 'End', e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    step: 300, // 5分単位
                  }}
                />
              </FormControl>

              {/* 休憩時間 */}
              <FormControl sx={{ minWidth: 120 }}>
                <Typography variant="caption" sx={{ mb: 0.5 }}>
                  休憩時間（時間）
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  value={defaultSettings.weekdayBreak}
                  onChange={(e) => handleDefaultSettingChange('weekday', 'Break', e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: 0,
                    step: 0.5,
                  }}
                />
              </FormControl>
            </Box>
          </Box>
        </FormDialog>

        {/* ローディングオーバーレイ */}
        <LoadingOverlay open={loading} />
      </LocalizationProvider>
    </PageContainer>
  );
} 