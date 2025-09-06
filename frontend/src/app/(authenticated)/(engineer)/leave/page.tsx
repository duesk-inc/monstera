'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import {
  Send as SendIcon,
  EventBusy as HolidayIcon,
  EventAvailable as AvailableIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Close as CloseIcon,
  Today as TodayIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  LocalizationProvider, 
  DateCalendar,
} from '@mui/x-date-pickers';
import { ja } from 'date-fns/locale';
import { format, setDefaultOptions, startOfMonth, isBefore, startOfDay } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@mui/material/styles';
import { useLeave } from '@/hooks/leave/useLeave';
import { useLeaveCalendar } from '@/hooks/leave/useLeaveCalendar';
import { CommonTabPanel, ErrorAlert, InfoAlert, useToast } from '@/components/common';
import { calculateLeaveDays } from '@/utils/leaveUtils';
import { CustomPickersDay, getConsistentDateKey } from '@/utils/calendarUtils';
import { LeaveBalanceCard } from '@/components/features/leave/LeaveBalanceCard';
import { LeaveRequestRow } from '@/components/features/leave/LeaveRequestRow';
import { EmptyRequestRow } from '@/components/features/leave/EmptyRequestRow';
import type { AttendanceFormData } from '@/hooks/leave/useLeave';
import { useSearchParams } from 'next/navigation';
import ActionButton from '@/components/common/ActionButton';
import { InfoDialog } from '@/components/common';
import { PageLoader, SectionLoader } from '@/components/common';
import { 
  PageContainer, 
  PageHeader, 
  TabContainer,
} from '@/components/common/layout';
import { useEnhancedErrorHandler } from '../../../../hooks/common/useEnhancedErrorHandler';
import { DEFAULT_WORK_TIME } from '@/constants/defaultWorkTime';

// 新規作成したコンポーネントをインポート
import LeaveTypeSelector from '@/components/features/leave/LeaveTypeSelector';
import LeaveDateCalendar from '@/components/features/leave/LeaveDateCalendar';
import LeaveTimeSelector from '@/components/features/leave/LeaveTimeSelector';
import LeaveReasonField from '@/components/features/leave/LeaveReasonField';
import LeaveUsageSummary from '@/components/features/leave/LeaveUsageSummary';

// DebugLoggerをインポート
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';
import { SUCCESS_MESSAGES, GENERAL_ERROR_MESSAGES } from '../../../../constants/errorMessages';
import { LEAVE_VALIDATION_MESSAGES } from '../../../../constants/validationMessages';

// 理由入力が必要な休暇タイプコード
const REQUIRES_REASON = ['condolence', 'special'];

// date-fnsのロケールをjaに設定
setDefaultOptions({ locale: ja });

