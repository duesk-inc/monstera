import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { useMemo } from 'react';

/**
 * レスポンシブブレークポイント管理フック
 */
export const useResponsive = () => {
  const theme = useTheme();

  // ブレークポイント判定
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  // 画面サイズ種別
  const screenSize = useMemo(() => {
    if (isMobile) return 'mobile';
    if (isTablet) return 'tablet';
    if (isLargeDesktop) return 'large';
    return 'desktop';
  }, [isMobile, isTablet, isLargeDesktop]);

  // モバイル向けの設定値
  const mobileSettings = useMemo(() => ({
    containerMaxWidth: 'sm' as const,
    cardSpacing: 2,
    headerHeight: 64,
    fabSize: 'medium' as const,
    dialogFullScreen: true,
    listItemsPerPage: 5,
    showCompactView: true,
  }), []);

  // タブレット向けの設定値
  const tabletSettings = useMemo(() => ({
    containerMaxWidth: 'md' as const,
    cardSpacing: 3,
    headerHeight: 72,
    fabSize: 'large' as const,
    dialogFullScreen: false,
    listItemsPerPage: 8,
    showCompactView: false,
  }), []);

  // デスクトップ向けの設定値
  const desktopSettings = useMemo(() => ({
    containerMaxWidth: 'lg' as const,
    cardSpacing: 4,
    headerHeight: 80,
    fabSize: 'large' as const,
    dialogFullScreen: false,
    listItemsPerPage: 10,
    showCompactView: false,
  }), []);

  // 現在の画面サイズに応じた設定
  const settings = useMemo(() => {
    switch (screenSize) {
      case 'mobile':
        return mobileSettings;
      case 'tablet':
        return tabletSettings;
      default:
        return desktopSettings;
    }
  }, [screenSize, mobileSettings, tabletSettings, desktopSettings]);

  // レスポンシブ対応のユーティリティ関数
  const getResponsiveValue = <T>(mobile: T, tablet?: T, desktop?: T, large?: T): T => {
    if (isMobile) return mobile;
    if (isTablet && tablet !== undefined) return tablet;
    if (isLargeDesktop && large !== undefined) return large;
    if (desktop !== undefined) return desktop;
    return mobile;
  };

  // グリッドカラム数を画面サイズに応じて返す
  const getGridColumns = (mobileCol = 1, tabletCol = 2, desktopCol = 3, largeCol = 4) => {
    return getResponsiveValue(mobileCol, tabletCol, desktopCol, largeCol);
  };

  // スペーシングを画面サイズに応じて返す
  const getSpacing = (mobile = 2, tablet = 3, desktop = 4) => {
    return getResponsiveValue(mobile, tablet, desktop);
  };

  // フォントサイズを画面サイズに応じて返す
  const getFontSize = (mobile: string, tablet?: string, desktop?: string) => {
    return getResponsiveValue(mobile, tablet, desktop);
  };

  return {
    // ブレークポイント判定
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    screenSize,

    // 設定値
    settings,

    // ユーティリティ関数
    getResponsiveValue,
    getGridColumns,
    getSpacing,
    getFontSize,

    // よく使用される値
    containerMaxWidth: settings.containerMaxWidth,
    cardSpacing: settings.cardSpacing,
    headerHeight: settings.headerHeight,
    fabSize: settings.fabSize,
    dialogFullScreen: settings.dialogFullScreen,
    listItemsPerPage: settings.listItemsPerPage,
    showCompactView: settings.showCompactView,
  };
};

export default useResponsive;