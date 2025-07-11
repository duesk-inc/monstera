# 週報管理機能拡張 詳細設計書

## 1. 概要

本書は、週報管理機能拡張の基本設計書に基づき、実装レベルの詳細設計を定義する。

### 1.1 対象範囲
- フロントエンド実装詳細
- バックエンドAPI実装詳細
- データベース実装詳細
- バッチ処理実装詳細

### 1.2 前提条件
- 基本設計書の内容を前提とする
- 既存のMonstera開発規約に準拠
- 段階的実装（フェーズ1〜3）

## 2. フロントエンド詳細設計

### 2.1 画面構成詳細

#### 2.1.1 メイン画面構造
```typescript
// app/(admin)/admin/engineers/weekly-reports/page.tsx
interface WeeklyReportManagementPageProps {
  searchParams: {
    tab?: 'list' | 'unsubmitted' | 'alerts' | 'summary';
    page?: string;
    status?: string;
    // その他のフィルタパラメータ
  };
}

const tabs = [
  { value: 'list', label: '週報一覧', icon: <ListIcon /> },
  { value: 'unsubmitted', label: '未提出者管理', icon: <WarningIcon /> },
  { value: 'alerts', label: 'アラート', icon: <NotificationsIcon /> },
  { value: 'summary', label: '月次サマリー', icon: <AssessmentIcon /> }
];
```

#### 2.1.2 タブ切り替えロジック
```typescript
// hooks/admin/useTabNavigation.ts
export const useTabNavigation = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleTabChange = useCallback((newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', newTab);
    params.delete('page'); // ページ番号リセット
    // フィルタ条件は保持
    router.push(`/admin/engineers/weekly-reports?${params.toString()}`);
  }, [router, searchParams]);
  
  return { currentTab, handleTabChange };
};
```

### 2.2 コンポーネント詳細設計

#### 2.2.1 週報一覧タブ（改善版）
```typescript
// components/features/admin/weeklyReport/WeeklyReportList.tsx
interface WeeklyReportListProps {
  filters: WeeklyReportFilters;
  onFilterChange: (filters: WeeklyReportFilters) => void;
}

interface WeeklyReportFilters {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  department: string;
  hasAlert: boolean; // 異常値フィルタ
}

// カラム定義
const columns: GridColDef[] = [
  {
    field: 'engineerName',
    headerName: 'エンジニア',
    width: 200,
    renderCell: (params) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 32, height: 32 }}>
          {params.row.engineerName.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="body2">{params.row.engineerName}</Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.department}
          </Typography>
        </Box>
      </Box>
    )
  },
  {
    field: 'period',
    headerName: '期間',
    width: 150,
    valueGetter: (params) => 
      `${formatDate(params.row.startDate)} - ${formatDate(params.row.endDate)}`
  },
  {
    field: 'status',
    headerName: 'ステータス',
    width: 100,
    renderCell: (params) => <StatusChip status={params.value} />
  },
  {
    field: 'totalHours',
    headerName: '週間時間',
    width: 100,
    renderCell: (params) => (
      <Typography
        variant="body2"
        color={params.value > 60 ? 'error' : 'inherit'}
        fontWeight={params.value > 60 ? 'bold' : 'normal'}
      >
        {params.value}h
      </Typography>
    )
  },
  {
    field: 'monthlyTotal',
    headerName: '月累計',
    width: 100,
    renderCell: (params) => (
      <Typography
        variant="body2"
        color={params.value > 200 ? 'error' : 'inherit'}
      >
        {params.value}h
      </Typography>
    )
  },
  {
    field: 'commentStatus',
    headerName: 'コメント',
    width: 100,
    renderCell: (params) => (
      params.value ? 
        <Chip label="済" size="small" color="primary" /> : 
        <Chip label="未" size="small" variant="outlined" />
    )
  }
];
```

#### 2.2.2 クイックビュー（サイドパネル）
```typescript
// components/features/admin/weeklyReport/WeeklyReportQuickView.tsx
interface QuickViewProps {
  reportId: string | null;
  open: boolean;
  onClose: () => void;
  onCommentSubmit: (comment: string) => void;
}

const PANEL_WIDTH = 480; // 固定幅

export const WeeklyReportQuickView: React.FC<QuickViewProps> = ({
  reportId,
  open,
  onClose,
  onCommentSubmit
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: PANEL_WIDTH,
          boxSizing: 'border-box'
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">週報詳細</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        {/* サマリー情報のみ表示 */}
        <WeeklySummary reportId={reportId} />
        
        {/* 異常値ハイライト */}
        <AlertHighlight reportId={reportId} />
        
        {/* コメント機能 */}
        <CommentSection 
          reportId={reportId}
          onSubmit={onCommentSubmit}
        />
      </Box>
    </Drawer>
  );
};
```

#### 2.2.3 未提出者管理タブ
```typescript
// components/features/admin/weeklyReport/UnsubmittedManagement.tsx
interface UnsubmittedManagementProps {
  weekStart: string;
  weekEnd: string;
}

export const UnsubmittedManagement: React.FC<UnsubmittedManagementProps> = ({
  weekStart,
  weekEnd
}) => {
  const { data, loading, error } = useUnsubmittedReports({ weekStart, weekEnd });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [reminderDialog, setReminderDialog] = useState(false);
  
  // 一括選択
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedUsers(data?.users.map(u => u.userId) || []);
    } else {
      setSelectedUsers([]);
    }
  };
  
  // リマインド送信
  const handleSendReminder = async (customMessage?: string) => {
    try {
      await sendBulkReminder({
        userIds: selectedUsers,
        message: customMessage,
        weekStart,
        weekEnd
      });
      showSuccess('リマインドを送信しました');
      setReminderDialog(false);
      setSelectedUsers([]);
    } catch (error) {
      handleSubmissionError(error, 'リマインド送信');
    }
  };
  
  return (
    <Box>
      {/* 統計情報 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="error">
                {data?.totalUnsubmitted || 0}
              </Typography>
              <Typography variant="body2">未提出者数</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography variant="h4">
                {data?.totalEngineers || 0}
              </Typography>
              <Typography variant="body2">対象者数</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {data?.submissionRate || 0}%
              </Typography>
              <Typography variant="body2">提出率</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography variant="h4">
                {data?.averageDelay || 0}日
              </Typography>
              <Typography variant="body2">平均遅延日数</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* アクションバー */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedUsers.length === data?.users.length}
              indeterminate={selectedUsers.length > 0 && selectedUsers.length < data?.users.length}
              onChange={handleSelectAll}
            />
          }
          label="全選択"
        />
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          disabled={selectedUsers.length === 0}
          onClick={() => setReminderDialog(true)}
        >
          一括リマインド送信
        </Button>
      </Box>
      
      {/* 未提出者リスト */}
      <DataTable
        columns={unsubmittedColumns}
        data={data?.users || []}
        loading={loading}
        checkboxSelection
        selectedRows={selectedUsers}
        onSelectionChange={setSelectedUsers}
      />
      
      {/* リマインドダイアログ */}
      <ReminderDialog
        open={reminderDialog}
        onClose={() => setReminderDialog(false)}
        onSend={handleSendReminder}
        targetCount={selectedUsers.length}
      />
    </Box>
  );
};
```

