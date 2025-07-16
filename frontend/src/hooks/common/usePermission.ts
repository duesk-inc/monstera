import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

// 権限の種類を定義
export enum Permission {
  // 管理者専用権限
  ADMIN_DASHBOARD = 'admin:dashboard',
  ADMIN_USER_MANAGEMENT = 'admin:user_management',
  ADMIN_SYSTEM_SETTINGS = 'admin:system_settings',
  ADMIN_AUDIT_LOGS = 'admin:audit_logs',
  
  // 週報管理権限
  WEEKLY_REPORT_VIEW_ALL = 'weekly_report:view_all',
  WEEKLY_REPORT_MANAGE = 'weekly_report:manage',
  WEEKLY_REPORT_EXPORT = 'weekly_report:export',
  WEEKLY_REPORT_ARCHIVE = 'weekly_report:archive',
  
  // アラート管理権限
  ALERT_SETTINGS_VIEW = 'alert:settings_view',
  ALERT_SETTINGS_MANAGE = 'alert:settings_manage',
  ALERT_HISTORY_VIEW = 'alert:history_view',
  ALERT_HISTORY_MANAGE = 'alert:history_manage',
  
  // 通知管理権限
  NOTIFICATION_SEND = 'notification:send',
  NOTIFICATION_MANAGE = 'notification:manage',
  
  // リマインダー権限
  REMINDER_SEND = 'reminder:send',
  REMINDER_BULK_SEND = 'reminder:bulk_send',
  
  // 部門管理権限
  DEPARTMENT_VIEW = 'department:view',
  DEPARTMENT_MANAGE = 'department:manage',
  
  // レポート・分析権限
  REPORT_VIEW = 'report:view',
  REPORT_GENERATE = 'report:generate',
  ANALYTICS_VIEW = 'analytics:view',
  
  // 提案機能権限
  PROPOSAL_VIEW = 'proposal:view',
  PROPOSAL_MANAGE = 'proposal:manage',
  PROPOSAL_RESPOND = 'proposal:respond',
  PROPOSAL_STATS = 'proposal:stats',
  
  // 質問機能権限
  QUESTION_CREATE = 'question:create',
  QUESTION_EDIT = 'question:edit',
  QUESTION_DELETE = 'question:delete',
  QUESTION_RESPOND = 'question:respond',
  QUESTION_ASSIGN = 'question:assign',
  QUESTION_VIEW_ALL = 'question:view_all',
}

// ロール定義
export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  ENGINEER = 'engineer',
  SALES = 'sales',
}

// ロールと権限のマッピング
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    // 全ての権限を持つ
    ...Object.values(Permission),
  ],
  
  [Role.ADMIN]: [
    Permission.ADMIN_DASHBOARD,
    Permission.ADMIN_USER_MANAGEMENT,
    Permission.ADMIN_SYSTEM_SETTINGS,
    Permission.WEEKLY_REPORT_VIEW_ALL,
    Permission.WEEKLY_REPORT_MANAGE,
    Permission.WEEKLY_REPORT_EXPORT,
    Permission.WEEKLY_REPORT_ARCHIVE,
    Permission.ALERT_SETTINGS_VIEW,
    Permission.ALERT_SETTINGS_MANAGE,
    Permission.ALERT_HISTORY_VIEW,
    Permission.ALERT_HISTORY_MANAGE,
    Permission.NOTIFICATION_SEND,
    Permission.NOTIFICATION_MANAGE,
    Permission.REMINDER_SEND,
    Permission.REMINDER_BULK_SEND,
    Permission.DEPARTMENT_VIEW,
    Permission.DEPARTMENT_MANAGE,
    Permission.REPORT_VIEW,
    Permission.REPORT_GENERATE,
    Permission.ANALYTICS_VIEW,
  ],
  
  [Role.MANAGER]: [
    Permission.WEEKLY_REPORT_VIEW_ALL,
    Permission.WEEKLY_REPORT_MANAGE,
    Permission.WEEKLY_REPORT_EXPORT,
    Permission.ALERT_SETTINGS_VIEW,
    Permission.ALERT_SETTINGS_MANAGE,
    Permission.ALERT_HISTORY_VIEW,
    Permission.ALERT_HISTORY_MANAGE,
    Permission.NOTIFICATION_SEND,
    Permission.REMINDER_SEND,
    Permission.REMINDER_BULK_SEND,
    Permission.DEPARTMENT_VIEW,
    Permission.REPORT_VIEW,
    Permission.REPORT_GENERATE,
    Permission.ANALYTICS_VIEW,
  ],
  
  [Role.ENGINEER]: [
    // エンジニアは自分の週報のみ管理可能（基本権限）
    Permission.DEPARTMENT_VIEW,
    Permission.REPORT_VIEW,
    // 提案機能権限
    Permission.PROPOSAL_VIEW,
    Permission.PROPOSAL_RESPOND,
    Permission.QUESTION_CREATE,
    Permission.QUESTION_EDIT,
    Permission.QUESTION_DELETE,
  ],
  
  [Role.SALES]: [
    // 営業は質問回答と提案管理が可能
    Permission.PROPOSAL_VIEW,
    Permission.PROPOSAL_MANAGE,
    Permission.PROPOSAL_STATS,
    Permission.QUESTION_RESPOND,
    Permission.QUESTION_ASSIGN,
    Permission.QUESTION_VIEW_ALL,
    Permission.DEPARTMENT_VIEW,
    Permission.REPORT_VIEW,
  ],
};