// AttendancePageContentコンポーネントを分離
function AttendancePageContent() {
  // 統一Toastシステムを使用
  const { showSuccess, showError, showWarning } = useToast();
  
  // 新しいエラーハンドリングシステム
  const { getToastMessage, handleError } = useEnhancedErrorHandler();
  
  // 認証情報を取得
  const { user } = useAuth();
  const searchParams = useSearchParams();
  
  // ユーザーの性別を取得
  const userGender = (user as any)?.gender || 'male';
  
  // 現在の月の初日
  const firstDayOfCurrentMonth = startOfMonth(new Date());
  
  // 現在の日（過去の日付選択を防ぐため）
  const today = startOfDay(new Date());
  
  // 既に休暇申請されている日付のリスト
  const [takenLeaveDates, setTakenLeaveDates] = useState<string[]>([]);
  
  // タブ状態管理
  const [tabIndex, setTabIndex] = useState(0);
  
  // 申請確認ダイアログの状態管理
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    formData: null as AttendanceFormData | null,
    calculatedDays: 0,
  });
  
  // useLeaveフックを使用
  const {
    userLeaveBalances,
    leaveRequests,
    loadingState,
    apiErrors,
    LEAVE_TYPES,
    REMAINING_LEAVES,
    submitLeaveRequest,
    setApiErrors,
    getLeaveRequests,
    getLeaveTypeCode,
    loadInitialData
  } = useLeave({ 
    userGender 
  });
  
  // カレンダーロジックをフックに移動
  const {
    calendarMonths,
    updateCalendarMonths: updateCalendars,
    findDuplicateDates: findDuplicates,
    createDateSelectHandler
  } = useLeaveCalendar({
    initialStartDate: firstDayOfCurrentMonth,
    takenLeaveDates
  });
  
  // フォーム状態管理
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AttendanceFormData>({
    defaultValues: {
      leaveTypeId: 'paid',  // フォールバックとして'paid'を設定
      selectedDates: [], // 必ず空の配列に初期化
      isHourlyBased: false,
      startTime: DEFAULT_WORK_TIME.START_TIME,
      endTime: DEFAULT_WORK_TIME.END_TIME,
      reason: '',
    },
  });
  
  // LEAVE_TYPESが変更された場合に初期値を更新
  useEffect(() => {
    if (LEAVE_TYPES.length > 0) {
      setValue('leaveTypeId', LEAVE_TYPES[0].value);
    }
  }, [LEAVE_TYPES, setValue]);
  
  // 選択されている休暇タイプと時間単位取得フラグ
  const selectedLeaveType = watch('leaveTypeId');
  const isHourlyBased = watch('isHourlyBased');
  const selectedDates = watch('selectedDates');
  
  // 日付選択ハンドラー
  const handleDateSelect = (date: Date) => {
    const handler = createDateSelectHandler(
      selectedDates,
      (newDates) => setValue('selectedDates', newDates)
    );
    
    const result = handler(date);
    if (result.warning) {
      showWarning(result.warning);
    }
  };
  
  // 休暇申請済み日付の抽出
  const extractTakenLeaveDates = () => {
    // pendingまたはapprovedステータスの休暇申請から日付を抽出
    if (!leaveRequests || leaveRequests.length === 0) {
      return [];
    }
    
    const takenDates = new Set<string>();
    
    leaveRequests.forEach(request => {
      // rejectedステータスの申請は除外
      if (request.status === 'rejected') return;
      
      request.details.forEach(detail => {
        // YYYY-MM-DD形式の日付を追加
        takenDates.add(detail.leaveDate);
      });
    });
    
    return Array.from(takenDates);
  };
  
  // 休暇申請データの取得時に休暇申請済み日付を更新
  useEffect(() => {
    setTakenLeaveDates(extractTakenLeaveDates());
  }, [leaveRequests]);

  // URLパラメータによるタブ制御（通知からの遷移時）
  useEffect(() => {
    const fromParam = searchParams.get('from');
    const tabParam = searchParams.get('tab');
    if (fromParam === 'notification' || tabParam === 'history') {
      // 通知からの遷移時または履歴タブ指定時は申請履歴タブを表示
      setTabIndex(1);
    }
  }, [searchParams]);
  
  // 残日数が取得できるまでのローディング表示
  if (loadingState.types || loadingState.balances) {
    return <PageLoader message="休暇データを読み込み中..." fullHeight={false} />;
  }
  
  // 時間単位フラグ切替時の処理
  const handleHourlyToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue('isHourlyBased', event.target.checked);
  };
  
  // 休暇タイプ変更時の処理
  const handleLeaveTypeChange = (event: SelectChangeEvent<string>) => {
    const newType = event.target.value;
    setValue('leaveTypeId', newType);
    
    // 理由が必要ない休暇タイプの場合は理由をクリア
    const typeCode = getLeaveTypeCode(newType);
    if (!typeCode || !REQUIRES_REASON.includes(typeCode)) {
      setValue('reason', '');
    }
  };
  
  // タブ切り替え処理
  const handleTabChange = (_: React.SyntheticEvent, newValue: string | number) => {
    setTabIndex(newValue as number);
  };
  
  // エラー表示を閉じる処理
  const handleCloseError = (errorType: string) => {
    setApiErrors(prev => ({ ...prev, [errorType]: null }));
  };
  
  // フォーム送信処理（バリデーションのみ）
  const handleSubmitClick = async (formData: AttendanceFormData) => {
    try {
      // 休暇種別のコードを取得
      const leaveTypeCode = getLeaveTypeCode(formData.leaveTypeId);
      DebugLogger.debug(
        { 
          category: DEBUG_CATEGORIES.VALIDATION, 
          operation: DEBUG_OPERATIONS.VALIDATE,
          description: '休暇申請フォーム検証' 
        },
        'フォーム送信処理開始',
        { leaveTypeCode, formData }
      );
      
      // 理由必須のチェック（コードベースの判定）
      if (isReasonRequired(leaveTypeCode, formData.reason)) {
        showError(LEAVE_VALIDATION_MESSAGES.REASON_REQUIRED);
        return;
      }
      
      // 日付選択チェック
      if (formData.selectedDates.length === 0) {
        showError(LEAVE_VALIDATION_MESSAGES.START_DATE_REQUIRED);
      return;
      }
      
      // 日付の重複チェック
      const duplicateDates = findDuplicates(formData.selectedDates);
      if (duplicateDates.length > 0) {
        showError(LEAVE_VALIDATION_MESSAGES.SAME_DATE_NOT_ALLOWED);
        return;
      }
      
      // 利用日数の計算関数
      const calcDays = () => calculateLeaveDays(
        selectedDates,
        isHourlyBased,
        watch('startTime'),
        watch('endTime')
      );
      
      // 計算された日数が0以下の場合はエラー
      const totalDays = calcDays();
      if (totalDays <= 0) {
        showError(LEAVE_VALIDATION_MESSAGES.INVALID_DATE_RANGE);
        return;
      }
      
      // 残日数のチェック
      const remainingDays = REMAINING_LEAVES[formData.leaveTypeId]?.remaining || 0;
      if (totalDays > remainingDays) {
        showError(LEAVE_VALIDATION_MESSAGES.INSUFFICIENT_BALANCE);
        return;
      }
      
      // バリデーション通過後、確認ダイアログを表示
      setConfirmDialog({
        open: true,
        formData,
        calculatedDays: totalDays,
      });
      
    } catch (error) {
      DebugLogger.apiError(
        { 
          category: DEBUG_CATEGORIES.VALIDATION, 
          operation: DEBUG_OPERATIONS.VALIDATE,
          description: '休暇申請フォーム検証エラー' 
        },
        { 
          error: error as Error,
          metadata: { context: 'フォーム検証処理' }
        }
      );
      showError(GENERAL_ERROR_MESSAGES.UNKNOWN_ERROR);
    }
  };
  
  // 確認ダイアログでの実際の申請処理
  const onSubmit = async () => {
    if (!confirmDialog.formData) return;
    
    try {
      // APIリクエストの送信
      const result = await submitLeaveRequest(confirmDialog.formData, confirmDialog.calculatedDays);
      
      if (result.success) {
        handleSuccessfulSubmission();
      } else {
        // 新しいエラーハンドリングシステムを使用
        if (result.error) {
          const errorMessage = getToastMessage(result.error, '休暇申請', 'LeaveSubmission');
          if (errorMessage) {
            showError(errorMessage);
          }
        } else {
          handleSubmissionError();
        }
      }
      
      // ダイアログを閉じる
      setConfirmDialog({
        open: false,
        formData: null,
        calculatedDays: 0,
      });
      
    } catch (error) {
      DebugLogger.apiError(
        { 
          category: DEBUG_CATEGORIES.API, 
          operation: DEBUG_OPERATIONS.SUBMIT,
          description: '休暇申請送信エラー' 
        },
        { 
          error: error as Error,
          metadata: { context: '休暇申請送信処理' }
        }
      );
      
      // 新しいエラーハンドリングシステムを使用
      const errorMessage = getToastMessage(error, '休暇申請', 'LeaveSubmission');
      if (errorMessage) {
        showError(errorMessage);
      } else {
        handleSubmissionError();
      }
      
      setConfirmDialog({
        open: false,
        formData: null,
        calculatedDays: 0,
      });
    }
  };
  
  // 理由が必要かチェック
  const isReasonRequired = (typeCode: string | null, reason: string): boolean => {
    return !!typeCode && 
           REQUIRES_REASON.includes(typeCode) && 
           (!reason || !reason.trim());
  };
  
  // 申請成功時の処理
  const handleSuccessfulSubmission = async () => {
        // 成功通知（定数を使用）
        showSuccess(SUCCESS_MESSAGES.LEAVE_REQUESTED);
        
        // フォームリセット
        reset({
          leaveTypeId: 'paid',
          selectedDates: [], // リセット時も空の配列に
          isHourlyBased: false,
          startTime: DEFAULT_WORK_TIME.START_TIME,
          endTime: DEFAULT_WORK_TIME.END_TIME,
          reason: '',
        });
        
        // 履歴タブに切り替え
        setTabIndex(1);
        
        // 休暇申請済み日付リストと残日数を更新
        await getLeaveRequests();
        await loadInitialData();
        setTakenLeaveDates(extractTakenLeaveDates());
  };
  
  // 申請エラー時の処理
  const handleSubmissionError = () => {
      showError(GENERAL_ERROR_MESSAGES.UNKNOWN_ERROR);
  };
  
  // 残休暇データのマージ - APIデータを優先しつつ基本データとマージ
  const mergedLeaveBalances = LEAVE_TYPES.map(type => {
    const apiBalance = userLeaveBalances.find(b => b.leaveTypeId === type.value);
    
    // APIからのデータがあればそれを優先
    if (apiBalance) {
      return {
        id: apiBalance.id,
        leaveTypeId: apiBalance.leaveTypeId,
        name: apiBalance.leaveTypeName,
        total: apiBalance.totalDays,
        used: apiBalance.usedDays,
        remaining: apiBalance.remainingDays,
        expireDate: apiBalance.expireDate || '',
      };
    }
    
    // なければデフォルト値を使用
    return {
      id: type.value,
      leaveTypeId: type.value,
      name: type.label,
      total: 0,
      used: 0,
      remaining: 0,
      expireDate: '',
    };
  });
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <PageContainer>
        <PageHeader
          title="休暇申請"
          subtitle="休暇申請フォームから申請内容を入力してください。休暇は時間単位でも取得可能です。"
        />

        {/* 残休暇数表示 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <AvailableIcon sx={{ mr: 1 }} color="primary" />
            保有休暇日数
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {apiErrors.balances ? (
              <ErrorAlert 
                message={apiErrors.balances} 
                onClose={() => handleCloseError('balances')}
                sx={{ width: '100%' }}
              />
            ) : loadingState.balances ? (
              <SectionLoader message="残日数データを読み込み中..." size="small" />
            ) : mergedLeaveBalances.length > 0 ? (
              mergedLeaveBalances.map((balance) => (
                <LeaveBalanceCard key={balance.leaveTypeId} balance={balance} today={today} />
              ))
            ) : (
              <Typography variant="body1" color="text.secondary">
                休暇残日数データがありません
              </Typography>
            )}
          </Box>
        </Box>
        
        {/* 休暇種別データ取得エラー表示 */}
        {apiErrors.types && (
          <ErrorAlert 
            message={apiErrors.types} 
            title="休暇種別データの取得エラー"
            onClose={() => handleCloseError("types")}
            sx={{ mb: 2 }}
          />
        )}
        
        {/* 休暇申請履歴取得エラー表示 */}
        {apiErrors.requests && (
          <ErrorAlert 
            message={apiErrors.requests} 
            title="休暇申請履歴の取得エラー"
            onClose={() => handleCloseError("requests")}
            sx={{ mb: 2 }}
          />
        )}

        <TabContainer
          tabs={[
            { label: '休暇申請', value: 0 },
            { label: '申請履歴', value: 1 },
          ]}
          value={tabIndex}
          onChange={handleTabChange}
          data-testid="leave-tabs"
        >
          {/* 休暇申請フォームタブ */}
          <CommonTabPanel value={tabIndex} index={0} prefix="leave">
            <Box 
              component="form" 
              sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 2 }} 
              onSubmit={handleSubmit(handleSubmitClick)}
            >
              {/* 休暇種別選択 */}
              <LeaveTypeSelector
                selectedLeaveType={selectedLeaveType}
                isHourlyBased={isHourlyBased}
                leaveTypes={LEAVE_TYPES}
                remainingLeaves={REMAINING_LEAVES}
                isSubmitting={isSubmitting}
                errors={errors}
                onLeaveTypeChange={handleLeaveTypeChange}
                onHourlyToggle={handleHourlyToggle}
              />
              
              {/* 日付選択 - カレンダーUIに変更 */}
              <LeaveDateCalendar
                control={control}
                selectedDates={selectedDates}
                calendarMonths={calendarMonths}
                takenLeaveDates={takenLeaveDates}
                today={today}
                errors={errors}
                onDateSelect={handleDateSelect}
                onClearAll={() => {
                  // 全ての選択をクリア
                  setValue('selectedDates', []);
                  // カレンダーの選択状態をリセットするためにreferenceDate更新
                  updateCalendars('today');
                }}
                onUpdateCalendars={updateCalendars}
              />
              
              {/* 時間単位選択時のみ時間入力表示 */}
              <LeaveTimeSelector
                isHourlyBased={isHourlyBased}
                register={register}
                errors={errors}
              />
              
              {/* 理由入力（特定の休暇タイプでのみ表示） */}
              <LeaveReasonField
                isReasonRequired={Boolean(getLeaveTypeCode(selectedLeaveType) && REQUIRES_REASON.includes(getLeaveTypeCode(selectedLeaveType) || ''))}
                register={register}
                errors={errors}
              />
              
              {/* 利用日数表示 */}
              <LeaveUsageSummary
                calculatedDays={calculateLeaveDays(
                  selectedDates,
                  isHourlyBased,
                  watch('startTime'),
                  watch('endTime')
                )}
                isSubmitting={isSubmitting || loadingState.submit}
                isSubmitDisabled={false}
                onSubmit={() => {
                  // フォームのonSubmitイベントをトリガー
                  handleSubmit(handleSubmitClick)();
                }}
              />
            </Box>
          </CommonTabPanel>
          
          {/* 申請履歴タブ */}
          <CommonTabPanel value={tabIndex} index={1} prefix="leave">
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                休暇申請履歴
              </Typography>
              
              {loadingState.requests ? (
                <SectionLoader message="申請履歴を読み込み中..." size="large" />
              ) : (
              <TableContainer>
                <Table sx={{ minWidth: 650 }} aria-label="休暇申請履歴">
                  <TableHead>
                    <TableRow>
                      <TableCell>申請日</TableCell>
                      <TableCell>休暇種別</TableCell>
                      <TableCell>休暇日</TableCell>
                      <TableCell>ステータス</TableCell>
                      <TableCell>処理日時</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaveRequests && leaveRequests.length > 0 ? (
                      leaveRequests.map((request) => {
                        if (!request.details || request.details.length === 0) {
                          return <LeaveRequestRow 
                                   key={`${request.id}-empty`} 
                                   request={request}
                                 />;
                        }
                        
                        return request.details.map((detail, detailIndex) => (
                          <LeaveRequestRow 
                            key={`${request.id}-${detailIndex}`} 
                            request={request} 
                            detail={detail} 
                            index={detailIndex}
                          />
                        ));
                      })
                    ) : (
                      <EmptyRequestRow />
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              )}
            </Box>
          </CommonTabPanel>
        </TabContainer>
        
        {/* 申請確認ダイアログ */}
        <InfoDialog
          open={confirmDialog.open}
          onClose={() => setConfirmDialog({ open: false, formData: null, calculatedDays: 0 })}
          title="以下の内容で申請します"
          maxWidth="sm"
          actions={
            <>
              <ActionButton
                onClick={() => setConfirmDialog({ open: false, formData: null, calculatedDays: 0 })}
                buttonType="cancel"
                size="medium"
              >
                キャンセル
              </ActionButton>
              <ActionButton
                onClick={onSubmit}
                buttonType="primary"
                size="medium"
                loading={isSubmitting || loadingState.submit}
                icon={<SendIcon />}
              >
                申請する
              </ActionButton>
            </>
          }
        >
          <Box sx={{ py: 2 }}>
            {confirmDialog.formData && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* 休暇種別と利用日数 */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                    休暇種別
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {LEAVE_TYPES.find(type => type.value === confirmDialog.formData!.leaveTypeId)?.label || '不明'}
                  </Typography>
                  <Box sx={{ 
                    ml: 'auto',
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 0.5,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    borderRadius: 1
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      利用日数:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {confirmDialog.calculatedDays.toFixed(1)} 日
                    </Typography>
                  </Box>
                </Box>
                
                {/* 時間単位の場合 */}
                {confirmDialog.formData.isHourlyBased && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                      取得時間
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TimeIcon fontSize="small" color="primary" />
                      <Typography variant="body1" fontWeight="medium">
                        {confirmDialog.formData.startTime} ～ {confirmDialog.formData.endTime}
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                {/* 取得日 */}
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    取得日
                  </Typography>
                  {confirmDialog.formData.selectedDates.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {confirmDialog.formData.selectedDates.map((date, index) => {
                        const dateObj = typeof date === 'string' ? new Date(date) : date;
                        const isValidDate = dateObj instanceof Date && !isNaN(dateObj.getTime());
                        
                        return (
                          <Chip
                            key={index}
                            label={isValidDate ? format(dateObj, 'yyyy/MM/dd (EEE)', { locale: ja }) : '無効な日付'}
                            variant="outlined"
                            size="small"
                            sx={{
                              fontWeight: 'medium',
                              borderRadius: 1,
                              borderColor: 'primary.main',
                              color: 'primary.main',
                              '& .MuiChip-label': {
                                color: 'primary.main'
                              }
                            }}
                          />
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                      日付が選択されていません
                    </Typography>
                  )}
                </Box>
                
                
                {/* 理由（表示される場合のみ） */}
                {confirmDialog.formData.reason && (
                  <Box sx={{ 
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      理由
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                      {confirmDialog.formData.reason}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </InfoDialog>
      </PageContainer>
    </LocalizationProvider>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AttendancePageContent />
    </Suspense>
  );
} 
