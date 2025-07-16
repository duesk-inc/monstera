import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { useResponsive } from '../../../hooks/common/useResponsive';
import {
  BusinessCenter as ProjectIcon,
  TrendingUp as TrendingIcon,
  Code as TechIcon,
  Group as TeamIcon,
  Schedule as TimeIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { TechnologySkillSummary } from './TechnologySkillSummary';
import { WorkHistoryLoadingState } from './WorkHistoryLoadingState';
import type { WorkHistorySummary, ITExperience, WorkHistoryItem, TechnologyExperience } from '../../../types/workHistory';

const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[4],
    transform: 'translateY(-2px)',
  },
  [theme.breakpoints.down('sm')]: {
    '&:hover': {
      transform: 'none',
      boxShadow: theme.shadows[2],
    },
  },
}));

const StatsIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 48,
  height: 48,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    width: 40,
    height: 40,
    marginBottom: theme.spacing(0.5),
  },
}));

const StatsValue = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 'bold',
  lineHeight: 1,
  marginBottom: theme.spacing(0.5),
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.5rem',
  },
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const TechListContainer = styled(Box)(() => ({
  maxHeight: 200,
  overflowY: 'auto',
}));

interface WorkHistoryStatsProps {
  summary?: WorkHistorySummary;
  itExperience?: ITExperience;
  workHistories?: WorkHistoryItem[];
  technologiesExperience?: TechnologyExperience[];
  isLoading?: boolean;
}

