// 経理ダッシュボード用アクティビティタイムラインコンポーネント

import React, { useMemo } from "react";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
} from "@mui/lab";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Skeleton,
  IconButton,
  Chip,
  Button,
  Avatar,
  Stack,
  useTheme,
  alpha,
  Divider,
  ListItemButton,
  Collapse,
} from "@mui/material";
import {
  Receipt,
  CheckCircle,
  Sync,
  GroupAdd,
  Edit,
  Delete,
  Schedule,
  PlayArrow,
  Error,
  Warning,
  ExpandMore,
  ExpandLess,
  Refresh,
  FilterList,
} from "@mui/icons-material";
import { formatDate, formatDateTime } from "../../../utils/format";
import {
  ACTIVITY_TYPE,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS,
} from "../../../constants/accounting";
// import { User } from "../../../types/user"; // User型が必要な場合は適切なパスに修正

// ========== 型定義 ==========

export interface ActivityData {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: {
    amount?: number;
    count?: number;
    status?: string;
    clientName?: string;
    projectGroupName?: string;
    errorMessage?: string;
    [key: string]: any;
  };
  severity?: "success" | "warning" | "error" | "info";
  relatedId?: string;
  relatedType?: string;
}

export interface ActivityTimelineProps {
  activities: ActivityData[];
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  maxItems?: number;
  showFilter?: boolean;
  onRefresh?: () => void;
  onActivityClick?: (activity: ActivityData) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  emptyMessage?: string;
  groupByDate?: boolean;
}

// ========== ユーティリティ関数 ==========

// アクティビティアイコンの取得
const getActivityIcon = (type: string): React.ReactNode => {
  const iconMap: Record<string, React.ReactNode> = {
    [ACTIVITY_TYPE.BILLING_CREATED]: <Receipt />,
    [ACTIVITY_TYPE.BILLING_COMPLETED]: <CheckCircle />,
    [ACTIVITY_TYPE.FREEE_SYNC]: <Sync />,
    [ACTIVITY_TYPE.PROJECT_GROUP_CREATED]: <GroupAdd />,
    [ACTIVITY_TYPE.PROJECT_GROUP_UPDATED]: <Edit />,
    [ACTIVITY_TYPE.PROJECT_GROUP_DELETED]: <Delete />,
    [ACTIVITY_TYPE.SCHEDULE_CREATED]: <Schedule />,
    [ACTIVITY_TYPE.SCHEDULE_EXECUTED]: <PlayArrow />,
    [ACTIVITY_TYPE.BATCH_JOB_STARTED]: <PlayArrow />,
    [ACTIVITY_TYPE.BATCH_JOB_COMPLETED]: <CheckCircle />,
  };

  return iconMap[type] || <Receipt />;
};

// 重要度に応じた色の取得
const getSeverityColor = (
  severity?: "success" | "warning" | "error" | "info",
  theme?: any,
) => {
  switch (severity) {
    case "success":
      return theme?.palette.success.main || "#4caf50";
    case "warning":
      return theme?.palette.warning.main || "#ff9800";
    case "error":
      return theme?.palette.error.main || "#f44336";
    case "info":
      return theme?.palette.info.main || "#2196f3";
    default:
      return theme?.palette.primary.main || "#1976d2";
  }
};

