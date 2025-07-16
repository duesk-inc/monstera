import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Breadcrumbs,
  Link,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import WorkHistoryPDFButton from './WorkHistoryPDFButton';
import type { WorkHistorySummary, ITExperience } from '../../../types/workHistory';

const HeaderContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const BreadcrumbContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const MainHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: theme.spacing(2),
  flexWrap: 'wrap',
  gap: theme.spacing(2),
}));

const TitleSection = styled(Box)(() => ({
  flex: 1,
}));

const ActionSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  flexWrap: 'wrap',
}));

const SummarySection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
  alignItems: 'center',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(2),
}));

const UserInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const StatsGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  flexWrap: 'wrap',
}));

interface WorkHistoryListHeaderProps {
  userName?: string;
  userEmail?: string;
  summary?: WorkHistorySummary;
  itExperience?: ITExperience;
  onCreateNew: () => void;
  onExportPDF: () => void;
  isLoading?: boolean;
  isPDFDownloading?: boolean;
  hasWorkHistory?: boolean;
}

export const WorkHistoryListHeader: React.FC<WorkHistoryListHeaderProps> = ({
  userName,
  userEmail,
  summary,
  itExperience,
  onCreateNew,
  onExportPDF,
  isLoading = false,
  isPDFDownloading = false,
  hasWorkHistory = false,
}) => {

  return (
    <HeaderContainer>
      {/* パンくずリスト */}
      <BreadcrumbContainer>
        <Breadcrumbs>
          <Link underline="hover" color="inherit" href="/">
            ホーム
          </Link>
          <Typography color="text.primary">職務経歴管理</Typography>
        </Breadcrumbs>
      </BreadcrumbContainer>

      {/* メインヘッダー */}
      <MainHeader>
        <TitleSection>
          <Typography variant="h4" component="h1" gutterBottom>
            職務経歴管理
          </Typography>
          <Typography variant="body1" color="text.secondary">
            プロジェクト経験とスキルの管理・閲覧ができます
          </Typography>
        </TitleSection>

        <ActionSection>
          <WorkHistoryPDFButton
            onDownload={onExportPDF}
            isLoading={isPDFDownloading}
            disabled={isLoading}
            hasData={hasWorkHistory}
            variant="button"
            color="default"
            label="PDF出力"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateNew}
            disabled={isLoading}
          >
            新規作成
          </Button>
        </ActionSection>
      </MainHeader>

      {/* サマリー情報 */}
      {(summary || userName || itExperience) && (
        <SummarySection>
          {/* ユーザー情報 */}
          <UserInfo>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">
                {userName || summary?.userName || 'ユーザー'}
              </Typography>
              {userEmail && (
                <Typography variant="caption" color="text.secondary">
                  {userEmail}
                </Typography>
              )}
            </Box>
          </UserInfo>

          {/* 統計情報 */}
          <StatsGroup>
            {/* IT経験年数 */}
            {itExperience && (
              <Chip
                icon={<DateRangeIcon />}
                label={`IT経験: ${itExperience.text}`}
                color="primary"
                variant="outlined"
              />
            )}

            {/* プロジェクト数 */}
            {summary && (
              <Chip
                icon={<BusinessIcon />}
                label={`プロジェクト: ${summary.totalProjectCount}件`}
                color="info"
                variant="outlined"
              />
            )}

            {/* 進行中プロジェクト */}
            {summary && summary.activeProjectCount > 0 && (
              <Chip
                label={`進行中: ${summary.activeProjectCount}件`}
                color="success"
                variant="filled"
              />
            )}

            {/* 技術数 */}
            {summary && (
              <Chip
                label={`使用技術: ${summary.totalTechnologyCount}種類`}
                color="secondary"
                variant="outlined"
              />
            )}
          </StatsGroup>

          {/* 最新プロジェクト情報 */}
          {summary?.latestProjectName && (
            <Box sx={{ ml: 'auto', textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                最新プロジェクト
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {summary.latestProjectName}
              </Typography>
              {summary.latestRole && (
                <Typography variant="caption" color="text.secondary">
                  役割: {summary.latestRole}
                </Typography>
              )}
            </Box>
          )}
        </SummarySection>
      )}
    </HeaderContainer>
  );
};

export default WorkHistoryListHeader;