export const WorkHistoryStats: React.FC<WorkHistoryStatsProps> = ({
  summary,
  itExperience,
  workHistories = [],
  technologiesExperience = [],
  isLoading = false,
}) => {
  const { isMobile, getSpacing } = useResponsive();
  // 統計データの計算
  const stats = React.useMemo(() => {
    const totalProjects = summary?.totalProjectCount || workHistories.length;
    const activeProjects = summary?.activeProjectCount || workHistories.filter(w => w.isActive).length;
    
    // 技術統計
    const allTechnologies = new Set([
      ...workHistories.flatMap(w => w.programmingLanguages || []),
      ...workHistories.flatMap(w => w.serversDatabases || []),
      ...workHistories.flatMap(w => w.tools || []),
    ]);
    const totalTechnologies = summary?.totalTechnologyCount || allTechnologies.size;
    
    // チーム規模統計
    const teamSizes = workHistories.map(w => w.teamSize).filter(Boolean);
    const avgTeamSize = teamSizes.length > 0 
      ? Math.round(teamSizes.reduce((sum, size) => sum + size, 0) / teamSizes.length)
      : 0;
    const maxTeamSize = teamSizes.length > 0 ? Math.max(...teamSizes) : 0;
    
    // 技術カテゴリ別統計
    const techCounts = {
      programmingLanguages: new Set(workHistories.flatMap(w => w.programmingLanguages || [])).size,
      serversDatabases: new Set(workHistories.flatMap(w => w.serversDatabases || [])).size,
      tools: new Set(workHistories.flatMap(w => w.tools || [])).size,
    };
    
    // 人気技術TOP5
    const techFrequency: Record<string, number> = {};
    workHistories.forEach(w => {
      [...(w.programmingLanguages || []), ...(w.serversDatabases || []), ...(w.tools || [])].forEach(tech => {
        techFrequency[tech] = (techFrequency[tech] || 0) + 1;
      });
    });
    
    const topTechnologies = Object.entries(techFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tech, count]) => ({ name: tech, count }));

    return {
      totalProjects,
      activeProjects,
      totalTechnologies,
      avgTeamSize,
      maxTeamSize,
      techCounts,
      topTechnologies,
      projectProgress: totalProjects > 0 ? (activeProjects / totalProjects) * 100 : 0,
    };
  }, [summary, workHistories]);

  const getITExperienceLevel = (months: number) => {
    if (months < 12) return { level: '初級', color: 'info' as const };
    if (months < 36) return { level: 'ミドル', color: 'warning' as const };
    if (months < 72) return { level: 'シニア', color: 'success' as const };
    return { level: 'エキスパート', color: 'error' as const };
  };

  const experienceLevel = itExperience 
    ? getITExperienceLevel(itExperience.totalMonths)
    : { level: '未設定', color: 'default' as const };

  if (isLoading) {
    return (
      <Box sx={{ mb: 3 }}>
        <WorkHistoryLoadingState
          variant="stats"
          showHeader={false}
        />
      </Box>
    );
  }

  return (
    <Grid container spacing={getSpacing()} sx={{ mb: isMobile ? 2 : 3 }} data-testid="work-history-stats">
      {/* IT経験年数 */}
      <Grid item xs={isMobile ? 12 : 6} md={3}>
        <StatsCard>
          <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
            <StatsIcon sx={{ 
              bgcolor: 'primary.light', 
              color: 'primary.main', 
              mx: 'auto',
              mb: isMobile ? 1 : 1.5,
            }}>
              <TimeIcon sx={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }} />
            </StatsIcon>
            <StatsValue color="primary">
              {itExperience?.text || '未設定'}
            </StatsValue>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              gutterBottom
              sx={{ fontSize: isMobile ? '0.75rem' : undefined }}
            >
              IT経験年数
            </Typography>
            <Chip
              label={experienceLevel.level}
              color={experienceLevel.color}
              size={isMobile ? "small" : "small"}
              variant="outlined"
              sx={{ fontSize: isMobile ? '0.7rem' : undefined }}
            />
          </CardContent>
        </StatsCard>
      </Grid>

      {/* プロジェクト数 */}
      <Grid item xs={isMobile ? 12 : 6} md={3}>
        <StatsCard>
          <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
            <StatsIcon sx={{ 
              bgcolor: 'info.light', 
              color: 'info.main', 
              mx: 'auto',
              mb: isMobile ? 1 : 1.5,
            }}>
              <ProjectIcon sx={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }} />
            </StatsIcon>
            <StatsValue color="info.main">
              {stats.totalProjects}
            </StatsValue>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              gutterBottom
              sx={{ fontSize: isMobile ? '0.75rem' : undefined }}
            >
              総プロジェクト数
            </Typography>
            {stats.activeProjects > 0 && (
              <Chip
                label={`進行中: ${stats.activeProjects}件`}
                color="success"
                size={isMobile ? "small" : "small"}
                variant="filled"
                sx={{ 
                  fontSize: isMobile ? '0.65rem' : undefined,
                  height: isMobile ? 20 : undefined,
                  mb: isMobile ? 1 : 0,
                }}
              />
            )}
            {!isMobile && (
              <ProgressContainer>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">完了率</Typography>
                  <Typography variant="caption">
                    {(100 - stats.projectProgress).toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={100 - stats.projectProgress}
                  color="info"
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </ProgressContainer>
            )}
          </CardContent>
        </StatsCard>
      </Grid>

      {/* 使用技術数 */}
      <Grid item xs={isMobile ? 12 : 6} md={3}>
        <StatsCard>
          <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
            <StatsIcon sx={{ 
              bgcolor: 'success.light', 
              color: 'success.main', 
              mx: 'auto',
              mb: isMobile ? 1 : 1.5,
            }}>
              <TechIcon sx={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }} />
            </StatsIcon>
            <StatsValue color="success.main">
              {stats.totalTechnologies}
            </StatsValue>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              gutterBottom
              sx={{ fontSize: isMobile ? '0.75rem' : undefined }}
            >
              使用技術数
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: isMobile ? 0.25 : 0.5, 
              justifyContent: 'center',
              flexDirection: isMobile ? 'column' : 'row',
            }}>
              <Chip 
                label={`言語: ${stats.techCounts.programmingLanguages}`} 
                size="small" 
                variant="outlined" 
                sx={{ 
                  fontSize: isMobile ? '0.65rem' : undefined,
                  height: isMobile ? 20 : undefined,
                }}
              />
              <Chip 
                label={`DB: ${stats.techCounts.serversDatabases}`} 
                size="small" 
                variant="outlined" 
                sx={{ 
                  fontSize: isMobile ? '0.65rem' : undefined,
                  height: isMobile ? 20 : undefined,
                }}
              />
              <Chip 
                label={`ツール: ${stats.techCounts.tools}`} 
                size="small" 
                variant="outlined" 
                sx={{ 
                  fontSize: isMobile ? '0.65rem' : undefined,
                  height: isMobile ? 20 : undefined,
                }}
              />
            </Box>
          </CardContent>
        </StatsCard>
      </Grid>

      {/* チーム規模 */}
      <Grid item xs={isMobile ? 12 : 6} md={3}>
        <StatsCard>
          <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
            <StatsIcon sx={{ 
              bgcolor: 'warning.light', 
              color: 'warning.main', 
              mx: 'auto',
              mb: isMobile ? 1 : 1.5,
            }}>
              <TeamIcon sx={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }} />
            </StatsIcon>
            <StatsValue color="warning.main">
              {stats.avgTeamSize}
            </StatsValue>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              gutterBottom
              sx={{ fontSize: isMobile ? '0.75rem' : undefined }}
            >
              平均チーム規模
            </Typography>
            {stats.maxTeamSize > 0 && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: isMobile ? '0.7rem' : undefined }}
              >
                最大: {stats.maxTeamSize}名
              </Typography>
            )}
          </CardContent>
        </StatsCard>
      </Grid>

      {/* 人気技術TOP5 */}
      {stats.topTechnologies.length > 0 && (
        <Grid item xs={12} md={6}>
          <StatsCard>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: isMobile ? 1.5 : 2,
                flexDirection: isMobile ? 'column' : 'row',
                textAlign: isMobile ? 'center' : 'left',
              }}>
                <StatsIcon sx={{ 
                  bgcolor: 'secondary.light', 
                  color: 'secondary.main', 
                  mr: isMobile ? 0 : 1,
                  mb: isMobile ? 1 : 0,
                }}>
                  <StarIcon sx={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }} />
                </StatsIcon>
                <Typography 
                  variant={isMobile ? 'subtitle1' : 'h6'} 
                  component="h3"
                  sx={{ fontSize: isMobile ? '1rem' : undefined }}
                >
                  よく使う技術 TOP5
                </Typography>
              </Box>
              <TechListContainer>
                <List dense={!isMobile}>
                  {stats.topTechnologies.map((tech, index) => (
                    <React.Fragment key={tech.name}>
                      <ListItem sx={{ 
                        px: 0, 
                        py: isMobile ? 1 : 0.5,
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'stretch' : 'center',
                      }}>
                        <ListItemText
                          primary={
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              justifyContent: isMobile ? 'center' : 'flex-start',
                              mb: isMobile ? 0.5 : 0,
                            }}>
                              <Chip
                                label={index + 1}
                                size={isMobile ? 'medium' : 'small'}
                                color={index === 0 ? 'warning' : 'default'}
                                variant={index === 0 ? 'filled' : 'outlined'}
                                sx={{
                                  fontSize: isMobile ? '0.8rem' : undefined,
                                  height: isMobile ? 28 : undefined,
                                  minWidth: isMobile ? 28 : undefined,
                                }}
                              />
                              <Typography 
                                variant={isMobile ? 'body1' : 'body2'} 
                                fontWeight="medium"
                                sx={{ fontSize: isMobile ? '0.9rem' : undefined }}
                              >
                                {tech.name}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: isMobile ? 1 : 0.5 }}>
                              <LinearProgress
                                variant="determinate"
                                value={(tech.count / stats.totalProjects) * 100}
                                color="secondary"
                                sx={{ 
                                  height: isMobile ? 6 : 4, 
                                  borderRadius: isMobile ? 3 : 2,
                                }}
                              />
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ 
                                  fontSize: isMobile ? '0.75rem' : undefined,
                                  display: 'block',
                                  textAlign: isMobile ? 'center' : 'left',
                                  mt: isMobile ? 0.5 : 0,
                                }}
                              >
                                {tech.count}プロジェクトで使用
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < stats.topTechnologies.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </TechListContainer>
            </CardContent>
          </StatsCard>
        </Grid>
      )}

      {/* 最新プロジェクト情報 */}
      {summary?.latestProjectName && (
        <Grid item xs={12} md={6}>
          <StatsCard>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: isMobile ? 1.5 : 2,
                flexDirection: isMobile ? 'column' : 'row',
                textAlign: isMobile ? 'center' : 'left',
              }}>
                <StatsIcon sx={{ 
                  bgcolor: 'primary.light', 
                  color: 'primary.main', 
                  mr: isMobile ? 0 : 1,
                  mb: isMobile ? 1 : 0,
                }}>
                  <TrendingIcon sx={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }} />
                </StatsIcon>
                <Typography 
                  variant={isMobile ? 'subtitle1' : 'h6'} 
                  component="h3"
                  sx={{ fontSize: isMobile ? '1rem' : undefined }}
                >
                  最新プロジェクト
                </Typography>
              </Box>
              <Typography 
                variant={isMobile ? 'subtitle1' : 'body1'} 
                fontWeight="medium" 
                gutterBottom
                sx={{ 
                  fontSize: isMobile ? '0.95rem' : undefined,
                  textAlign: isMobile ? 'center' : 'left',
                  lineHeight: isMobile ? 1.4 : undefined,
                }}
              >
                {summary.latestProjectName}
              </Typography>
              {summary.latestRole && (
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  gutterBottom
                  sx={{ 
                    fontSize: isMobile ? '0.8rem' : undefined,
                    textAlign: isMobile ? 'center' : 'left',
                  }}
                >
                  役割: {summary.latestRole}
                </Typography>
              )}
              {summary.lastProjectDate && (
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: isMobile ? '0.75rem' : undefined,
                    display: 'block',
                    textAlign: isMobile ? 'center' : 'left',
                  }}
                >
                  {new Date(summary.lastProjectDate).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </Typography>
              )}
            </CardContent>
          </StatsCard>
        </Grid>
      )}

      {/* 技術スキルサマリー */}
      <Grid item xs={12}>
        <TechnologySkillSummary
          workHistories={workHistories}
          technologiesExperience={technologiesExperience}
          isLoading={isLoading}
          showDetails={true}
        />
      </Grid>
    </Grid>
  );
};

export default WorkHistoryStats;