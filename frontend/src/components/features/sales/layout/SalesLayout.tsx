'use client';

import React, { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { SPACING } from '@/constants/dimensions';

interface SalesLayoutProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

/**
 * 営業関連ページの共通レイアウトコンポーネント
 */
export const SalesLayout: React.FC<SalesLayoutProps> = ({
  title,
  actions,
  children,
  maxWidth = 'xl'
}) => {
  const theme = useTheme();

  return (
    <Box 
      sx={{ 
        p: { xs: SPACING.md, sm: SPACING.lg },
        maxWidth: maxWidth ? theme.breakpoints.values[maxWidth] : 'none',
        mx: 'auto',
        width: '100%'
      }}
    >
      {/* ヘッダー部分 */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          mb: SPACING.lg,
          gap: { xs: SPACING.md, sm: 0 }
        }}
      >
        <Typography 
          variant="h4" 
          component="h1"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          {title}
        </Typography>
        
        {actions && (
          <Box 
            sx={{ 
              display: 'flex',
              gap: SPACING.sm,
              mt: { xs: SPACING.sm, sm: 0 },
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-end', sm: 'flex-start' }
            }}
          >
            {actions}
          </Box>
        )}
      </Box>

      {/* メインコンテンツ */}
      <Box>
        {children}
      </Box>
    </Box>
  );
};