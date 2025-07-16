import React, { useState } from 'react';
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
  useTheme,
  useMediaQuery,
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
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import type { WorkHistoryItem } from '../../../types/workHistory';
import { formatDateRange } from '../../../utils/dateUtils';
import { useResponsive } from '../../../hooks/common/useResponsive';

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[4],
    transform: 'translateY(-2px)',
  },
  [theme.breakpoints.down('sm')]: {
    marginBottom: theme.spacing(1.5),
    '&:hover': {
      transform: 'none', // モバイルではhover効果を軽減
      boxShadow: theme.shadows[2],
    },
  },
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
}));

const ProjectTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(0.5),
}));

const InfoRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  '& .MuiSvgIcon-root': {
    fontSize: '1rem',
    color: theme.palette.text.secondary,
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.875rem',
    },
  },
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(0.75),
    marginBottom: theme.spacing(0.25),
  },
}));

const TechnologyChipsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(0.25),
    marginTop: theme.spacing(0.75),
  },
}));

const DetailSection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

interface WorkHistoryCardProps {
  workHistory: WorkHistoryItem;
  onEdit?: (workHistory: WorkHistoryItem) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  expanded?: boolean;
  compact?: boolean; // コンパクト表示モード
}

export const WorkHistoryCard: React.FC<WorkHistoryCardProps> = ({
  workHistory,
  onEdit,
  onDelete,
  showActions = true,
  expanded: controlledExpanded,
  compact: propCompact,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded ?? internalExpanded;
  const { isMobile, isTablet, showCompactView } = useResponsive();
  const compact = propCompact ?? (isMobile || showCompactView);

  const handleExpandClick = () => {
    if (controlledExpanded === undefined) {
      setInternalExpanded(!internalExpanded);
    }
  };

  const handleEdit = () => {
    onEdit?.(workHistory);
  };

  const handleDelete = () => {
    if (workHistory.id) {
      onDelete?.(workHistory.id);
    }
  };

  // 技術情報の統合
  const allTechnologies = [
    ...(workHistory.programmingLanguages || []),
    ...(workHistory.serversDatabases || []),
    ...(workHistory.tools || []),
  ];

  // 期間の計算とフォーマット
  const dateRange = formatDateRange(workHistory.startDate, workHistory.endDate);
  const duration = workHistory.durationText || workHistory.duration?.text || '';

  return (
    <StyledCard>
      <CardContent>
        <HeaderSection>
          <Box flex={1}>
            <ProjectTitle 
              variant={isMobile ? 'subtitle1' : 'h6'} 
              component="h3"
              sx={{
                fontSize: isMobile ? '1.1rem' : undefined,
                lineHeight: isMobile ? 1.3 : undefined,
              }}
            >
              {workHistory.projectName}
            </ProjectTitle>
            
            {compact ? (
              // コンパクト表示：縦に並べる
              <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary">
                    {dateRange}
                  </Typography>
                  {duration && (
                    <Typography variant="caption" color="text.secondary">
                      ({duration})
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary">
                    {workHistory.industryName || `業種${workHistory.industry}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {workHistory.teamSize}名
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {workHistory.role}
                  </Typography>
                </Box>
              </Stack>
            ) : (
              // 通常表示：アイコン付き
              <>
                <InfoRow>
                  <DateRangeIcon />
                  <Typography variant="body2" color="text.secondary">
                    {dateRange}
                    {duration && ` (${duration})`}
                  </Typography>
                </InfoRow>

                <InfoRow>
                  <BusinessIcon />
                  <Typography variant="body2" color="text.secondary">
                    {workHistory.industryName || `業種${workHistory.industry}`}
                  </Typography>
                </InfoRow>

                <InfoRow>
                  <PeopleIcon />
                  <Typography variant="body2" color="text.secondary">
                    {workHistory.teamSize}名規模
                  </Typography>
                </InfoRow>

                <InfoRow>
                  <WorkIcon />
                  <Typography variant="body2" color="text.secondary">
                    {workHistory.role}
                  </Typography>
                </InfoRow>
              </>
            )}
          </Box>

          {/* アクションボタン */}
          {showActions && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'row' : 'column',
              gap: 0.5,
              alignSelf: isMobile ? 'flex-start' : 'flex-start',
            }}>
              <IconButton
                size={isMobile ? 'small' : 'small'}
                onClick={handleExpandClick}
                aria-label={expanded ? '折りたたむ' : '詳細を表示'}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              
              {isMobile ? (
                // モバイルでは横並びで省スペース
                <>
                  {onEdit && (
                    <IconButton
                      size="small"
                      onClick={handleEdit}
                      aria-label="編集"
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                  {onDelete && workHistory.id && (
                    <IconButton
                      size="small"
                      onClick={handleDelete}
                      aria-label="削除"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </>
              ) : (
                // デスクトップでは縦並び
                <>
                  {onEdit && (
                    <IconButton
                      size="small"
                      onClick={handleEdit}
                      aria-label="編集"
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                  {onDelete && workHistory.id && (
                    <IconButton
                      size="small"
                      onClick={handleDelete}
                      aria-label="削除"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </>
              )}
            </Box>
          )}
        </HeaderSection>

        {/* 技術タグ */}
        {allTechnologies.length > 0 && (
          <TechnologyChipsContainer>
            {allTechnologies.slice(0, compact ? 4 : 6).map((tech, index) => (
              <Chip
                key={index}
                label={tech}
                size={compact ? "small" : "small"}
                variant="outlined"
                color="primary"
                sx={{
                  fontSize: compact ? '0.7rem' : undefined,
                  height: compact ? 24 : undefined,
                }}
              />
            ))}
            {allTechnologies.length > (compact ? 4 : 6) && (
              <Chip
                label={`+${allTechnologies.length - (compact ? 4 : 6)}個`}
                size={compact ? "small" : "small"}
                variant="outlined"
                color="default"
                sx={{
                  fontSize: compact ? '0.7rem' : undefined,
                  height: compact ? 24 : undefined,
                }}
              />
            )}
          </TechnologyChipsContainer>
        )}

        {/* 詳細セクション */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <DetailSection>
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={isMobile ? 1.5 : 2}>
              {/* プロジェクト概要 */}
              {workHistory.projectOverview && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    プロジェクト概要
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    paragraph
                    sx={{
                      fontSize: isMobile ? '0.85rem' : undefined,
                      lineHeight: isMobile ? 1.4 : undefined,
                    }}
                  >
                    {workHistory.projectOverview}
                  </Typography>
                </Grid>
              )}

              {/* 担当業務 */}
              {workHistory.responsibilities && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    担当業務
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    paragraph
                    sx={{
                      fontSize: isMobile ? '0.85rem' : undefined,
                      lineHeight: isMobile ? 1.4 : undefined,
                    }}
                  >
                    {workHistory.responsibilities}
                  </Typography>
                </Grid>
              )}

              {/* 成果・実績 */}
              {workHistory.achievements && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    成果・実績
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    paragraph
                    sx={{
                      fontSize: isMobile ? '0.85rem' : undefined,
                      lineHeight: isMobile ? 1.4 : undefined,
                    }}
                  >
                    {workHistory.achievements}
                  </Typography>
                </Grid>
              )}

              {/* 担当工程 */}
              {workHistory.processNames && workHistory.processNames.length > 0 && (
                <Grid item xs={12} md={isMobile ? 12 : 6}>
                  <Typography variant="subtitle2" gutterBottom>
                    担当工程
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 0.25 : 0.5 }}>
                    {workHistory.processNames.map((process, index) => (
                      <Chip
                        key={index}
                        label={process}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{
                          fontSize: isMobile ? '0.7rem' : undefined,
                          height: isMobile ? 24 : undefined,
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
              )}

              {/* 使用技術詳細 */}
              {allTechnologies.length > 0 && (
                <Grid item xs={12} md={isMobile ? 12 : 6}>
                  <Typography variant="subtitle2" gutterBottom>
                    使用技術 ({allTechnologies.length}個)
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 0.25 : 0.5 }}>
                    {allTechnologies.map((tech, index) => (
                      <Chip
                        key={index}
                        label={tech}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{
                          fontSize: isMobile ? '0.7rem' : undefined,
                          height: isMobile ? 24 : undefined,
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
              )}

              {/* 備考 */}
              {workHistory.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    備考
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{
                      fontSize: isMobile ? '0.85rem' : undefined,
                      lineHeight: isMobile ? 1.4 : undefined,
                    }}
                  >
                    {workHistory.notes}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </DetailSection>
        </Collapse>
      </CardContent>

      {/* カードアクション（下部） */}
      {showActions && (onEdit || onDelete) && (
        <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
          {onEdit && (
            <IconButton
              size="small"
              onClick={handleEdit}
              aria-label="編集"
              color="primary"
            >
              <EditIcon />
            </IconButton>
          )}
          {onDelete && workHistory.id && (
            <IconButton
              size="small"
              onClick={handleDelete}
              aria-label="削除"
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          )}
        </CardActions>
      )}
    </StyledCard>
  );
};

export default WorkHistoryCard;