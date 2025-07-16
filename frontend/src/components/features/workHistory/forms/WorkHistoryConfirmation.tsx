import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Paper,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  BusinessCenter as ProjectIcon,
  DateRange as DateIcon,
  Business as CompanyIcon,
  Group as TeamIcon,
  Assignment as RoleIcon,
  Category as IndustryIcon,
  Code as TechIcon,
  CheckCircle as CheckIcon,
  CheckCircle,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { WorkHistoryFormData, IndustryMasterData, ProcessMasterData } from '../../../../types/workHistory';

const ConfirmationContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const SectionPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: theme.palette.primary.main,
}));

const ItemRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: theme.spacing(2),
  '&:last-child': {
    marginBottom: 0,
  },
}));

const ItemLabel = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  minWidth: 150,
  color: theme.palette.text.secondary,
  marginRight: theme.spacing(2),
}));

const ItemValue = styled(Box)(() => ({
  flex: 1,
}));

const TechChipContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
}));

const ProcessChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.25),
}));

const ContentBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}));

interface WorkHistoryConfirmationProps {
  formData: WorkHistoryFormData;
  industries: IndustryMasterData[];
  processes: ProcessMasterData[];
}

export const WorkHistoryConfirmation: React.FC<WorkHistoryConfirmationProps> = ({
  formData,
  industries,
  processes,
}) => {
  // 業種名の取得
  const getIndustryName = () => {
    const industry = industries.find(i => i.id === formData.industry);
    return industry?.displayName || '未設定';
  };

  // 工程名の取得
  const getProcessNames = () => {
    return formData.processes
      .map(processId => processes.find(p => p.id === processId))
      .filter(Boolean)
      .map(p => p!.displayName);
  };

  // 期間の表示形式
  const formatPeriod = () => {
    if (!formData.startDate) return '未設定';
    
    const start = format(formData.startDate, 'yyyy年MM月', { locale: ja });
    const end = formData.endDate 
      ? format(formData.endDate, 'yyyy年MM月', { locale: ja })
      : '現在';
    
    return `${start} 〜 ${end}`;
  };

  // 期間の計算
  const calculateDuration = () => {
    if (!formData.startDate) return '';
    
    const endDate = formData.endDate || new Date();
    const months = Math.floor((endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years > 0) {
      return remainingMonths > 0 ? `${years}年${remainingMonths}ヶ月` : `${years}年`;
    }
    return `${months}ヶ月`;
  };

  return (
    <ConfirmationContainer>
      <Typography variant="body1" color="text.secondary" paragraph>
        以下の内容で職務経歴を{formData.id ? '更新' : '登録'}します。内容をご確認ください。
      </Typography>

      {/* 基本情報 */}
      <SectionPaper elevation={0}>
        <SectionTitle variant="h6">
          <ProjectIcon />
          基本情報
        </SectionTitle>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <ItemRow>
              <ItemLabel>プロジェクト名</ItemLabel>
              <ItemValue>
                <Typography variant="body1" fontWeight="medium">
                  {formData.projectName}
                </Typography>
              </ItemValue>
            </ItemRow>
          </Grid>

          <Grid item xs={12} md={6}>
            <ItemRow>
              <ItemLabel>
                <DateIcon sx={{ fontSize: 20, mr: 0.5, verticalAlign: 'middle' }} />
                期間
              </ItemLabel>
              <ItemValue>
                <Typography variant="body1">
                  {formatPeriod()}
                </Typography>
                {calculateDuration() && (
                  <Typography variant="caption" color="text.secondary">
                    （{calculateDuration()}）
                  </Typography>
                )}
              </ItemValue>
            </ItemRow>
          </Grid>

          <Grid item xs={12} md={6}>
            <ItemRow>
              <ItemLabel>
                <IndustryIcon sx={{ fontSize: 20, mr: 0.5, verticalAlign: 'middle' }} />
                業種
              </ItemLabel>
              <ItemValue>
                <Typography variant="body1">{getIndustryName()}</Typography>
              </ItemValue>
            </ItemRow>
          </Grid>

          {formData.companyName && (
            <Grid item xs={12}>
              <ItemRow>
                <ItemLabel>
                  <CompanyIcon sx={{ fontSize: 20, mr: 0.5, verticalAlign: 'middle' }} />
                  会社名
                </ItemLabel>
                <ItemValue>
                  <Typography variant="body1">{formData.companyName}</Typography>
                </ItemValue>
              </ItemRow>
            </Grid>
          )}

          <Grid item xs={12} md={6}>
            <ItemRow>
              <ItemLabel>
                <TeamIcon sx={{ fontSize: 20, mr: 0.5, verticalAlign: 'middle' }} />
                チーム規模
              </ItemLabel>
              <ItemValue>
                <Typography variant="body1">{formData.teamSize}名</Typography>
              </ItemValue>
            </ItemRow>
          </Grid>

          <Grid item xs={12} md={6}>
            <ItemRow>
              <ItemLabel>
                <RoleIcon sx={{ fontSize: 20, mr: 0.5, verticalAlign: 'middle' }} />
                役割
              </ItemLabel>
              <ItemValue>
                <Typography variant="body1">{formData.role}</Typography>
              </ItemValue>
            </ItemRow>
          </Grid>
        </Grid>
      </SectionPaper>

      {/* プロジェクト詳細 */}
      <SectionPaper elevation={0}>
        <SectionTitle variant="h6">
          <CheckCircle />
          プロジェクト詳細
        </SectionTitle>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            プロジェクト概要
          </Typography>
          <ContentBox>
            <Typography variant="body2">{formData.projectOverview}</Typography>
          </ContentBox>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            担当業務
          </Typography>
          <ContentBox>
            <Typography variant="body2">{formData.responsibilities}</Typography>
          </ContentBox>
        </Box>

        {formData.achievements && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              成果・実績
            </Typography>
            <ContentBox>
              <Typography variant="body2">{formData.achievements}</Typography>
            </ContentBox>
          </Box>
        )}

        {formData.notes && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              備考
            </Typography>
            <ContentBox>
              <Typography variant="body2">{formData.notes}</Typography>
            </ContentBox>
          </Box>
        )}

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            担当工程
          </Typography>
          <TechChipContainer>
            {getProcessNames().map((process, index) => (
              <ProcessChip
                key={`process-${index}`}
                label={process}
                color="primary"
                variant="outlined"
              />
            ))}
          </TechChipContainer>
        </Box>
      </SectionPaper>

      {/* 使用技術 */}
      <SectionPaper elevation={0}>
        <SectionTitle variant="h6">
          <TechIcon />
          使用技術・スキル
        </SectionTitle>

        {formData.programmingLanguages.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              プログラミング言語
            </Typography>
            <TechChipContainer>
              {formData.programmingLanguages.map((tech, index) => (
                <Chip
                  key={`lang-${index}`}
                  label={tech}
                  color="primary"
                  size="small"
                />
              ))}
            </TechChipContainer>
          </Box>
        )}

        {formData.serversDatabases.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              サーバー・データベース
            </Typography>
            <TechChipContainer>
              {formData.serversDatabases.map((tech, index) => (
                <Chip
                  key={`db-${index}`}
                  label={tech}
                  color="secondary"
                  size="small"
                />
              ))}
            </TechChipContainer>
          </Box>
        )}

        {formData.tools.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              ツール・その他
            </Typography>
            <TechChipContainer>
              {formData.tools.map((tech, index) => (
                <Chip
                  key={`tool-${index}`}
                  label={tech}
                  color="success"
                  size="small"
                />
              ))}
            </TechChipContainer>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />
        
        <Typography variant="body2" color="text.secondary" align="right">
          合計技術数: {formData.programmingLanguages.length + formData.serversDatabases.length + formData.tools.length}個
        </Typography>
      </SectionPaper>

      {/* 確認メッセージ */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
        <Typography variant="body2" color="text.primary">
          <CheckIcon sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
          入力内容の確認が完了しました。問題がなければ「{formData.id ? '更新' : '作成'}」ボタンをクリックしてください。
        </Typography>
      </Box>
    </ConfirmationContainer>
  );
};

export default WorkHistoryConfirmation;