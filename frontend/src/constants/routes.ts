export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  ADMIN_DASHBOARD: '/admin/dashboard',
} as const;

export const PUBLIC_PATHS = [
  '/',
  '/login',
] as const;

export type Routes = typeof ROUTES;
export type PublicPaths = typeof PUBLIC_PATHS[number];