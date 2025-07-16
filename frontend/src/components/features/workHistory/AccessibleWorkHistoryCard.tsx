import React, { useCallback, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  Divider,
  Grid,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  ButtonBase,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Work as WorkIcon,
  DateRange as DateRangeIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import type { WorkHistoryItem } from '../../../types/workHistory';
import { formatDateRange } from '../../../utils/dateUtils';
import { useResponsive } from '../../../hooks/common/useResponsive';
import { useAriaAttributes, useKeyboardNavigation } from '../../../hooks/accessibility/useAccessibility';
import { useLiveRegion } from '../../../hooks/accessibility/useFocusManagement';

const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'isFocused',
})<{ isFocused?: boolean }>(({ theme, isFocused }) => ({
  marginBottom: theme.spacing(2),
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
  
  // フォーカス時のスタイル
  ...(isFocused && {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  }),

  '&:hover': {
    boxShadow: theme.shadows[4],
    transform: 'translateY(-2px)',
  },

  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },

  [theme.breakpoints.down('sm')]: {
    marginBottom: theme.spacing(1.5),
    '&:hover': {
      transform: 'none',
      boxShadow: theme.shadows[2],
    },
  },
}));

const FocusableCardContent = styled(ButtonBase)(({ theme }) => ({
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: 0,
  borderRadius: theme.shape.borderRadius,
  '&:focus': {
    outline: 'none', // カード全体のアウトラインに依存
  },
}));

const ActionMenu = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

interface AccessibleWorkHistoryCardProps {
  workHistory: WorkHistoryItem;
  onEdit?: (workHistory: WorkHistoryItem) => void;
  onDelete?: (workHistory: WorkHistoryItem) => void;
  onView?: (workHistory: WorkHistoryItem) => void;
  showActions?: boolean;
  compact?: boolean;
  index?: number;
  totalItems?: number;
}

