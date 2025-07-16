import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  Build as BuildIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { format, differenceInMonths } from 'date-fns';
import type { WorkHistoryData, TechnologyExperience } from '../../../types/workHistory';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));

const CategoryHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
}));

const SkillChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
}));

const ExperienceBar = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  marginTop: theme.spacing(1),
}));

const MetricBox = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[50],
}));

const TabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

interface TechnologySkillSummaryProps {
  workHistories?: WorkHistoryData[];
  technologiesExperience?: TechnologyExperience[];
  isLoading?: boolean;
  showDetails?: boolean;
}

interface TechnologyStats {
  name: string;
  category: string;
  projectCount: number;
  totalMonths: number;
  lastUsed?: Date;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export const TechnologySkillSummary: React.FC<TechnologySkillSummaryProps> = ({
  workHistories = [],
  technologiesExperience = [],
  isLoading = false,
  showDetails = true,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // 技術統計の計算
  const calculateTechnologyStats = (): TechnologyStats[] => {
    const techMap = new Map<string, TechnologyStats>();

    // 職務経歴から技術情報を集計
    workHistories.forEach((history) => {
      const projectDate = history.startDate ? new Date(history.startDate) : new Date();
      
      // プログラミング言語
      history.programmingLanguages?.forEach((tech) => {
        updateTechStats(techMap, tech, 'programmingLanguages', projectDate, history);
      });

      // サーバー・データベース
      history.serversDatabases?.forEach((tech) => {
        updateTechStats(techMap, tech, 'serversDatabases', projectDate, history);
      });

      // ツール
      history.tools?.forEach((tech) => {
        updateTechStats(techMap, tech, 'tools', projectDate, history);
      });
    });

    // 経験期間情報を統合
    technologiesExperience.forEach((exp) => {
      const tech = techMap.get(exp.name);
      if (tech) {
        tech.totalMonths = exp.years * 12 + exp.months;
        tech.experienceLevel = getExperienceLevel(tech.totalMonths);
      }
    });

    return Array.from(techMap.values()).sort((a, b) => b.totalMonths - a.totalMonths);
  };

  const updateTechStats = (
    techMap: Map<string, TechnologyStats>,
    techName: string,
    category: string,
    projectDate: Date,
    history: WorkHistoryData
  ) => {
    const existing = techMap.get(techName);
    
    if (existing) {
      existing.projectCount++;
      if (!existing.lastUsed || projectDate > existing.lastUsed) {
        existing.lastUsed = projectDate;
      }
      
      // プロジェクト期間を加算
      if (history.startDate && history.endDate) {
        const months = differenceInMonths(
          new Date(history.endDate),
          new Date(history.startDate)
        );
        existing.totalMonths += months;
      }
    } else {
      let totalMonths = 0;
      if (history.startDate && history.endDate) {
        totalMonths = differenceInMonths(
          new Date(history.endDate),
          new Date(history.startDate)
        );
      }

      techMap.set(techName, {
        name: techName,
        category,
        projectCount: 1,
        totalMonths,
        lastUsed: projectDate,
        experienceLevel: getExperienceLevel(totalMonths),
      });
    }
  };

  const getExperienceLevel = (months: number): TechnologyStats['experienceLevel'] => {
    if (months < 6) return 'beginner';
    if (months < 24) return 'intermediate';
    if (months < 60) return 'advanced';
    return 'expert';
  };

  const getExperienceLevelLabel = (level: TechnologyStats['experienceLevel']) => {
    switch (level) {
      case 'beginner': return '初級';
      case 'intermediate': return '中級';
      case 'advanced': return '上級';
      case 'expert': return 'エキスパート';
    }
  };

  const getExperienceLevelColor = (level: TechnologyStats['experienceLevel']) => {
    switch (level) {
      case 'beginner': return 'info';
      case 'intermediate': return 'primary';
      case 'advanced': return 'success';
      case 'expert': return 'error';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'programmingLanguages':
        return <CodeIcon />;
      case 'serversDatabases':
        return <StorageIcon />;
      case 'tools':
        return <BuildIcon />;
      default:
        return <CodeIcon />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'programmingLanguages':
        return 'プログラミング言語';
      case 'serversDatabases':
        return 'サーバー・データベース';
      case 'tools':
        return 'ツール・その他';
      default:
        return category;
    }
  };

  const techStats = calculateTechnologyStats();
  const categoryStats = {
    programmingLanguages: techStats.filter(t => t.category === 'programmingLanguages'),
    serversDatabases: techStats.filter(t => t.category === 'serversDatabases'),
    tools: techStats.filter(t => t.category === 'tools'),
  };

  // 統計サマリー
  const summary = {
    totalTechnologies: techStats.length,
    expertCount: techStats.filter(t => t.experienceLevel === 'expert').length,
    advancedCount: techStats.filter(t => t.experienceLevel === 'advanced').length,
    averageExperience: techStats.length > 0
      ? Math.round(techStats.reduce((sum, t) => sum + t.totalMonths, 0) / techStats.length)
      : 0,
  };

  const formatExperienceDuration = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) return `${remainingMonths}ヶ月`;
    if (remainingMonths === 0) return `${years}年`;
    return `${years}年${remainingMonths}ヶ月`;
  };

  if (isLoading) {
    return (
      <StyledCard>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>読み込み中...</Typography>
          </Box>
        </CardContent>
      </StyledCard>
    );
  }

