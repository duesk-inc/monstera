import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
} from '@mui/material';
import {
  Add as AddIcon,
  FolderOpen as FolderOpenIcon,
  Search as SearchIcon,
  FilterAlt as FilterIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useResponsive } from '../../../hooks/common/useResponsive';

const EmptyCard = styled(Card)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(4),
  backgroundColor: theme.palette.background.paper,
  border: `2px dashed ${theme.palette.divider}`,
  boxShadow: 'none',
}));

const IllustrationContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: theme.spacing(3),
  opacity: 0.5,
}));

const ActionContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  justifyContent: 'center',
  marginTop: theme.spacing(3),
}));

interface WorkHistoryEmptyStateProps {
  type?: 'noData' | 'noResults' | 'filtered' | 'error';
  title?: string;
  message?: string;
  illustration?: 'folder' | 'search' | 'filter' | 'custom';
  customIllustration?: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  showSuggestions?: boolean;
}

export const WorkHistoryEmptyState: React.FC<WorkHistoryEmptyStateProps> = ({
  type = 'noData',
  title,
  message,
  illustration = 'folder',
  customIllustration,
  primaryAction,
  secondaryAction,
  showSuggestions = true,
}) => {
  const { isMobile } = useResponsive();

  // タイプに応じたデフォルトコンテンツを取得
  const getDefaultContent = () => {
    switch (type) {
      case 'noData':
        return {
          title: '職務経歴がまだありません',
          message: '最初のプロジェクト経験を登録して、あなたのキャリアを記録しましょう。',
          illustration: 'folder' as const,
        };
      case 'noResults':
        return {
          title: '検索結果が見つかりません',
          message: '検索条件を変更して、もう一度お試しください。',
          illustration: 'search' as const,
        };
      case 'filtered':
        return {
          title: '条件に一致する職務経歴がありません',
          message: 'フィルター条件を調整してみてください。',
          illustration: 'filter' as const,
        };
      default:
        return {
          title: '職務経歴が表示できません',
          message: '問題が発生しました。しばらく待ってから再度お試しください。',
          illustration: 'folder' as const,
        };
    }
  };

  const defaults = getDefaultContent();
  const displayTitle = title || defaults.title;
  const displayMessage = message || defaults.message;
  const displayIllustration = illustration || defaults.illustration;

  // イラストレーションの描画
  const renderIllustration = () => {
    if (customIllustration) {
      return customIllustration;
    }

    const iconProps = { 
      sx: { 
        fontSize: isMobile ? 64 : 80, 
        color: 'action.disabled' 
      } 
    };

    switch (displayIllustration) {
      case 'search':
        return <SearchIcon {...iconProps} />;
      case 'filter':
        return <FilterIcon {...iconProps} />;
      case 'folder':
      default:
        return <FolderOpenIcon {...iconProps} />;
    }
  };

  // 提案リストの描画
  const renderSuggestions = () => {
    if (!showSuggestions || type !== 'noResults') return null;

    const suggestions = [
      'より一般的なキーワードで検索する',
      '検索フィルターを解除する',
      '異なる期間で検索する',
      'カテゴリーを変更して検索する',
    ];

    return (
      <Box sx={{ mt: 3, textAlign: 'left', maxWidth: 400, mx: 'auto' }}>
        <Typography 
          variant="subtitle2" 
          color="text.secondary" 
          gutterBottom
          sx={{ fontSize: isMobile ? '0.875rem' : undefined }}
        >
          検索のヒント：
        </Typography>
        <Box component="ul" sx={{ pl: 2, m: 0 }}>
          {suggestions.map((suggestion, index) => (
            <Typography
              key={index}
              component="li"
              variant="body2"
              color="text.secondary"
              sx={{ 
                mb: 0.5,
                fontSize: isMobile ? '0.8rem' : undefined,
              }}
            >
              {suggestion}
            </Typography>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <EmptyCard>
      <CardContent>
        <IllustrationContainer>
          {renderIllustration()}
        </IllustrationContainer>

        <Typography 
          variant={isMobile ? 'h6' : 'h5'} 
          component="h2" 
          gutterBottom
          sx={{ fontWeight: 'medium', mb: 2 }}
        >
          {displayTitle}
        </Typography>

        <Typography 
          variant="body1" 
          color="text.secondary" 
          paragraph
          sx={{ 
            mb: 3, 
            fontSize: isMobile ? '0.9rem' : undefined,
            maxWidth: 500,
            mx: 'auto',
          }}
        >
          {displayMessage}
        </Typography>

        {(primaryAction || secondaryAction) && (
          <ActionContainer sx={{ flexDirection: isMobile ? 'column' : 'row' }}>
            {primaryAction && (
              <Button
                variant="contained"
                color="primary"
                onClick={primaryAction.onClick}
                startIcon={primaryAction.icon || <AddIcon />}
                size={isMobile ? 'large' : 'medium'}
                fullWidth={isMobile}
              >
                {primaryAction.label}
              </Button>
            )}
            
            {secondaryAction && (
              <Button
                variant="outlined"
                color="primary"
                onClick={secondaryAction.onClick}
                startIcon={secondaryAction.icon}
                size={isMobile ? 'large' : 'medium'}
                fullWidth={isMobile}
              >
                {secondaryAction.label}
              </Button>
            )}
          </ActionContainer>
        )}

        {renderSuggestions()}
      </CardContent>
    </EmptyCard>
  );
};

export default WorkHistoryEmptyState;