#### 2.2.4 アラート管理タブ
```typescript
// components/features/admin/weeklyReport/AlertManagement.tsx
interface AlertManagementProps {
  userRole: 'admin' | 'manager' | 'superadmin';
}

export const AlertManagement: React.FC<AlertManagementProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const canEditSettings = userRole === 'manager' || userRole === 'superadmin';
  
  return (
    <Box>
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
        <Tab value="list" label="アラート一覧" />
        {canEditSettings && <Tab value="settings" label="設定" />}
      </Tabs>
      
      <Box sx={{ mt: 3 }}>
        {activeTab === 'list' ? (
          <AlertList />
        ) : (
          <AlertSettings />
        )}
      </Box>
    </Box>
  );
};

// アラート一覧コンポーネント
const AlertList: React.FC = () => {
  const { data, loading, updateAlertStatus } = useAlerts();
  
  const handleStatusUpdate = async (alertId: string, status: string, comment?: string) => {
    try {
      await updateAlertStatus(alertId, status, comment);
      showSuccess('ステータスを更新しました');
    } catch (error) {
      handleSubmissionError(error, 'ステータス更新');
    }
  };
  
  return (
    <Stack spacing={2}>
      {data?.alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onStatusUpdate={handleStatusUpdate}
        />
      ))}
    </Stack>
  );
};

// アラートカードコンポーネント
const AlertCard: React.FC<{ alert: Alert; onStatusUpdate: Function }> = ({ alert, onStatusUpdate }) => {
  const severityColor = {
    high: 'error',
    medium: 'warning',
    low: 'info'
  }[alert.severity];
  
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Chip
            label={alert.severity}
            color={severityColor as any}
            size="small"
            sx={{ mr: 1 }}
          />
          <Typography variant="h6">{alert.userName}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            label={alert.status}
            variant={alert.status === 'resolved' ? 'filled' : 'outlined'}
          />
        </Box>
        
        <Typography variant="body1" gutterBottom>
          {getAlertDescription(alert)}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button size="small" onClick={() => /* 詳細表示 */}>
            詳細を見る
          </Button>
          <Button size="small" onClick={() => /* コメント */}>
            コメント
          </Button>
          {alert.status !== 'resolved' && (
            <Button
              size="small"
              variant="contained"
              onClick={() => onStatusUpdate(alert.id, 'resolved')}
            >
              対応済みにする
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
```

### 2.3 カスタムフック詳細

#### 2.3.1 未提出者管理フック
```typescript
// hooks/admin/useUnsubmittedReports.ts
interface UseUnsubmittedReportsParams {
  weekStart: string;
  weekEnd: string;
  department?: string;
}

export const useUnsubmittedReports = (params: UseUnsubmittedReportsParams) => {
  const queryKey = ['unsubmittedReports', params];
  
  const query = useQuery({
    queryKey,
    queryFn: () => adminWeeklyReportApi.getUnsubmittedReports(params),
    staleTime: 30 * 1000, // 30秒
    refetchInterval: 30 * 1000, // 30秒ごとにポーリング
  });
  
  const sendBulkReminder = useMutation({
    mutationFn: (data: BulkReminderRequest) => 
      adminWeeklyReportApi.sendBulkReminder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      // 通知履歴も更新
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
  
  return {
    ...query,
    sendBulkReminder
  };
};
```

#### 2.3.2 アラート管理フック
```typescript
// hooks/admin/useAlertManagement.ts
export const useAlerts = () => {
  const [filters, setFilters] = useState<AlertFilters>({
    status: 'unhandled',
    severity: 'all',
    dateFrom: '',
    dateTo: ''
  });
  
  const query = useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => alertApi.getAlerts(filters),
    refetchInterval: 30 * 1000, // 30秒ポーリング
  });
  
  const updateAlertStatus = useMutation({
    mutationFn: ({ alertId, status, comment }: UpdateAlertStatusRequest) =>
      alertApi.updateAlertStatus(alertId, { status, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });
  
  return {
    ...query,
    filters,
    setFilters,
    updateAlertStatus
  };
};

// アラート設定フック
export const useAlertSettings = () => {
  const query = useQuery({
    queryKey: ['alertSettings'],
    queryFn: () => alertApi.getSettings(),
    staleTime: 5 * 60 * 1000, // 5分
  });
  
  const updateSettings = useMutation({
    mutationFn: (settings: AlertSettings) => 
      alertApi.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertSettings'] });
      showSuccess('設定を更新しました');
    }
  });
  
  return {
    ...query,
    updateSettings
  };
};
```

### 2.4 通知システム実装

#### 2.4.1 通知ポーリング
```typescript
// hooks/common/useNotifications.ts
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // 30秒ごとにポーリング
  useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const response = await notificationApi.getUnread();
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      return response;
    },
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: true,
  });
  
  const markAsRead = useMutation({
    mutationFn: (notificationId: string) => 
      notificationApi.markAsRead(notificationId),
    onSuccess: (_, notificationId) => {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  });
  
  return {
    notifications,
    unreadCount,
    markAsRead
  };
};
```

#### 2.4.2 通知コンポーネント
```typescript
// components/common/NotificationBell.tsx
export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // 優先度に基づくソート
  const sortedNotifications = useMemo(() => {
    const priorityOrder = { alert: 0, reminder: 1, comment: 2 };
    return [...notifications].sort((a, b) => 
      priorityOrder[a.type] - priorityOrder[b.type]
    );
  }, [notifications]);
  
  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { width: 360, maxHeight: 400 } }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">通知</Typography>
        </Box>
        
        <List sx={{ overflow: 'auto', maxHeight: 320 }}>
          {sortedNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={() => markAsRead.mutate(notification.id)}
            />
          ))}
        </List>
      </Menu>
    </>
  );
};
```

## 3. バックエンド詳細設計

### 3.1 API実装詳細

