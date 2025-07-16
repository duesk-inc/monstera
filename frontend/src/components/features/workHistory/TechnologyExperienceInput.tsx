import React, { useState } from 'react';
import {
  Box,
  Chip,
  Typography,
  IconButton,
  Paper,
  Grid,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Button,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const CategoryIcon: React.FC<{ category: string }> = ({ category }) => {
  switch (category) {
    case 'programmingLanguages':
      return <CodeIcon color="primary" />;
    case 'serversDatabases':
      return <StorageIcon color="secondary" />;
    case 'tools':
      return <BuildIcon color="success" />;
    default:
      return <CodeIcon />;
  }
};

const ExperienceContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
}));

const TechnologyItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  marginBottom: theme.spacing(1),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const ExperienceChip = styled(Chip)(() => ({
  marginLeft: 'auto',
  fontWeight: 600,
}));

const CategoryHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
  cursor: 'pointer',
  '&:hover': {
    color: theme.palette.primary.main,
  },
}));

const SummaryBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.primary.light,
  borderRadius: theme.shape.borderRadius,
  marginTop: theme.spacing(2),
}));

export interface TechnologyExperience {
  name: string;
  years: number;
  months: number;
  category: 'programmingLanguages' | 'serversDatabases' | 'tools';
}

interface TechnologyExperienceInputProps {
  technologies: {
    programmingLanguages: string[];
    serversDatabases: string[];
    tools: string[];
  };
  experiences: TechnologyExperience[];
  onExperiencesChange: (experiences: TechnologyExperience[]) => void;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

export const TechnologyExperienceInput: React.FC<TechnologyExperienceInputProps> = ({
  technologies,
  experiences,
  onExperiencesChange,
  required = false,
  disabled = false,
  error = false,
  helperText,
}) => {
  const [editingTech, setEditingTech] = useState<string | null>(null);
  const [tempYears, setTempYears] = useState<number>(0);
  const [tempMonths, setTempMonths] = useState<number>(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['programmingLanguages', 'serversDatabases', 'tools'])
  );

  // 技術の経験を取得
  const getExperience = (techName: string): TechnologyExperience | undefined => {
    return experiences.find(exp => exp.name === techName);
  };

  // 経験期間のフォーマット
  const formatExperience = (years: number, months: number): string => {
    if (years === 0 && months === 0) return '未設定';
    
    const parts = [];
    if (years > 0) parts.push(`${years}年`);
    if (months > 0) parts.push(`${months}ヶ月`);
    
    return parts.join('');
  };

  // 定数定義
  const MONTHS_IN_YEAR = 12;
  const MAX_YEARS = 31;
  const EXPERIENCE_LEVELS = {
    BEGINNER: 6,
    BEGINNER_INTERMEDIATE: 12,
    INTERMEDIATE: 36,
    ADVANCED: 60,
  };
  
  const getExperienceLevel = (years: number, months: number): { label: string; color: 'default' | 'primary' | 'secondary' | 'success' | 'error' } => {
    const totalMonths = years * MONTHS_IN_YEAR + months;
    
    if (totalMonths === 0) return { label: '未設定', color: 'default' };
    if (totalMonths < EXPERIENCE_LEVELS.BEGINNER) return { label: '初級', color: 'primary' };
    if (totalMonths < EXPERIENCE_LEVELS.BEGINNER_INTERMEDIATE) return { label: '初中級', color: 'primary' };
    if (totalMonths < EXPERIENCE_LEVELS.INTERMEDIATE) return { label: '中級', color: 'secondary' };
    if (totalMonths < EXPERIENCE_LEVELS.ADVANCED) return { label: '上級', color: 'success' };
    return { label: 'エキスパート', color: 'error' };
  };

  // 編集開始
  const handleEditStart = (techName: string) => {
    const exp = getExperience(techName);
    setEditingTech(techName);
    setTempYears(exp?.years || 0);
    setTempMonths(exp?.months || 0);
  };

  // 保存
  const handleSave = () => {
    if (!editingTech) return;

    const newExperiences = experiences.filter(exp => exp.name !== editingTech);
    
    // どのカテゴリに属するか判定
    let category: 'programmingLanguages' | 'serversDatabases' | 'tools' | null = null;
    if (technologies.programmingLanguages.includes(editingTech)) {
      category = 'programmingLanguages';
    } else if (technologies.serversDatabases.includes(editingTech)) {
      category = 'serversDatabases';
    } else if (technologies.tools.includes(editingTech)) {
      category = 'tools';
    }

    if (category && (tempYears > 0 || tempMonths > 0)) {
      newExperiences.push({
        name: editingTech,
        years: tempYears,
        months: tempMonths,
        category,
      });
    }

    onExperiencesChange(newExperiences);
    setEditingTech(null);
    setTempYears(0);
    setTempMonths(0);
  };

  // キャンセル
  const handleCancel = () => {
    setEditingTech(null);
    setTempYears(0);
    setTempMonths(0);
  };

  // 削除
  const handleDelete = (techName: string) => {
    const newExperiences = experiences.filter(exp => exp.name !== techName);
    onExperiencesChange(newExperiences);
  };