export const AccessibleWorkHistoryCard: React.FC<AccessibleWorkHistoryCardProps> = ({
  workHistory,
  onEdit,
  onDelete,
  onView,
  showActions = true,
  compact = false,
  index = 0,
  totalItems = 1,
}) => {
  const { isMobile } = useResponsive();
  const { getListItemAttributes, getButtonAttributes } = useAriaAttributes();
  const { handleActionKeys, handleEscapeKey } = useKeyboardNavigation();
  const { announce } = useLiveRegion();

  const [expanded, setExpanded] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const menuOpen = Boolean(menuAnchorEl);
  const cardId = `work-history-card-${workHistory.id}`;
  const titleId = `work-history-title-${workHistory.id}`;
  const detailsId = `work-history-details-${workHistory.id}`;

  // カード展開/折りたたみ
  const handleToggleExpansion = useCallback(() => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    announce(
      newExpanded 
        ? `${workHistory.projectName}の詳細を展開しました` 
        : `${workHistory.projectName}の詳細を折りたたみました`,
      'polite'
    );
  }, [expanded, workHistory.projectName, announce]);

  // メニュー操作
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    announce(`${workHistory.projectName}のアクションメニューを開きました`, 'polite');
  }, [workHistory.projectName, announce]);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
    // フォーカスをメニューボタンに戻す
    setTimeout(() => {
      menuButtonRef.current?.focus();
    }, 0);
  }, []);

  // アクション実行
  const handleEdit = useCallback(() => {
    onEdit?.(workHistory);
    handleMenuClose();
    announce(`${workHistory.projectName}の編集を開始します`, 'assertive');
  }, [onEdit, workHistory, handleMenuClose, announce]);

  const handleDelete = useCallback(() => {
    onDelete?.(workHistory);
    handleMenuClose();
    announce(`${workHistory.projectName}の削除確認を表示します`, 'assertive');
  }, [onDelete, workHistory, handleMenuClose, announce]);

  const handleView = useCallback(() => {
    onView?.(workHistory);
    handleMenuClose();
    announce(`${workHistory.projectName}の詳細表示を開始します`, 'assertive');
  }, [onView, workHistory, handleMenuClose, announce]);

  // キーボードイベント処理
  const handleCardKeyDown = useCallback((event: React.KeyboardEvent) => {
    handleActionKeys(event, handleToggleExpansion);
    handleEscapeKey(event, () => {
      if (expanded) {
        setExpanded(false);
        announce(`${workHistory.projectName}の詳細を折りたたみました`, 'polite');
      }
    });
  }, [handleActionKeys, handleEscapeKey, handleToggleExpansion, expanded, workHistory.projectName, announce]);

  const handleMenuKeyDown = useCallback((event: React.KeyboardEvent) => {
    handleEscapeKey(event, handleMenuClose);
  }, [handleEscapeKey, handleMenuClose]);

  // フォーカス管理
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // ARIA属性
  const listItemAttributes = getListItemAttributes(
    index,
    totalItems,
    workHistory.id,
    workHistory.projectName
  );

  // 日付情報の整理
  const dateRange = formatDateRange(workHistory.startDate, workHistory.endDate);
  const isActive = !workHistory.endDate;

  // 技術情報の整理
  const allTechnologies = [
    ...(workHistory.programmingLanguages || []),
    ...(workHistory.serversDatabases || []),
    ...(workHistory.tools || []),
  ];

  return (
    <StyledCard
      ref={cardRef}
      isFocused={isFocused}
      data-testid="work-history-card"
      {...listItemAttributes}
    >
      <FocusableCardContent
        onKeyDown={handleCardKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleToggleExpansion}
        aria-expanded={expanded}
        aria-controls={`${cardId}-content`}
        aria-describedby={detailsId}
      >
        <CardContent>
          {/* ヘッダー部分 */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box flex={1}>
              <Typography
                variant={compact ? "h6" : "h5"}
                component="h3"
                id={titleId}
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  color: 'primary.main',
                  wordBreak: 'break-word',
                }}
              >
                {workHistory.projectName}
              </Typography>
              
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  icon={<BusinessIcon />}
                  label={workHistory.industryName || workHistory.industry}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                
                {workHistory.companyName && (
                  <Chip
                    icon={<WorkIcon />}
                    label={workHistory.companyName}
                    size="small"
                    variant="outlined"
                  />
                )}
                
                <Chip
                  icon={<DateRangeIcon />}
                  label={dateRange}
                  size="small"
                  color={isActive ? "success" : "default"}
                  variant={isActive ? "filled" : "outlined"}
                />
              </Stack>
            </Box>

            {showActions && (
              <Box>
                <IconButton
                  ref={menuButtonRef}
                  size="small"
                  onClick={handleMenuOpen}
                  onKeyDown={handleMenuKeyDown}
                  {...getButtonAttributes('アクションメニューを開く', workHistory.projectName, undefined, true)}
                >
                  <MoreVertIcon />
                </IconButton>
                
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleExpansion();
                  }}
                  {...getButtonAttributes(
                    expanded ? '詳細を折りたたむ' : '詳細を展開する',
                    workHistory.projectName,
                    expanded
                  )}
                >
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            )}
          </Box>

          {/* 基本情報 */}
          <Grid container spacing={2} id={detailsId}>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <PeopleIcon color="action" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  役割: {workHistory.role}
                </Typography>
              </Box>
            </Grid>
            
            {workHistory.teamSize && (
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <PeopleIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    チーム規模: {workHistory.teamSize}人
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>

          {/* 技術スタック（常に表示） */}
          {allTechnologies.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                使用技術
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {allTechnologies.slice(0, compact ? 3 : 5).map((tech, techIndex) => (
                  <Chip
                    key={`${tech}-${techIndex}`}
                    label={tech}
                    size="small"
                    variant="outlined"
                    sx={{ mb: 0.5 }}
                  />
                ))}
                {allTechnologies.length > (compact ? 3 : 5) && (
                  <Chip
                    label={`+${allTechnologies.length - (compact ? 3 : 5)}個`}
                    size="small"
                    variant="outlined"
                    color="primary"
                    sx={{ mb: 0.5 }}
                  />
                )}
              </Stack>
            </Box>
          )}
        </CardContent>
      </FocusableCardContent>

      {/* 展開可能な詳細情報 */}
      <Collapse 
        in={expanded} 
        timeout="auto" 
        unmountOnExit
        id={`${cardId}-content`}
        aria-labelledby={titleId}
      >
        <Divider />
        <CardContent>
          {workHistory.projectOverview && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                プロジェクト概要
              </Typography>
              <Typography variant="body2" paragraph>
                {workHistory.projectOverview}
              </Typography>
            </Box>
          )}

          {workHistory.responsibilities && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                担当業務
              </Typography>
              <Typography variant="body2" paragraph>
                {workHistory.responsibilities}
              </Typography>
            </Box>
          )}

          {workHistory.achievements && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                実績・成果
              </Typography>
              <Typography variant="body2" paragraph>
                {workHistory.achievements}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Collapse>

      {/* アクションメニュー */}
      <Menu
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          'aria-label': `${workHistory.projectName}のアクションメニュー`,
        }}
      >
        {onView && (
          <MenuItem onClick={handleView}>
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>詳細表示</ListItemText>
          </MenuItem>
        )}
        
        {onEdit && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>編集</ListItemText>
          </MenuItem>
        )}
        
        {onDelete && (
          <MenuItem onClick={handleDelete}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>削除</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </StyledCard>
  );
};