#### 3.1.1 ハンドラー実装
```go
// internal/handler/admin_weekly_report_handler_extended.go
package handler

// GetUnsubmittedReports 未提出者一覧取得
func (h *adminWeeklyReportHandler) GetUnsubmittedReports(c *gin.Context) {
    ctx := c.Request.Context()
    
    // クエリパラメータ取得
    weekStart := c.Query("week_start")
    weekEnd := c.Query("week_end")
    departmentID := c.Query("department_id")
    
    // バリデーション
    if weekStart == "" || weekEnd == "" {
        RespondValidationError(c, map[string]string{
            "week": "週の開始日と終了日を指定してください",
        })
        return
    }
    
    // サービス呼び出し
    result, err := h.adminWeeklyReportService.GetUnsubmittedReports(
        ctx, weekStart, weekEnd, departmentID)
    
    if err != nil {
        HandleError(c, http.StatusInternalServerError, 
            "未提出者一覧の取得に失敗しました", h.Logger, err)
        return
    }
    
    RespondSuccess(c, http.StatusOK, "", gin.H{
        "users": result.Users,
        "total_unsubmitted": result.TotalUnsubmitted,
        "total_engineers": result.TotalEngineers,
        "submission_rate": result.SubmissionRate,
        "average_delay": result.AverageDelay,
    })
}

// SendBulkReminder 一括リマインド送信
func (h *adminWeeklyReportHandler) SendBulkReminder(c *gin.Context) {
    ctx := c.Request.Context()
    
    // リクエストボディ取得
    var req struct {
        UserIDs []string `json:"user_ids" binding:"required,min=1"`
        Message string   `json:"message" binding:"max=500"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        RespondValidationError(c, map[string]string{
            "user_ids": "送信対象を選択してください",
        })
        return
    }
    
    // 認証済みユーザーID取得
    senderID, ok := h.util.GetAuthenticatedUserID(c)
    if !ok {
        return
    }
    
    // サービス呼び出し
    err := h.adminWeeklyReportService.SendBulkReminder(
        ctx, req.UserIDs, req.Message, senderID)
    
    if err != nil {
        HandleError(c, http.StatusInternalServerError,
            "リマインド送信に失敗しました", h.Logger, err)
        return
    }
    
    RespondSuccess(c, http.StatusOK, 
        "リマインドを送信しました", nil)
}
```

#### 3.1.2 アラート管理ハンドラー
```go
// internal/handler/alert_handler.go
package handler

type AlertHandler interface {
    GetAlerts(c *gin.Context)
    GetAlertSettings(c *gin.Context)
    UpdateAlertSettings(c *gin.Context)
    UpdateAlertStatus(c *gin.Context)
}

type alertHandler struct {
    BaseHandler
    alertService service.AlertService
    util         *HandlerUtil
}

func NewAlertHandler(
    alertService service.AlertService,
    logger *zap.Logger,
) AlertHandler {
    return &alertHandler{
        BaseHandler:  BaseHandler{Logger: logger},
        alertService: alertService,
        util:         NewHandlerUtil(logger),
    }
}

// GetAlerts アラート一覧取得
func (h *alertHandler) GetAlerts(c *gin.Context) {
    ctx := c.Request.Context()
    
    // フィルタパラメータ取得
    filters := dto.AlertFilters{
        Status:   c.DefaultQuery("status", "unhandled"),
        Severity: c.Query("severity"),
        DateFrom: c.Query("date_from"),
        DateTo:   c.Query("date_to"),
    }
    
    // ページネーション
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
    
    // サービス呼び出し
    alerts, total, err := h.alertService.GetAlerts(ctx, filters, page, limit)
    if err != nil {
        HandleError(c, http.StatusInternalServerError,
            "アラート一覧の取得に失敗しました", h.Logger, err)
        return
    }
    
    // デバッグログ
    debug.DebugLogger.LogAPI("GET", c.Request.URL.Path, filters, 
        gin.H{"count": len(alerts)}, time.Since(time.Now()))
    
    RespondSuccess(c, http.StatusOK, "", gin.H{
        "alerts": alerts,
        "total":  total,
        "page":   page,
        "limit":  limit,
    })
}