  // カテゴリの展開/折りたたみ
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // カテゴリごとの技術をレンダリング
  const renderTechnologyCategory = (
    category: 'programmingLanguages' | 'serversDatabases' | 'tools',
    title: string,
    techs: string[]
  ) => {
    const isExpanded = expandedCategories.has(category);
    const categoryExperiences = experiences.filter(exp => 
      exp.category === category && techs.includes(exp.name)
    );
    const hasExperience = categoryExperiences.length > 0;

    if (techs.length === 0) return null;

    return (
      <ExperienceContainer key={category} elevation={0}>
        <CategoryHeader onClick={() => toggleCategory(category)}>
          <CategoryIcon category={category} />
          <Typography variant="h6" component="h3">
            {title}
          </Typography>
          <Chip 
            label={`${techs.length}個`} 
            size="small" 
            color={hasExperience ? 'primary' : 'default'}
          />
          {hasExperience && (
            <Chip
              label={`${categoryExperiences.length}個設定済`}
              size="small"
              color="success"
              variant="outlined"
            />
          )}
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </CategoryHeader>

        <Collapse in={isExpanded}>
          {techs.map((tech) => {
            const exp = getExperience(tech);
            const isEditing = editingTech === tech;
            const experienceLevel = exp ? getExperienceLevel(exp.years, exp.months) : null;

            return (
              <TechnologyItem key={tech}>
                <Typography variant="body1" sx={{ minWidth: 200 }}>
                  {tech}
                </Typography>

                {isEditing ? (
                  <>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <InputLabel>年</InputLabel>
                      <Select
                        value={tempYears}
                        onChange={(e) => setTempYears(Number(e.target.value))}
                        label="年"
                      >
                        {[...Array(MAX_YEARS)].map((_, i) => (
                          <MenuItem key={i} value={i}>{i}年</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <InputLabel>月</InputLabel>
                      <Select
                        value={tempMonths}
                        onChange={(e) => setTempMonths(Number(e.target.value))}
                        label="月"
                      >
                        {[...Array(MONTHS_IN_YEAR)].map((_, i) => (
                          <MenuItem key={i} value={i}>{i}ヶ月</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <IconButton onClick={handleSave} color="primary" size="small">
                      <SaveIcon />
                    </IconButton>
                    <IconButton onClick={handleCancel} size="small">
                      <CancelIcon />
                    </IconButton>
                  </>
                ) : (
                  <>
                    {exp ? (
                      <>
                        <ExperienceChip
                          label={formatExperience(exp.years, exp.months)}
                          color={experienceLevel?.color}
                          size="small"
                        />
                        {experienceLevel && (
                          <Chip
                            label={experienceLevel.label}
                            color={experienceLevel.color}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <IconButton
                          onClick={() => handleEditStart(tech)}
                          size="small"
                          disabled={disabled}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(tech)}
                          size="small"
                          color="error"
                          disabled={disabled}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : (
                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => handleEditStart(tech)}
                        size="small"
                        variant="outlined"
                        disabled={disabled}
                        sx={{ ml: 'auto' }}
                      >
                        経験期間を追加
                      </Button>
                    )}
                  </>
                )}
              </TechnologyItem>
            );
          })}
        </Collapse>
      </ExperienceContainer>
    );
  };

  // 統計情報の計算
  const calculateStats = () => {
    const totalTechs = 
      technologies.programmingLanguages.length +
      technologies.serversDatabases.length +
      technologies.tools.length;
    
    const setExperiences = experiences.length;
    const unsetExperiences = totalTechs - setExperiences;
    
    // 平均経験期間
    let totalMonths = 0;
    experiences.forEach(exp => {
      totalMonths += exp.years * MONTHS_IN_YEAR + exp.months;
    });
    const avgMonths = setExperiences > 0 ? Math.round(totalMonths / setExperiences) : 0;
    const avgYears = Math.floor(avgMonths / MONTHS_IN_YEAR);
    const avgRemainMonths = avgMonths % MONTHS_IN_YEAR;

    return {
      totalTechs,
      setExperiences,
      unsetExperiences,
      avgExperience: formatExperience(avgYears, avgRemainMonths),
    };
  };

  const stats = calculateStats();

  return (
    <Box>
      {/* ヘッダー情報 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6" component="h2">
          技術経験期間
        </Typography>
        <Tooltip title="各技術の実務経験期間を設定してください。スキルレベルの判定に使用されます。">
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {required && (
          <Typography color="error" component="span">
            *
          </Typography>
        )}
      </Box>

      {/* カテゴリごとの入力 */}
      {renderTechnologyCategory(
        'programmingLanguages',
        'プログラミング言語',
        technologies.programmingLanguages
      )}
      {renderTechnologyCategory(
        'serversDatabases',
        'サーバー・データベース',
        technologies.serversDatabases
      )}
      {renderTechnologyCategory(
        'tools',
        'ツール・その他',
        technologies.tools
      )}

      {/* 統計情報 */}
      {stats.totalTechs > 0 && (
        <SummaryBox>
          <Typography variant="subtitle2" gutterBottom>
            入力状況サマリー
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                総技術数
              </Typography>
              <Typography variant="h6">{stats.totalTechs}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                設定済み
              </Typography>
              <Typography variant="h6" color="success.main">
                {stats.setExperiences}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                未設定
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {stats.unsetExperiences}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                平均経験
              </Typography>
              <Typography variant="h6">{stats.avgExperience}</Typography>
            </Grid>
          </Grid>
        </SummaryBox>
      )}

      {/* エラー表示 */}
      {error && helperText && (
        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default TechnologyExperienceInput;