// ========== メインコンポーネント ==========

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  loading = false,
  error = false,
  errorMessage,
  maxItems,
  showFilter = false,
  onRefresh,
  onActivityClick,
  onLoadMore,
  hasMore = false,
  emptyMessage = "アクティビティはありません",
  groupByDate = true,
}) => {
  const theme = useTheme();
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    new Set(),
  );
  const [filterMenuAnchor, setFilterMenuAnchor] =
    React.useState<null | HTMLElement>(null);

  // 日付でグループ化
  const groupedActivities = useMemo(() => {
    if (!groupByDate) {
      return { all: activities };
    }

    const groups: Record<string, ActivityData[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    activities.forEach((activity) => {
      const activityDate = new Date(activity.timestamp);
      let groupKey: string;

      if (activityDate >= today) {
        groupKey = "今日";
      } else if (activityDate >= yesterday) {
        groupKey = "昨日";
      } else {
        groupKey = formatDate(activityDate);
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(activity);
    });

    return groups;
  }, [activities, groupByDate]);

  // グループの展開/折りたたみ
  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // 表示するアクティビティ数を制限
  const displayActivities = useMemo(() => {
    if (!maxItems) return activities;
    return activities.slice(0, maxItems);
  }, [activities, maxItems]);

  // アクティビティアイテムのレンダリング
  const renderActivityItem = (activity: ActivityData, isLast: boolean) => (
    <TimelineItem key={activity.id}>
      <TimelineOppositeContent
        sx={{ m: "auto 0", flex: 0.3 }}
        align="right"
        variant="body2"
        color="text.secondary"
      >
        {formatDateTime(activity.timestamp)}
      </TimelineOppositeContent>
      <TimelineSeparator>
        <TimelineConnector sx={{ bgcolor: "grey.300" }} />
        <TimelineDot
          sx={{
            bgcolor: getSeverityColor(activity.severity, theme),
            boxShadow: theme.shadows[2],
          }}
        >
          {getActivityIcon(activity.type)}
        </TimelineDot>
        {!isLast && <TimelineConnector sx={{ bgcolor: "grey.300" }} />}
      </TimelineSeparator>
      <TimelineContent sx={{ py: "12px", px: 2 }}>
        <Card
          sx={{
            cursor: onActivityClick ? "pointer" : "default",
            transition: "all 0.2s ease",
            "&:hover": onActivityClick
              ? {
                  transform: "translateY(-2px)",
                  boxShadow: theme.shadows[4],
                }
              : {},
          }}
          onClick={() => onActivityClick?.(activity)}
        >
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Stack spacing={1}>
              {/* タイトルとユーザー */}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Typography variant="subtitle2" fontWeight={600}>
                  {activity.title}
                </Typography>
                {activity.user && (
                  <Chip
                    avatar={
                      <Avatar
                        src={activity.user.avatar}
                        sx={{ width: 20, height: 20 }}
                      >
                        {activity.user.name.charAt(0)}
                      </Avatar>
                    }
                    label={activity.user.name}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>

              {/* 説明 */}
              {activity.description && (
                <Typography variant="body2" color="text.secondary">
                  {activity.description}
                </Typography>
              )}

              {/* メタデータ */}
              {activity.metadata && (
                <Box display="flex" gap={1} flexWrap="wrap">
                  {activity.metadata.amount && (
                    <Chip
                      label={`¥${activity.metadata.amount.toLocaleString()}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {activity.metadata.count && (
                    <Chip
                      label={`${activity.metadata.count}件`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {activity.metadata.clientName && (
                    <Chip
                      label={activity.metadata.clientName}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {activity.metadata.projectGroupName && (
                    <Chip
                      label={activity.metadata.projectGroupName}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {activity.metadata.status && (
                    <Chip
                      label={activity.metadata.status}
                      size="small"
                      color={
                        activity.metadata.status === "completed"
                          ? "success"
                          : activity.metadata.status === "failed"
                            ? "error"
                            : "default"
                      }
                    />
                  )}
                </Box>
              )}

              {/* エラーメッセージ */}
              {activity.metadata?.errorMessage && (
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                  }}
                >
                  <Typography variant="caption" color="error">
                    {activity.metadata.errorMessage}
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </TimelineContent>
    </TimelineItem>
  );

  // エラー表示
  if (error && !loading) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <Error color="error" sx={{ fontSize: 48, mb: 2 }} />
            <Typography color="error" gutterBottom>
              アクティビティの読み込みに失敗しました
            </Typography>
            {errorMessage && (
              <Typography variant="caption" color="text.secondary">
                {errorMessage}
              </Typography>
            )}
            {onRefresh && (
              <Button
                startIcon={<Refresh />}
                onClick={onRefresh}
                sx={{ mt: 2 }}
              >
                再読み込み
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  // 空の状態
  if (!loading && activities.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <Receipt sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
            <Typography color="text.secondary">{emptyMessage}</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="アクティビティ"
        action={
          <Stack direction="row" spacing={1}>
            {showFilter && (
              <IconButton
                size="small"
                onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
              >
                <FilterList />
              </IconButton>
            )}
            {onRefresh && (
              <IconButton size="small" onClick={onRefresh}>
                <Refresh />
              </IconButton>
            )}
          </Stack>
        }
      />
      <Divider />
      <CardContent sx={{ p: 0 }}>
        {loading ? (
          <Box p={3}>
            {[1, 2, 3].map((i) => (
              <Box key={i} mb={3}>
                <Skeleton variant="text" width="30%" height={20} />
                <Skeleton variant="rectangular" height={80} sx={{ mt: 1 }} />
              </Box>
            ))}
          </Box>
        ) : groupByDate ? (
          // 日付でグループ化された表示
          Object.entries(groupedActivities).map(([date, activities]) => (
            <Box key={date}>
              <ListItemButton
                onClick={() => toggleGroup(date)}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <Typography variant="subtitle2" flex={1}>
                  {date}
                </Typography>
                <Chip label={activities.length} size="small" sx={{ mr: 1 }} />
                {expandedGroups.has(date) ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={expandedGroups.has(date)}>
                <Timeline position="alternate">
                  {activities.map((activity, index) =>
                    renderActivityItem(
                      activity,
                      index === activities.length - 1,
                    ),
                  )}
                </Timeline>
              </Collapse>
            </Box>
          ))
        ) : (
          // 通常のタイムライン表示
          <Timeline position="alternate">
            {displayActivities.map((activity, index) =>
              renderActivityItem(
                activity,
                index === displayActivities.length - 1,
              ),
            )}
          </Timeline>
        )}

        {/* もっと読み込む */}
        {hasMore && onLoadMore && !loading && (
          <Box textAlign="center" p={2}>
            <Button onClick={onLoadMore} variant="outlined">
              もっと見る
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ========== コンパクトアクティビティリスト ==========

export interface CompactActivityListProps {
  activities: ActivityData[];
  maxItems?: number;
  onActivityClick?: (activity: ActivityData) => void;
  onViewAll?: () => void;
}

export const CompactActivityList: React.FC<CompactActivityListProps> = ({
  activities,
  maxItems = 5,
  onActivityClick,
  onViewAll,
}) => {
  const theme = useTheme();
  const displayActivities = activities.slice(0, maxItems);

  return (
    <Stack spacing={1}>
      {displayActivities.map((activity) => (
        <Box
          key={activity.id}
          sx={{
            p: 1.5,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.background.default, 0.5),
            cursor: onActivityClick ? "pointer" : "default",
            transition: "all 0.2s ease",
            "&:hover": onActivityClick
              ? {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                }
              : {},
          }}
          onClick={() => onActivityClick?.(activity)}
        >
          <Box display="flex" alignItems="flex-start" gap={1.5}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: getSeverityColor(activity.severity, theme),
              }}
            >
              {getActivityIcon(activity.type)}
            </Avatar>
            <Box flex={1}>
              <Typography variant="body2" fontWeight={500}>
                {activity.title}
              </Typography>
              {activity.description && (
                <Typography variant="caption" color="text.secondary">
                  {activity.description}
                </Typography>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={0.5}
              >
                {formatDateTime(activity.timestamp)}
              </Typography>
            </Box>
          </Box>
        </Box>
      ))}

      {activities.length > maxItems && onViewAll && (
        <Button
          size="small"
          onClick={onViewAll}
          sx={{ alignSelf: "flex-start" }}
        >
          すべて表示 ({activities.length}件)
        </Button>
      )}
    </Stack>
  );
};

// ========== アクティビティ統計コンポーネント ==========

export interface ActivityStatsProps {
  activities: ActivityData[];
  period?: "day" | "week" | "month";
}

export const ActivityStats: React.FC<ActivityStatsProps> = ({
  activities,
  period = "day",
}) => {
  const theme = useTheme();

  // 統計を計算
  const stats = useMemo(() => {
    const typeCount: Record<string, number> = {};
    const severityCount: Record<string, number> = {
      success: 0,
      warning: 0,
      error: 0,
      info: 0,
    };

    activities.forEach((activity) => {
      // タイプ別カウント
      typeCount[activity.type] = (typeCount[activity.type] || 0) + 1;

      // 重要度別カウント
      if (activity.severity) {
        severityCount[activity.severity]++;
      }
    });

    // 最も多いアクティビティタイプ
    const mostCommonType = Object.entries(typeCount).reduce(
      (max, [type, count]) => (count > max.count ? { type, count } : max),
      { type: "", count: 0 },
    );

    return {
      total: activities.length,
      typeCount,
      severityCount,
      mostCommonType,
    };
  }, [activities]);

  return (
    <Stack spacing={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">アクティビティ統計</Typography>
        <Chip
          label={`過去1${period === "day" ? "日" : period === "week" ? "週間" : "ヶ月"}`}
          size="small"
        />
      </Box>

      <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
          }}
        >
          <Typography variant="h4" fontWeight={700} color="primary">
            {stats.total}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            総アクティビティ数
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.success.main, 0.05),
          }}
        >
          <Typography variant="h4" fontWeight={700} color="success.main">
            {stats.severityCount.success}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            成功
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.warning.main, 0.05),
          }}
        >
          <Typography variant="h4" fontWeight={700} color="warning.main">
            {stats.severityCount.warning}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            警告
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.error.main, 0.05),
          }}
        >
          <Typography variant="h4" fontWeight={700} color="error">
            {stats.severityCount.error}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            エラー
          </Typography>
        </Box>
      </Box>

      {stats.mostCommonType.type && (
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.info.main, 0.05),
            textAlign: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            最も多いアクティビティ
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {ACTIVITY_TYPE_LABELS[stats.mostCommonType.type] ||
              stats.mostCommonType.type}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({stats.mostCommonType.count}件)
          </Typography>
        </Box>
      )}
    </Stack>
  );
};