// UpdateAlertStatus アラートステータス更新
func (h *alertHandler) UpdateAlertStatus(c *gin.Context) {
    ctx := c.Request.Context()
    
    // パスパラメータ
    alertID, err := ParseUUID(c, "id", h.Logger)
    if err != nil {
        return
    }
    
    // リクエストボディ
    var req struct {
        Status  string `json:"status" binding:"required,oneof=handling resolved"`
        Comment string `json:"comment" binding:"max=500"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        RespondValidationError(c, map[string]string{
            "status": "ステータスを指定してください",
        })
        return
    }
    
    // 認証済みユーザーID取得
    userID, ok := h.util.GetAuthenticatedUserID(c)
    if !ok {
        return
    }
    
    // サービス呼び出し
    err = h.alertService.UpdateAlertStatus(
        ctx, alertID, req.Status, req.Comment, userID)
    
    if err != nil {
        if errors.Is(err, service.ErrAlertNotFound) {
            RespondNotFound(c, "アラート")
            return
        }
        HandleError(c, http.StatusInternalServerError,
            "ステータス更新に失敗しました", h.Logger, err)
        return
    }
    
    RespondSuccess(c, http.StatusOK,
        "ステータスを更新しました", nil)
}
```

### 3.2 サービス層実装

#### 3.2.1 週報管理サービス拡張
```go
// internal/service/admin_weekly_report_service_extended.go
package service

// GetUnsubmittedReports 未提出者一覧取得
func (s *adminWeeklyReportService) GetUnsubmittedReports(
    ctx context.Context,
    weekStart, weekEnd string,
    departmentID string,
) (*dto.UnsubmittedReportsResponse, error) {
    // トランザクション開始
    var result dto.UnsubmittedReportsResponse
    
    err := s.db.Transaction(func(tx *gorm.DB) error {
        // リポジトリ作成
        userRepo := repository.NewUserRepository(tx, s.logger)
        reportRepo := repository.NewWeeklyReportRepository(tx, s.logger)
        
        // 対象期間の全エンジニア取得
        engineers, err := userRepo.GetEngineersByDepartment(ctx, departmentID)
        if err != nil {
            return err
        }
        
        // 提出済みユーザーID取得
        submittedUserIDs, err := reportRepo.GetSubmittedUserIDs(
            ctx, weekStart, weekEnd)
        if err != nil {
            return err
        }
        
        // 未提出者抽出
        submittedMap := make(map[string]bool)
        for _, id := range submittedUserIDs {
            submittedMap[id] = true
        }
        
        var unsubmittedUsers []dto.UnsubmittedUser
        totalDelay := 0
        
        for _, engineer := range engineers {
            if !submittedMap[engineer.ID.String()] {
                // 遅延日数計算
                deadline, _ := time.Parse("2006-01-02", weekEnd)
                delayDays := int(time.Since(deadline).Hours() / 24)
                
                // 過去の提出率取得
                submissionRate, err := reportRepo.GetUserSubmissionRate(
                    ctx, engineer.ID.String(), 12) // 過去12週
                if err != nil {
                    s.logger.Warn("Failed to get submission rate",
                        zap.String("user_id", engineer.ID.String()),
                        zap.Error(err))
                    submissionRate = 0
                }
                
                unsubmittedUsers = append(unsubmittedUsers, dto.UnsubmittedUser{
                    UserID:         engineer.ID.String(),
                    UserName:       engineer.Name,
                    UserEmail:      engineer.Email,
                    Department:     engineer.Department,
                    DelayDays:      delayDays,
                    SubmissionRate: submissionRate,
                })
                
                totalDelay += delayDays
            }
        }
        
        // 統計情報計算
        result.Users = unsubmittedUsers
        result.TotalUnsubmitted = len(unsubmittedUsers)
        result.TotalEngineers = len(engineers)
        if len(engineers) > 0 {
            result.SubmissionRate = float64(len(engineers)-len(unsubmittedUsers)) / 
                               float64(len(engineers)) * 100
        }
        if len(unsubmittedUsers) > 0 {
            result.AverageDelay = float64(totalDelay) / float64(len(unsubmittedUsers))
        }
        
        return nil
    })
    
    if err != nil {
        s.logger.Error("Failed to get unsubmitted reports",
            zap.String("week_start", weekStart),
            zap.String("week_end", weekEnd),
            zap.Error(err))
        return nil, err
    }
    
    return &result, nil
}

// SendBulkReminder 一括リマインド送信
func (s *adminWeeklyReportService) SendBulkReminder(
    ctx context.Context,
    userIDs []string,
    customMessage string,
    senderID string,
) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        notificationRepo := repository.NewNotificationRepository(tx, s.logger)
        
        // デフォルトメッセージ
        message := "週報の提出期限が過ぎています。速やかに提出してください。"
        if customMessage != "" {
            message = customMessage + "\n\n" + message
        }
        
        // 各ユーザーに通知作成
        notifications := make([]model.NotificationHistory, 0, len(userIDs))
        now := time.Now()
        
        for _, userID := range userIDs {
            notifications = append(notifications, model.NotificationHistory{
                RecipientID:       uuid.MustParse(userID),
                SenderID:          uuid.MustParse(senderID),
                NotificationType:  "reminder",
                Title:             "週報提出リマインド",
                Message:           message,
                RelatedEntityType: "weekly_report",
                CreatedAt:         now,
            })
        }
        
        // バッチ挿入
        if err := notificationRepo.CreateBatch(ctx, notifications); err != nil {
            return err
        }
        
        // デバッグログ
        debug.DebugLogger.LogOperation("Notification", "BulkCreate",
            map[string]interface{}{
                "recipient_count": len(userIDs),
                "sender_id":       senderID,
            }, nil)
        
        return nil
    })
}
```

#### 3.2.2 アラートサービス実装
```go
// internal/service/alert_service.go
package service

type AlertService interface {
    GetAlerts(ctx context.Context, filters dto.AlertFilters, page, limit int) ([]*dto.Alert, int64, error)
    GetAlertSettings(ctx context.Context) (*model.AlertSettings, error)
    UpdateAlertSettings(ctx context.Context, settings *dto.AlertSettingsUpdate, updatedBy string) error
    UpdateAlertStatus(ctx context.Context, alertID, status, comment string, resolvedBy string) error
    // バッチ処理用
    DetectAnomalies(ctx context.Context) error
}

type alertService struct {
    db     *gorm.DB
    logger *zap.Logger
}

// DetectAnomalies 異常値検知（バッチ処理）
func (s *alertService) DetectAnomalies(ctx context.Context) error {
    // 設定取得
    settings, err := s.GetAlertSettings(ctx)
    if err != nil {
        return err
    }
    
    return s.db.Transaction(func(tx *gorm.DB) error {
        reportRepo := repository.NewWeeklyReportRepository(tx, s.logger)
        alertRepo := repository.NewAlertRepository(tx, s.logger)
        
        // 過去1週間の週報を取得
        endDate := time.Now()
        startDate := endDate.AddDate(0, 0, -7)
        
        reports, err := reportRepo.GetReportsByDateRange(
            ctx, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
        if err != nil {
            return err
        }
        
        var alerts []model.AlertHistory
        
        for _, report := range reports {
            // 1. 週間労働時間チェック
            if report.TotalWorkHours > float64(settings.WeeklyHoursLimit) {
                alerts = append(alerts, model.AlertHistory{
                    UserID:         report.UserID,
                    WeeklyReportID: &report.ID,
                    AlertType:      "overwork",
                    Severity:       s.calculateSeverity(report.TotalWorkHours, float64(settings.WeeklyHoursLimit)),
                    DetectedValue: map[string]interface{}{
                        "hours": report.TotalWorkHours,
                    },
                    ThresholdValue: map[string]interface{}{
                        "limit": settings.WeeklyHoursLimit,
                    },
                    Status: "unhandled",
                })
            }
            
            // 2. 前週比増減チェック
            previousReport, err := reportRepo.GetPreviousWeekReport(ctx, report.UserID.String(), report.StartDate)
            if err == nil && previousReport != nil {
                hoursDiff := math.Abs(report.TotalWorkHours - previousReport.TotalWorkHours)
                if hoursDiff > float64(settings.WeeklyHoursChangeLimit) {
                    alerts = append(alerts, model.AlertHistory{
                        UserID:         report.UserID,
                        WeeklyReportID: &report.ID,
                        AlertType:      "sudden_change",
                        Severity:       "medium",
                        DetectedValue: map[string]interface{}{
                            "current_hours":  report.TotalWorkHours,
                            "previous_hours": previousReport.TotalWorkHours,
                            "difference":     hoursDiff,
                        },
                        ThresholdValue: map[string]interface{}{
                            "limit": settings.WeeklyHoursChangeLimit,
                        },
                        Status: "unhandled",
                    })
                }
            }
            
            // 3. 連続休日出勤チェック
            holidayWorkCount, err := reportRepo.GetConsecutiveHolidayWork(
                ctx, report.UserID.String(), report.EndDate)
            if err == nil && holidayWorkCount >= settings.ConsecutiveHolidayWorkLimit {
                alerts = append(alerts, model.AlertHistory{
                    UserID:         report.UserID,
                    WeeklyReportID: &report.ID,
                    AlertType:      "holiday_work",
                    Severity:       "high",
                    DetectedValue: map[string]interface{}{
                        "consecutive_weeks": holidayWorkCount,
                    },
                    ThresholdValue: map[string]interface{}{
                        "limit": settings.ConsecutiveHolidayWorkLimit,
                    },
                    Status: "unhandled",
                })
            }
        }
        
        // 既存のアラートと重複チェック
        if len(alerts) > 0 {
            existingAlerts, err := alertRepo.GetUnresolvedAlertsByUsers(
                ctx, s.extractUserIDs(alerts))
            if err != nil {
                return err
            }
            
            // 重複を除外
            alerts = s.filterDuplicateAlerts(alerts, existingAlerts)
            
            // 新規アラート作成
            if len(alerts) > 0 {
                if err := alertRepo.CreateBatch(ctx, alerts); err != nil {
                    return err
                }
                
                // 通知作成
                if err := s.createAlertNotifications(ctx, tx, alerts); err != nil {
                    return err
                }
            }
        }
        
        s.logger.Info("Anomaly detection completed",
            zap.Int("new_alerts", len(alerts)))
        
        return nil
    })
}

// calculateSeverity 深刻度計算
func (s *alertService) calculateSeverity(actual, threshold float64) string {
    ratio := actual / threshold
    if ratio >= 1.5 {
        return "high"
    } else if ratio >= 1.2 {
        return "medium"
    }
    return "low"
}
```

### 3.3 リポジトリ層実装

#### 3.3.1 通知リポジトリ
```go
// internal/repository/notification_repository.go
package repository

type NotificationRepository interface {
    Create(ctx context.Context, notification *model.NotificationHistory) error
    CreateBatch(ctx context.Context, notifications []model.NotificationHistory) error
    GetUnreadByUser(ctx context.Context, userID string) ([]*model.NotificationHistory, error)
    MarkAsRead(ctx context.Context, notificationID string) error
    GetByID(ctx context.Context, id string) (*model.NotificationHistory, error)
}

type notificationRepository struct {
    BaseRepository
}

func NewNotificationRepository(db *gorm.DB, logger *zap.Logger) NotificationRepository {
    return &notificationRepository{
        BaseRepository: BaseRepository{db: db, logger: logger},
    }
}

// CreateBatch バッチ作成（効率化）
func (r *notificationRepository) CreateBatch(
    ctx context.Context,
    notifications []model.NotificationHistory,
) error {
    if len(notifications) == 0 {
        return nil
    }
    
    // バッチサイズ指定で挿入
    batchSize := 100
    for i := 0; i < len(notifications); i += batchSize {
        end := i + batchSize
        if end > len(notifications) {
            end = len(notifications)
        }
        
        if err := r.db.WithContext(ctx).
            CreateInBatches(notifications[i:end], batchSize).Error; err != nil {
            r.logger.Error("Failed to create notifications batch",
                zap.Int("batch_start", i),
                zap.Int("batch_end", end),
                zap.Error(err))
            return err
        }
    }
    
    return nil
}

// GetUnreadByUser 未読通知取得
func (r *notificationRepository) GetUnreadByUser(
    ctx context.Context,
    userID string,
) ([]*model.NotificationHistory, error) {
    var notifications []*model.NotificationHistory
    
    err := r.db.WithContext(ctx).
        Where("recipient_id = ? AND is_read = ?", userID, false).
        Order("created_at DESC").
        Limit(50). // 最新50件
        Find(&notifications).Error
    
    if err != nil {
        r.logger.Error("Failed to get unread notifications",
            zap.String("user_id", userID),
            zap.Error(err))
        return nil, err
    }
    
    return notifications, nil
}
```

#### 3.3.2 アラートリポジトリ
```go
// internal/repository/alert_repository.go
package repository

type AlertRepository interface {
    Create(ctx context.Context, alert *model.AlertHistory) error
    CreateBatch(ctx context.Context, alerts []model.AlertHistory) error
    GetByID(ctx context.Context, id string) (*model.AlertHistory, error)
    GetAlerts(ctx context.Context, filters dto.AlertFilters, offset, limit int) ([]*model.AlertHistory, int64, error)
    UpdateStatus(ctx context.Context, id string, status string, resolvedBy *uuid.UUID, comment string) error
    GetUnresolvedAlertsByUsers(ctx context.Context, userIDs []string) ([]*model.AlertHistory, error)
}

type alertRepository struct {
    BaseRepository
}

// GetAlerts フィルタ付き取得
func (r *alertRepository) GetAlerts(
    ctx context.Context,
    filters dto.AlertFilters,
    offset, limit int,
) ([]*model.AlertHistory, int64, error) {
    query := r.db.WithContext(ctx).Model(&model.AlertHistory{})
    
    // フィルタ適用
    if filters.Status != "" && filters.Status != "all" {
        query = query.Where("status = ?", filters.Status)
    }
    if filters.Severity != "" && filters.Severity != "all" {
        query = query.Where("severity = ?", filters.Severity)
    }
    if filters.DateFrom != "" {
        query = query.Where("created_at >= ?", filters.DateFrom)
    }
    if filters.DateTo != "" {
        query = query.Where("created_at <= ?", filters.DateTo)
    }
    
    // 総件数取得
    var total int64
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }
    
    // データ取得
    var alerts []*model.AlertHistory
    err := query.
        Preload("User").
        Preload("WeeklyReport").
        Order("created_at DESC").
        Offset(offset).
        Limit(limit).
        Find(&alerts).Error
    
    return alerts, total, err
}

// GetUnresolvedAlertsByUsers ユーザー別未解決アラート取得
func (r *alertRepository) GetUnresolvedAlertsByUsers(
    ctx context.Context,
    userIDs []string,
) ([]*model.AlertHistory, error) {
    var alerts []*model.AlertHistory
    
    err := r.db.WithContext(ctx).
        Where("user_id IN ? AND status != ?", userIDs, "resolved").
        Find(&alerts).Error
    
    return alerts, err
}
```

### 3.4 バッチ処理実装

#### 3.4.1 バッチスケジューラー
```go
// internal/batch/scheduler.go
package batch

type BatchScheduler struct {
    alertService    service.AlertService
    weeklyReportSvc service.WeeklyReportService
    logger          *zap.Logger
}

func NewBatchScheduler(
    alertService service.AlertService,
    weeklyReportSvc service.WeeklyReportService,
    logger *zap.Logger,
) *BatchScheduler {
    return &BatchScheduler{
        alertService:    alertService,
        weeklyReportSvc: weeklyReportSvc,
        logger:          logger,
    }
}

// Start バッチ処理開始
func (s *BatchScheduler) Start(ctx context.Context) {
    // 日次バッチ（毎日AM 6:00）
    dailyCron := cron.New(cron.WithLocation(time.FixedZone("JST", 9*60*60)))
    
    // 異常値検知
    _, err := dailyCron.AddFunc("0 6 * * *", func() {
        s.runWithRetry(ctx, "AnomalyDetection", func() error {
            return s.alertService.DetectAnomalies(ctx)
        })
    })
    if err != nil {
        s.logger.Fatal("Failed to schedule anomaly detection", zap.Error(err))
    }
    
    // アーカイブ処理（毎月1日 AM 2:00）
    _, err = dailyCron.AddFunc("0 2 1 * *", func() {
        s.runWithRetry(ctx, "Archive", func() error {
            return s.weeklyReportSvc.ArchiveOldReports(ctx)
        })
    })
    if err != nil {
        s.logger.Fatal("Failed to schedule archive", zap.Error(err))
    }
    
    dailyCron.Start()
    
    // グレースフルシャットダウン
    <-ctx.Done()
    cronCtx := dailyCron.Stop()
    <-cronCtx.Done()
}

// runWithRetry リトライ付き実行
func (s *BatchScheduler) runWithRetry(
    ctx context.Context,
    jobName string,
    fn func() error,
) {
    maxRetries := 3
    var err error
    
    for i := 0; i < maxRetries; i++ {
        s.logger.Info("Starting batch job",
            zap.String("job", jobName),
            zap.Int("attempt", i+1))
        
        startTime := time.Now()
        err = fn()
        duration := time.Since(startTime)
        
        if err == nil {
            s.logger.Info("Batch job completed",
                zap.String("job", jobName),
                zap.Duration("duration", duration))
            return
        }
        
        s.logger.Error("Batch job failed",
            zap.String("job", jobName),
            zap.Int("attempt", i+1),
            zap.Error(err))
        
        if i < maxRetries-1 {
            // 指数バックオフ
            waitTime := time.Duration(math.Pow(2, float64(i))) * time.Minute
            time.Sleep(waitTime)
        }
    }
    
    // 全てのリトライが失敗
    s.logger.Error("Batch job failed after all retries",
        zap.String("job", jobName),
        zap.Error(err))
    
    // アラート通知（実装は省略）
    // s.notifyBatchFailure(jobName, err)
}
```

#### 3.4.2 Dockerコンテナ設定
```dockerfile
# backend/Dockerfile.batch
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o batch cmd/batch/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/batch .
COPY --from=builder /app/.env.example .env

# タイムゾーン設定
ENV TZ=Asia/Tokyo

CMD ["./batch"]
```

```yaml
# docker-compose.yml に追加
  batch:
    build:
      context: ./backend
      dockerfile: Dockerfile.batch
    env_file:
      - ./backend/.env
    depends_on:
      - mysql
    networks:
      - monstera-network
    restart: unless-stopped
```

## 4. データベース詳細設計

### 4.1 インデックス最適化

```sql
-- 既存テーブルへのインデックス追加
ALTER TABLE weekly_reports 
ADD INDEX idx_status_date (status, start_date),
ADD INDEX idx_user_date (user_id, start_date);

ALTER TABLE daily_records
ADD INDEX idx_report_date (weekly_report_id, record_date);

-- 新規テーブルのインデックス（CREATE TABLE時に定義済み）
-- alert_histories: idx_alert_histories_user_status, idx_alert_histories_created_at
-- notification_histories: idx_notification_histories_recipient, idx_notification_histories_created_at
```

### 4.2 アーカイブテーブル設計

```sql
-- アーカイブテーブル（パーティション付き）
CREATE TABLE weekly_reports_archive (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    mood INT,
    weekly_remarks TEXT,
    total_work_hours DECIMAL(5,2),
    submitted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, start_date)
) PARTITION BY RANGE (YEAR(start_date));

-- 年度別パーティション作成
CREATE TABLE weekly_reports_archive_2022 PARTITION OF weekly_reports_archive
    FOR VALUES FROM (2022) TO (2023);
    
CREATE TABLE weekly_reports_archive_2023 PARTITION OF weekly_reports_archive
    FOR VALUES FROM (2023) TO (2024);
    
CREATE TABLE weekly_reports_archive_2024 PARTITION OF weekly_reports_archive
    FOR VALUES FROM (2024) TO (2025);

-- アーカイブ処理ストアドプロシージャ
DELIMITER $$
CREATE PROCEDURE archive_old_weekly_reports()
BEGIN
    DECLARE archive_date DATE;
    SET archive_date = DATE_SUB(CURDATE(), INTERVAL 2 YEAR);
    
    START TRANSACTION;
    
    -- アーカイブテーブルへ移動
    INSERT INTO weekly_reports_archive
    SELECT *, CURRENT_TIMESTAMP as archived_at
    FROM weekly_reports
    WHERE start_date < archive_date;
    
    -- 関連テーブルも移動（daily_records等）
    INSERT INTO daily_records_archive
    SELECT dr.*, CURRENT_TIMESTAMP as archived_at
    FROM daily_records dr
    INNER JOIN weekly_reports wr ON dr.weekly_report_id = wr.id
    WHERE wr.start_date < archive_date;
    
    -- 元テーブルから削除
    DELETE FROM daily_records
    WHERE weekly_report_id IN (
        SELECT id FROM weekly_reports WHERE start_date < archive_date
    );
    
    DELETE FROM weekly_reports
    WHERE start_date < archive_date;
    
    COMMIT;
END$$
DELIMITER ;
```

## 5. セキュリティ詳細設計

### 5.1 権限チェック実装

#### 5.1.1 ミドルウェア実装
```go
// internal/middleware/role_middleware.go
func RequireManagerRole() gin.HandlerFunc {
    return func(c *gin.Context) {
        user, exists := c.Get("user")
        if !exists {
            RespondError(c, http.StatusUnauthorized, "認証が必要です")
            c.Abort()
            return
        }
        
        userInfo := user.(*dto.UserInfo)
        if userInfo.Role != "manager" && userInfo.Role != "superadmin" {
            RespondError(c, http.StatusForbidden, "この操作にはマネージャー権限が必要です")
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

#### 5.1.2 フロントエンド権限制御
```typescript
// hooks/auth/usePermission.ts
export const usePermission = () => {
  const { user } = useAuth();
  
  const canEditAlertSettings = useMemo(() => {
    return user?.role === 'manager' || user?.role === 'superadmin';
  }, [user]);
  
  const canSendReminder = useMemo(() => {
    return ['admin', 'manager', 'superadmin'].includes(user?.role || '');
  }, [user]);
  
  return {
    canEditAlertSettings,
    canSendReminder,
    isManager: user?.role === 'manager',
    isAdmin: ['admin', 'superadmin'].includes(user?.role || '')
  };
};

// 使用例
const AlertSettings: React.FC = () => {
  const { canEditAlertSettings } = usePermission();
  
  if (!canEditAlertSettings) {
    return <Alert severity="error">アクセス権限がありません</Alert>;
  }
  
  // 設定画面表示
};
```

### 5.2 監査ログ実装

```go
// internal/middleware/audit_middleware.go
func AuditLog() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        method := c.Request.Method
        
        // リクエスト前の処理
        var requestBody []byte
        if c.Request.Body != nil && method != "GET" {
            requestBody, _ = io.ReadAll(c.Request.Body)
            c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
        }
        
        c.Next()
        
        // レスポンス後の処理
        if shouldAudit(path, method) {
            auditEntry := model.AuditLog{
                UserID:       getUserID(c),
                Action:       fmt.Sprintf("%s %s", method, path),
                ResourceType: getResourceType(path),
                ResourceID:   getResourceID(c),
                StatusCode:   c.Writer.Status(),
                Duration:     time.Since(start).Milliseconds(),
                IP:           c.ClientIP(),
                UserAgent:    c.Request.UserAgent(),
            }
            
            // 非同期でログ保存
            go saveAuditLog(auditEntry)
        }
    }
}

