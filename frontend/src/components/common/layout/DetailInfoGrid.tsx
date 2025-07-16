'use client';

import React from 'react';
import { Typography, Box, SxProps, Theme } from '@mui/material';
import Grid from '@mui/material/Grid';

export interface DetailInfoItem {
  /** ラベル */
  label: string;
  /** 値 */
  value: React.ReactNode;
  /** グリッドの幅（xs, sm, md, lg, xl） */
  gridSize?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** アイコン */
  icon?: React.ReactNode;
  /** 値の色 */
  valueColor?: string;
  /** 値のフォントウェイト */
  valueFontWeight?: string | number;
}

export interface DetailInfoGridProps {
  /** 詳細情報アイテムの配列 */
  items: DetailInfoItem[];
  /** グリッドのスペーシング */
  spacing?: number;
  /** ラベルのバリアント */
  labelVariant?: 'subtitle2' | 'caption' | 'body2';
  /** 値のバリアント */
  valueVariant?: 'body1' | 'body2' | 'subtitle1' | 'h6';
  /** 追加のスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}

/**
 * 詳細情報グリッド表示コンポーネント
 * 統一された詳細情報のレイアウトを提供
 * 
 * @param items - 詳細情報アイテムの配列
 * @param spacing - グリッドのスペーシング（デフォルト: 2）
 * @param labelVariant - ラベルのバリアント（デフォルト: 'subtitle2'）
 * @param valueVariant - 値のバリアント（デフォルト: 'body1'）
 * @param sx - 追加のスタイル
 * @param data-testid - テストID
 */
export const DetailInfoGrid: React.FC<DetailInfoGridProps> = ({
  items,
  spacing = 2,
  labelVariant = 'subtitle2',
  valueVariant = 'body1',
  sx,
  'data-testid': testId,
}) => {
  return (
    <Grid
      container
      spacing={spacing}
      sx={sx}
      data-testid={testId}
    >
      {items.map((item, index) => {
        const size = {
          xs: item.gridSize?.xs || 12,
          sm: item.gridSize?.sm || 6,
          ...(item.gridSize?.md !== undefined && { md: item.gridSize.md }),
          ...(item.gridSize?.lg !== undefined && { lg: item.gridSize.lg }),
          ...(item.gridSize?.xl !== undefined && { xl: item.gridSize.xl }),
        };

        return (
          <Grid key={index} size={size}>
            <Box>
              {/* ラベル */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 0.5,
                }}
              >
                {item.icon && (
                  <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                  </Box>
                )}
                <Typography
                  variant={labelVariant}
                  color="text.secondary"
                  sx={{ fontWeight: 'medium' }}
                >
                  {item.label}
                </Typography>
              </Box>

              {/* 値 */}
              {typeof item.value === 'string' ? (
                <Typography
                  variant={valueVariant}
                  color={item.valueColor || 'text.primary'}
                  sx={{
                    fontWeight: item.valueFontWeight || 'normal',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.value}
                </Typography>
              ) : (
                <Box>{item.value}</Box>
              )}
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default DetailInfoGrid; 