  return (
    <StyledCard>
      <CardContent>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            技術スキルサマリー
          </Typography>
          {showDetails && (
            <IconButton onClick={() => setExpanded(!expanded)} size="small">
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>

        {/* サマリー統計 */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <MetricBox>
              <Typography variant="h4" color="primary">
                {summary.totalTechnologies}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                総技術数
              </Typography>
            </MetricBox>
          </Grid>
          <Grid item xs={6} sm={3}>
            <MetricBox>
              <Typography variant="h4" color="error">
                {summary.expertCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                エキスパート
              </Typography>
            </MetricBox>
          </Grid>
          <Grid item xs={6} sm={3}>
            <MetricBox>
              <Typography variant="h4" color="success">
                {summary.advancedCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                上級レベル
              </Typography>
            </MetricBox>
          </Grid>
          <Grid item xs={6} sm={3}>
            <MetricBox>
              <Typography variant="h4" color="secondary">
                {formatExperienceDuration(summary.averageExperience)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                平均経験
              </Typography>
            </MetricBox>
          </Grid>
        </Grid>

        {/* 詳細表示 */}
        <Collapse in={expanded && showDetails}>
          <Divider sx={{ mb: 2 }} />
          
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="カテゴリ別" icon={<ChartIcon />} iconPosition="start" />
            <Tab label="スキルマトリクス" icon={<TableChartIcon />} iconPosition="start" />
            <Tab label="経験レベル別" icon={<TrendingUpIcon />} iconPosition="start" />
          </Tabs>

          {/* カテゴリ別表示 */}
          {activeTab === 0 && (
            <TabPanel>
              {Object.entries(categoryStats).map(([category, techs]) => (
                <Box key={category} sx={{ mb: 3 }}>
                  <CategoryHeader>
                    {getCategoryIcon(category)}
                    <Typography variant="subtitle1" fontWeight="medium">
                      {getCategoryLabel(category)}
                    </Typography>
                    <Chip label={`${techs.length}個`} size="small" color="primary" />
                  </CategoryHeader>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {techs.slice(0, 10).map((tech) => (
                      <Tooltip
                        key={tech.name}
                        title={
                          <Box>
                            <Typography variant="body2">
                              経験: {formatExperienceDuration(tech.totalMonths)}
                            </Typography>
                            <Typography variant="body2">
                              プロジェクト数: {tech.projectCount}
                            </Typography>
                            {tech.lastUsed && (
                              <Typography variant="body2">
                                最終使用: {format(tech.lastUsed, 'yyyy年MM月')}
                              </Typography>
                            )}
                          </Box>
                        }
                      >
                        <SkillChip
                          label={tech.name}
                          color={getExperienceLevelColor(tech.experienceLevel) as any}
                          icon={tech.experienceLevel === 'expert' ? <StarIcon /> : undefined}
                          variant={tech.experienceLevel === 'expert' ? 'filled' : 'outlined'}
                        />
                      </Tooltip>
                    ))}
                    {techs.length > 10 && (
                      <Chip
                        label={`他${techs.length - 10}個`}
                        variant="outlined"
                        color="default"
                      />
                    )}
                  </Box>
                </Box>
              ))}
            </TabPanel>
          )}

          {/* スキルマトリクス */}
          {activeTab === 1 && (
            <TabPanel>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>技術名</TableCell>
                      <TableCell>カテゴリ</TableCell>
                      <TableCell align="center">経験期間</TableCell>
                      <TableCell align="center">レベル</TableCell>
                      <TableCell align="center">使用数</TableCell>
                      <TableCell>経験度</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {techStats.slice(0, 15).map((tech) => (
                      <TableRow key={tech.name}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {tech.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {getCategoryIcon(tech.category)}
                            <Typography variant="caption">
                              {getCategoryLabel(tech.category)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {formatExperienceDuration(tech.totalMonths)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={getExperienceLevelLabel(tech.experienceLevel)}
                            size="small"
                            color={getExperienceLevelColor(tech.experienceLevel) as any}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {tech.projectCount}
                        </TableCell>
                        <TableCell>
                          <ExperienceBar
                            variant="determinate"
                            value={Math.min((tech.totalMonths / 120) * 100, 100)}
                            color={getExperienceLevelColor(tech.experienceLevel) as any}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {techStats.length > 15 && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    他{techStats.length - 15}個の技術があります
                  </Typography>
                </Box>
              )}
            </TabPanel>
          )}

          {/* 経験レベル別 */}
          {activeTab === 2 && (
            <TabPanel>
              <List>
                {(['expert', 'advanced', 'intermediate', 'beginner'] as const).map((level) => {
                  const levelTechs = techStats.filter(t => t.experienceLevel === level);
                  if (levelTechs.length === 0) return null;

                  return (
                    <React.Fragment key={level}>
                      <ListItem>
                        <ListItemIcon>
                          <Chip
                            label={getExperienceLevelLabel(level)}
                            color={getExperienceLevelColor(level) as any}
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {levelTechs.map((tech) => (
                                <Typography key={tech.name} variant="body2">
                                  {tech.name}
                                </Typography>
                              ))}
                            </Box>
                          }
                          secondary={`${levelTechs.length}個の技術`}
                        />
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  );
                })}
              </List>
            </TabPanel>
          )}
        </Collapse>
      </CardContent>
    </StyledCard>
  );
};

// TableChartIcon が存在しないため追加
const TableChartIcon = () => <ChartIcon />;

export default TechnologySkillSummary;