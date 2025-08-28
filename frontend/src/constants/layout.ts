/**
 * Layout constants
 */

// Sidebar dimensions
export const SIDEBAR_WIDTH = 246; // px
export const SIDEBAR_WIDTH_COLLAPSED = 68; // px

// Layout breakpoints - for consistency with MUI breakpoints
export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const;

// TopBar height
export const TOPBAR_HEIGHT = 70; // px

// Content area
export const CONTENT_MIN_HEIGHT = `calc(100vh - ${TOPBAR_HEIGHT}px)`;