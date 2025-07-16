import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Grid,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useResponsive } from '../../../hooks/common/useResponsive';

const LoadingCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  transition: 'all 0.3s ease',
}));

interface WorkHistoryLoadingStateProps {
  variant?: 'list' | 'grid' | 'card' | 'stats' | 'form';
  itemCount?: number;
  showHeader?: boolean;
}

export const WorkHistoryLoadingState: React.FC<WorkHistoryLoadingStateProps> = ({
  variant = 'list',
  itemCount = 3,
  showHeader = true,
}) => {
  const { isMobile } = useResponsive();

  // ヘッダーローディング
  const renderHeaderLoading = () => (
    <Box sx={{ mb: 3 }}>
      <Skeleton variant="text" width={isMobile ? '60%' : '40%'} height={40} />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Skeleton variant="rectangular" width={120} height={36} />
        <Skeleton variant="rectangular" width={120} height={36} />
      </Box>
    </Box>
  );

  // リスト形式のローディング
  const renderListLoading = () => (
    <>
      {[...Array(itemCount)].map((_, index) => (
        <LoadingCard key={index}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Skeleton variant="text" width="40%" height={32} />
              <Skeleton variant="rectangular" width={80} height={24} />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Skeleton variant="text" width="30%" height={20} />
              <Skeleton variant="text" width="25%" height={20} />
            </Box>
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="90%" height={20} />
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Skeleton variant="rounded" width={60} height={32} />
              <Skeleton variant="rounded" width={60} height={32} />
              <Skeleton variant="rounded" width={60} height={32} />
            </Box>
          </CardContent>
        </LoadingCard>
      ))}
    </>
  );

  // グリッド形式のローディング
  const renderGridLoading = () => (
    <Grid container spacing={2}>
      {[...Array(itemCount)].map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <LoadingCard>
            <CardContent>
              <Skeleton variant="text" width="80%" height={28} />
              <Skeleton variant="text" width="60%" height={20} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="rounded" width={50} height={24} />
                <Skeleton variant="rounded" width={50} height={24} />
              </Box>
            </CardContent>
          </LoadingCard>
        </Grid>
      ))}
    </Grid>
  );

  // カード形式のローディング（単体）
  const renderCardLoading = () => (
    <LoadingCard>
      <CardContent>
        <Skeleton variant="text" width={isMobile ? '70%' : '50%'} height={36} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="text" width="50%" height={24} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="rectangular" height={100} />
          </Grid>
        </Grid>
      </CardContent>
    </LoadingCard>
  );

  // 統計情報のローディング
  const renderStatsLoading = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {[...Array(4)].map((_, index) => (
        <Grid item xs={6} md={3} key={index}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Skeleton variant="circular" width={48} height={48} sx={{ mx: 'auto', mb: 1 }} />
              <Skeleton variant="text" width="60%" height={40} sx={{ mx: 'auto' }} />
              <Skeleton variant="text" width="80%" height={20} sx={{ mx: 'auto' }} />
              <Skeleton variant="rounded" width="50%" height={24} sx={{ mx: 'auto', mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // フォームのローディング
  const renderFormLoading = () => (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Skeleton variant="text" width="30%" height={20} />
          <Skeleton variant="rectangular" height={56} sx={{ mt: 1, mb: 2 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Skeleton variant="text" width="30%" height={20} />
          <Skeleton variant="rectangular" height={56} sx={{ mt: 1, mb: 2 }} />
        </Grid>
        <Grid item xs={12}>
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="rectangular" height={120} sx={{ mt: 1, mb: 2 }} />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rounded" width={60} height={32} />
            <Skeleton variant="rounded" width={60} height={32} />
            <Skeleton variant="rounded" width={60} height={32} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box>
      {showHeader && renderHeaderLoading()}
      {variant === 'list' && renderListLoading()}
      {variant === 'grid' && renderGridLoading()}
      {variant === 'card' && renderCardLoading()}
      {variant === 'stats' && renderStatsLoading()}
      {variant === 'form' && renderFormLoading()}
    </Box>
  );
};

export default WorkHistoryLoadingState;