func shouldAudit(path, method string) bool {
    // 監査対象のパスとメソッドを定義
    auditPaths := []string{
        "/api/v1/admin/alerts/settings", // アラート設定変更
        "/api/v1/admin/weekly-reports/remind", // リマインド送信
        "/api/v1/admin/weekly-reports/export", // データエクスポート
    }
    
    for _, p := range auditPaths {
        if strings.Contains(path, p) {
            return true
        }
    }
    
    // 更新系操作は全て記録
    return method == "POST" || method == "PUT" || method == "DELETE"
}
```

## 6. パフォーマンス最適化詳細

### 6.1 クエリ最適化

```go
// 効率的なサマリー集計
func (r *weeklyReportRepository) GetMonthlySummary(
    ctx context.Context,
    year, month int,
) (*dto.MonthlySummary, error) {
    // 集計用の最適化されたクエリ
    query := `
        SELECT 
            u.department,
            COUNT(DISTINCT u.id) as engineer_count,
            COUNT(DISTINCT wr.id) as submitted_count,
            AVG(wr.total_work_hours) as avg_work_hours,
            MAX(wr.total_work_hours) as max_work_hours,
            COUNT(DISTINCT CASE WHEN ah.id IS NOT NULL THEN u.id END) as alert_count
        FROM users u
        LEFT JOIN weekly_reports wr ON u.id = wr.user_id 
            AND YEAR(wr.start_date) = ? 
            AND MONTH(wr.start_date) = ?
            AND wr.status = 'submitted'
        LEFT JOIN alert_histories ah ON u.id = ah.user_id
            AND YEAR(ah.created_at) = ?
            AND MONTH(ah.created_at) = ?
            AND ah.status != 'resolved'
        WHERE u.role = 'engineer'
        GROUP BY u.department
    `
    
    var results []struct {
        Department     string
        EngineerCount  int
        SubmittedCount int
        AvgWorkHours   float64
        MaxWorkHours   float64
        AlertCount     int
    }
    
    err := r.db.WithContext(ctx).
        Raw(query, year, month, year, month).
        Scan(&results).Error
    
    // 結果を集計
    // ...
}
```

### 6.2 キャッシュ実装

```typescript
// hooks/admin/useCachedAlertSettings.ts
export const useCachedAlertSettings = () => {
  // 設定は頻繁に変更されないため、長めのキャッシュ
  return useQuery({
    queryKey: ['alertSettings'],
    queryFn: () => alertApi.getSettings(),
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 30 * 60 * 1000, // 30分
    // キャッシュヒット率を上げる
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

// 集計データのキャッシュ
export const useMonthlySummary = (year: number, month: number) => {
  return useQuery({
    queryKey: ['monthlySummary', year, month],
    queryFn: () => adminApi.getMonthlySummary(year, month),
    staleTime: 60 * 60 * 1000, // 1時間
    gcTime: 24 * 60 * 60 * 1000, // 24時間
    // 過去のデータは変わらないため積極的にキャッシュ
    enabled: !isFutureMonth(year, month),
  });
};
```

### 6.3 非同期エクスポート

```go
// internal/service/export_service.go
type ExportService interface {
    StartExport(ctx context.Context, request *dto.ExportRequest) (string, error)
    GetExportStatus(ctx context.Context, jobID string) (*dto.ExportStatus, error)
    GetExportFile(ctx context.Context, jobID string) ([]byte, error)
}

func (s *exportService) StartExport(
    ctx context.Context,
    request *dto.ExportRequest,
) (string, error) {
    // ジョブID生成
    jobID := uuid.New().String()
    
    // ジョブ情報を保存
    job := &model.ExportJob{
        ID:        jobID,
        UserID:    request.UserID,
        Status:    "processing",
        CreatedAt: time.Now(),
    }
    
    if err := s.jobRepo.Create(ctx, job); err != nil {
        return "", err
    }
    
    // 非同期でエクスポート処理
    go func() {
        defer func() {
            if r := recover(); r != nil {
                s.logger.Error("Export job panicked",
                    zap.String("job_id", jobID),
                    zap.Any("panic", r))
                s.updateJobStatus(jobID, "failed", "")
            }
        }()
        
        // エクスポート実行
        filePath, err := s.executeExport(context.Background(), request)
        if err != nil {
            s.updateJobStatus(jobID, "failed", "")
            return
        }
        
        s.updateJobStatus(jobID, "completed", filePath)
        
        // 完了通知
        s.notifyExportComplete(request.UserID, jobID)
    }()
    
    return jobID, nil
}
```

## 7. テスト詳細設計

### 7.1 単体テスト

#### 7.1.1 フロントエンドテスト
```typescript
// components/features/admin/weeklyReport/UnsubmittedManagement.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnsubmittedManagement } from './UnsubmittedManagement';

describe('UnsubmittedManagement', () => {
  it('未提出者リストを表示する', async () => {
    const mockData = {
      users: [
        {
          userId: '1',
          userName: '山田太郎',
          department: '開発部',
          delayDays: 3,
          submissionRate: 85
        }
      ],
      totalUnsubmitted: 1,
      totalEngineers: 10,
      submissionRate: 90.0
    };
    
    // APIモック
    server.use(
      rest.get('/api/v1/admin/weekly-reports/unsubmitted', (req, res, ctx) => {
        return res(ctx.json(mockData));
      })
    );
    
    render(<UnsubmittedManagement weekStart="2024-01-08" weekEnd="2024-01-14" />);
    
    // データ読み込み待機
    await waitFor(() => {
      expect(screen.getByText('山田太郎')).toBeInTheDocument();
    });
    
    // 統計情報確認
    expect(screen.getByText('90.0%')).toBeInTheDocument();
    expect(screen.getByText('提出率')).toBeInTheDocument();
  });
  
  it('一括リマインド送信ができる', async () => {
    // ... テスト実装
  });
});
```

#### 7.1.2 バックエンドテスト
```go
// internal/service/alert_service_test.go
func TestAlertService_DetectAnomalies(t *testing.T) {
    // テストDB準備
    db := setupTestDB(t)
    defer teardownTestDB(db)
    
    // モック準備
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()
    
    // テストデータ準備
    settings := &model.AlertSettings{
        WeeklyHoursLimit:            60,
        WeeklyHoursChangeLimit:      20,
        ConsecutiveHolidayWorkLimit: 3,
    }
    
    // 異常値を含む週報作成
    report := &model.WeeklyReport{
        UserID:         uuid.New(),
        TotalWorkHours: 72.0, // 閾値超過
        StartDate:      time.Now().AddDate(0, 0, -7),
        EndDate:        time.Now(),
    }
    
    db.Create(settings)
    db.Create(report)
    
    // サービス実行
    service := NewAlertService(db, zap.NewNop())
    err := service.DetectAnomalies(context.Background())
    
    // 検証
    assert.NoError(t, err)
    
    var alerts []model.AlertHistory
    db.Where("user_id = ?", report.UserID).Find(&alerts)
    
    assert.Len(t, alerts, 1)
    assert.Equal(t, "overwork", alerts[0].AlertType)
    assert.Equal(t, "high", alerts[0].Severity)
}
```

### 7.2 統合テスト

```go
// internal/handler/admin_weekly_report_handler_integration_test.go
func TestAdminWeeklyReportHandler_Integration(t *testing.T) {
    // テスト環境セットアップ
    container := setupMySQLContainer(t)
    defer container.Terminate(context.Background())
    
    db := connectTestDB(container)
    router := setupTestRouter(db)
    
    // テストデータ投入
    seedTestData(t, db)
    
    t.Run("未提出者一覧取得", func(t *testing.T) {
        req := httptest.NewRequest(
            "GET",
            "/api/v1/admin/weekly-reports/unsubmitted?week_start=2024-01-08&week_end=2024-01-14",
            nil,
        )
        req.Header.Set("Authorization", "Bearer "+getTestAdminToken())
        
        w := httptest.NewRecorder()
        router.ServeHTTP(w, req)
        
        assert.Equal(t, http.StatusOK, w.Code)
        
        var response map[string]interface{}
        json.Unmarshal(w.Body.Bytes(), &response)
        
        assert.Contains(t, response, "users")
        assert.Contains(t, response, "submission_rate")
    })
}
```

### 7.3 E2Eテスト

```typescript
// e2e/admin-weekly-report.spec.ts
import { test, expect } from '@playwright/test';

test.describe('管理者週報管理', () => {
  test.beforeEach(async ({ page }) => {
    // 管理者としてログイン
    await loginAsAdmin(page);
    await page.goto('/admin/engineers/weekly-reports');
  });
  
  test('未提出者にリマインドを送信できる', async ({ page }) => {
    // 未提出者管理タブへ移動
    await page.click('text=未提出者管理');
    
    // 未提出者が表示されるまで待機
    await page.waitForSelector('[data-testid="unsubmitted-list"]');
    
    // 最初のユーザーを選択
    await page.click('input[type="checkbox"]:first-of-type');
    
    // リマインド送信ボタンをクリック
    await page.click('text=一括リマインド送信');
    
    // ダイアログでメッセージ入力
    await page.fill('textarea', 'テストリマインドメッセージ');
    await page.click('text=送信');
    
    // 成功メッセージ確認
    await expect(page.locator('text=リマインドを送信しました')).toBeVisible();
  });
  
  test('アラート設定を変更できる（マネージャー権限）', async ({ page }) => {
    // アラートタブへ移動
    await page.click('text=アラート');
    await page.click('text=設定');
    
    // 週間労働時間上限を変更
    await page.fill('input[name="weeklyHoursLimit"]', '65');
    
    // 保存
    await page.click('text=設定を保存');
    
    // 成功メッセージ確認
    await expect(page.locator('text=設定を更新しました')).toBeVisible();
  });
});
```

### 7.4 パフォーマンステスト

```go
// internal/test/performance_test.go
func BenchmarkGetWeeklyReports500Users(b *testing.B) {
    db := setupBenchDB(b)
    defer teardownBenchDB(db)
    
    // 500名分のテストデータ生成
    generateTestUsers(db, 500)
    generateTestWeeklyReports(db, 500, 12) // 12週分
    
    handler := setupTestHandler(db)
    
    b.ResetTimer()
    
    for i := 0; i < b.N; i++ {
        req := httptest.NewRequest("GET", "/api/v1/admin/weekly-reports?limit=50", nil)
        w := httptest.NewRecorder()
        
        handler.GetWeeklyReports(createTestContext(w, req))
        
        if w.Code != http.StatusOK {
            b.Fatalf("Expected status 200, got %d", w.Code)
        }
    }
}
```

## 8. デプロイメント詳細

### 8.1 環境変数設定

```bash
# .env.production
# 新規追加分
ALERT_BATCH_ENABLED=true
ALERT_BATCH_SCHEDULE="0 6 * * *"
NOTIFICATION_POLLING_INTERVAL=30000
EXPORT_TEMP_DIR=/tmp/exports
EXPORT_RETENTION_HOURS=24
ARCHIVE_RETENTION_YEARS=2
```

### 8.2 マイグレーション実行計画

```sql
-- マイグレーションファイル
-- 200100_add_weekly_report_management_tables.up.sql

-- 実行前チェック
SELECT COUNT(*) FROM weekly_reports;
SELECT COUNT(*) FROM users WHERE role = 'engineer';

-- インデックス追加（既存テーブル）
-- 注: 大量データがある場合は、オンラインDDLを使用
ALTER TABLE weekly_reports 
ADD INDEX idx_status_date (status, start_date) ALGORITHM=INPLACE, LOCK=NONE;

-- 新規テーブル作成
CREATE TABLE IF NOT EXISTS alert_settings ...
CREATE TABLE IF NOT EXISTS alert_histories ...
CREATE TABLE IF NOT EXISTS notification_histories ...

-- 初期データ投入
INSERT INTO alert_settings (
    weekly_hours_limit,
    weekly_hours_change_limit,
    consecutive_holiday_work_limit,
    monthly_overtime_limit,
    updated_by,
    created_at,
    updated_at
) VALUES (
    60, 20, 3, 80,
    (SELECT id FROM users WHERE email = 'admin@duesk.co.jp' LIMIT 1),
    NOW(), NOW()
);
```

### 8.3 ロールアウト計画

```yaml
# k8s/deployment-batch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monstera-batch
spec:
  replicas: 1
  selector:
    matchLabels:
      app: monstera-batch
  template:
    metadata:
      labels:
        app: monstera-batch
    spec:
      containers:
      - name: batch
        image: monstera-batch:latest
        env:
        - name: GO_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## 9. 運用手順書

### 9.1 監視項目

```yaml
# prometheus/alerts.yml
groups:
  - name: weekly_report_alerts
    rules:
      - alert: HighUnsubmittedRate
        expr: weekly_report_submission_rate < 0.8
        for: 1h
        annotations:
          summary: "週報提出率が80%を下回っています"
          
      - alert: BatchJobFailed
        expr: batch_job_success_rate < 1
        for: 5m
        annotations:
          summary: "バッチジョブが失敗しました"
          
      - alert: ExportQueueBacklog
        expr: export_queue_size > 100
        for: 10m
        annotations:
          summary: "エクスポートキューが滞留しています"
```

### 9.2 トラブルシューティング

```markdown
## よくある問題と対処法

### 1. バッチ処理が実行されない
- cronログ確認: `docker logs monstera-batch | grep cron`
- 手動実行: `docker exec monstera-batch ./batch -job=anomaly_detection`

### 2. エクスポートが完了しない
- ジョブステータス確認:
  ```sql
  SELECT * FROM export_jobs WHERE status = 'processing' AND created_at < NOW() - INTERVAL 1 HOUR;
  ```
- 手動リトライ: API `/api/v1/admin/export/retry/{job_id}`

### 3. 通知が届かない
- 通知履歴確認:
  ```sql
  SELECT * FROM notification_histories WHERE recipient_id = ? ORDER BY created_at DESC;
  ```
```

## 10. 付録

### 10.1 テストデータ生成スクリプト

```go
// cmd/seed/main.go
package main

func generateTestData(db *gorm.DB, userCount int) error {
    // ユーザー生成
    users := make([]model.User, userCount)
    for i := 0; i < userCount; i++ {
        users[i] = model.User{
            Name:       fmt.Sprintf("テストユーザー%d", i+1),
            Email:      fmt.Sprintf("test%d@duesk.co.jp", i+1),
            Role:       "engineer",
            Department: []string{"開発部", "営業部", "管理部"}[i%3],
        }
    }
    
    if err := db.CreateInBatches(users, 100).Error; err != nil {
        return err
    }
    
    // 週報生成（異常値パターン含む）
    for i, user := range users {
        // 通常パターン
        for w := 0; w < 8; w++ {
            report := model.WeeklyReport{
                UserID:         user.ID,
                StartDate:      time.Now().AddDate(0, 0, -7*w-7),
                EndDate:        time.Now().AddDate(0, 0, -7*w),
                Status:         "submitted",
                TotalWorkHours: 40.0 + rand.Float64()*10,
            }
            db.Create(&report)
        }
        
        // 異常値パターン（10%のユーザー）
        if i%10 == 0 {
            // 週72時間以上
            report := model.WeeklyReport{
                UserID:         user.ID,
                StartDate:      time.Now().AddDate(0, 0, -7),
                EndDate:        time.Now(),
                Status:         "submitted",
                TotalWorkHours: 72.0 + rand.Float64()*8,
            }
            db.Create(&report)
        }
    }
    
    return nil
}
```

---

以上が週報管理機能拡張の詳細設計書です。実装時はこの設計書に従い、必要に応じて詳細を調整してください。