/**
 * 権限管理フック
 * ユーザーの権限をチェックし、UI要素の表示制御を行う
 */
export const usePermission = () => {
  const { user } = useAuth();

  // ユーザーの役割を取得
  const userRoles = useMemo(() => {
    if (!user) return [];
    
    // user.roles が配列の場合（新しい実装）
    if (Array.isArray(user.roles)) {
      return user.roles as Role[];
    }
    
    // user.role が文字列の場合（既存実装）
    if (user.role) {
      return [user.role as Role];
    }
    
    return [];
  }, [user]);

  // ユーザーが持つ全ての権限を計算
  const userPermissions = useMemo(() => {
    const permissions = new Set<Permission>();
    
    userRoles.forEach(role => {
      const rolePermissions = ROLE_PERMISSIONS[role] || [];
      rolePermissions.forEach(permission => permissions.add(permission));
    });
    
    return Array.from(permissions);
  }, [userRoles]);

  /**
   * 指定した権限を持っているかチェック
   */
  const hasPermission = (permission: Permission): boolean => {
    return userPermissions.includes(permission);
  };

  /**
   * 指定した権限のいずれかを持っているかチェック
   */
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  /**
   * 指定した権限を全て持っているかチェック
   */
  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  /**
   * 指定したロールを持っているかチェック
   */
  const hasRole = (role: Role): boolean => {
    return userRoles.includes(role);
  };

  /**
   * 指定したロールのいずれかを持っているかチェック
   */
  const hasAnyRole = (roles: Role[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  /**
   * 管理者権限を持っているかチェック
   */
  const isAdmin = (): boolean => {
    return hasAnyRole([Role.SUPER_ADMIN, Role.ADMIN]);
  };

  /**
   * マネージャー権限以上を持っているかチェック
   */
  const isManager = (): boolean => {
    return hasAnyRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]);
  };

  /**
   * 週報管理権限を持っているかチェック
   */
  const canManageWeeklyReports = (): boolean => {
    return hasPermission(Permission.WEEKLY_REPORT_MANAGE);
  };

  /**
   * アラート設定権限を持っているかチェック
   */
  const canManageAlerts = (): boolean => {
    return hasPermission(Permission.ALERT_SETTINGS_MANAGE);
  };

  /**
   * 通知送信権限を持っているかチェック
   */
  const canSendNotifications = (): boolean => {
    return hasPermission(Permission.NOTIFICATION_SEND);
  };

  /**
   * 一括リマインダー送信権限を持っているかチェック
   */
  const canSendBulkReminders = (): boolean => {
    return hasPermission(Permission.REMINDER_BULK_SEND);
  };

  /**
   * エクスポート権限を持っているかチェック
   */
  const canExportData = (): boolean => {
    return hasPermission(Permission.WEEKLY_REPORT_EXPORT);
  };

  /**
   * 部門管理権限を持っているかチェック
   */
  const canManageDepartments = (): boolean => {
    return hasPermission(Permission.DEPARTMENT_MANAGE);
  };

  /**
   * 分析レポート閲覧権限を持っているかチェック
   */
  const canViewAnalytics = (): boolean => {
    return hasPermission(Permission.ANALYTICS_VIEW);
  };

  return {
    // 基本的な権限チェック
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    
    // 便利な権限チェック関数
    isAdmin,
    isManager,
    canManageWeeklyReports,
    canManageAlerts,
    canSendNotifications,
    canSendBulkReminders,
    canExportData,
    canManageDepartments,
    canViewAnalytics,
    
    // 詳細情報
    userRoles,
    userPermissions,
    
    // 権限情報デバッグ用
    debug: {
      user,
      userRoles,
      userPermissions,
    },
  };
};

/**
 * 権限チェック用のユーティリティコンポーネント
 */
interface PermissionGateProps {
  permission?: Permission;
  permissions?: Permission[];
  role?: Role;
  roles?: Role[];
  requireAll?: boolean; // true: 全ての権限が必要, false: いずれかの権限があればOK
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  permissions = [],
  role,
  roles = [],
  requireAll = false,
  fallback = null,
  children,
}) => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
  } = usePermission();

  // 権限チェック
  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else if (role) {
    hasAccess = hasRole(role);
  } else if (roles.length > 0) {
    hasAccess = hasAnyRole(roles);
  }

  return hasAccess ? children : fallback;
};

export default usePermission;