'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  RoleType, 
  ROLES, 
  ROLE_DISPLAY_NAMES,
  ALL_ROLES,
  ROLE_VALUE_TO_STRING,
  ROLE_STRING_TO_VALUE,
  RoleValueType
} from '@/constants/roles';

// アクティブロールコンテキストの型定義
interface ActiveRoleContextType {
  activeRole: RoleType | null;
  availableRoles: RoleType[];
  setActiveRole: (role: RoleType) => void;
  initializeActiveRole: (roles: string[], defaultRole?: number) => void;
  hasMultipleRoles: boolean;
  isActiveRole: (role: RoleType) => boolean;
  getDisplayName: (role: RoleType) => string;
  getHighestRole: () => RoleType | null;
}

// コンテキストの作成
const ActiveRoleContext = createContext<ActiveRoleContextType | undefined>(undefined);

// アクティブロールプロバイダーのプロパティ
interface ActiveRoleProviderProps {
  children: ReactNode;
}

// セッションストレージのキー
const ACTIVE_ROLE_KEY = 'monstera_active_role';

// アクティブロールプロバイダー
export const ActiveRoleProvider: React.FC<ActiveRoleProviderProps> = ({ children }) => {
  const [activeRole, setActiveRoleState] = useState<RoleType | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleType[]>([]);

  // 複数ロールを持っているかどうか
  const hasMultipleRoles = availableRoles.length > 1;

  // アクティブロールを設定する関数
  const setActiveRole = (role: RoleType) => {
    if (availableRoles.includes(role)) {
      const previousRole = activeRole;
      setActiveRoleState(role);
      // セッションストレージに保存
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
        // ロール変更イベントを発行
        window.dispatchEvent(new CustomEvent('roleChanged', { 
          detail: { newRole: role, previousRole } 
        }));
      }
    }
  };

  // 利用可能なロールを初期化する関数
  const initializeActiveRole = (roles: string[], defaultRole?: number) => {
    // 文字列配列をRoleType配列に変換
    const validRoles: RoleType[] = roles
      .filter((role): role is RoleType => 
        ALL_ROLES.includes(role as RoleType)
      );

    setAvailableRoles(validRoles);

    // セッションストレージから以前のアクティブロールを復元
    let savedActiveRole: RoleType | null = null;
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(ACTIVE_ROLE_KEY);
      if (saved && validRoles.includes(saved as RoleType)) {
        savedActiveRole = saved as RoleType;
      }
    }

    // アクティブロールを設定
    if (savedActiveRole) {
      setActiveRoleState(savedActiveRole);
    } else if (defaultRole && ROLE_VALUE_TO_STRING[defaultRole as RoleValueType] && validRoles.includes(ROLE_VALUE_TO_STRING[defaultRole as RoleValueType])) {
      // ユーザーのデフォルトロールが設定されており、利用可能なロールに含まれている場合
      const defaultRoleString = ROLE_VALUE_TO_STRING[defaultRole as RoleValueType];
      setActiveRoleState(defaultRoleString);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(ACTIVE_ROLE_KEY, defaultRoleString);
      }
    } else if (validRoles.length > 0) {
      // 単一ロールの場合はそれを使用、複数ロールの場合は最高権限を使用
      const defaultActiveRole = validRoles.length === 1 
        ? validRoles[0] 
        : getHighestRoleFromList(validRoles);
      setActiveRoleState(defaultActiveRole);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(ACTIVE_ROLE_KEY, defaultActiveRole);
      }
    }
  };

  // 指定されたロールがアクティブロールかどうか
  const isActiveRole = (role: RoleType) => activeRole === role;

  // ロールの表示名を取得
  const getDisplayName = (role: RoleType) => ROLE_DISPLAY_NAMES[role] || role;

  // 最高権限のロールを取得
  const getHighestRole = () => {
    if (availableRoles.length === 0) return null;
    return getHighestRoleFromList(availableRoles);
  };

  // リストから最高権限のロールを選択
  const getHighestRoleFromList = (roles: RoleType[]): RoleType => {
    return roles.reduce((highest, current) => {
      const currentValue = ROLE_STRING_TO_VALUE[current];
      const highestValue = ROLE_STRING_TO_VALUE[highest];
      return currentValue < highestValue ? current : highest;
    });
  };

  // コンテキスト値
  const contextValue: ActiveRoleContextType = {
    activeRole,
    availableRoles,
    setActiveRole,
    initializeActiveRole,
    hasMultipleRoles,
    isActiveRole,
    getDisplayName,
    getHighestRole,
  };

  return (
    <ActiveRoleContext.Provider value={contextValue}>
      {children}
    </ActiveRoleContext.Provider>
  );
};

// アクティブロールコンテキストを使用するフック
export const useActiveRole = (): ActiveRoleContextType => {
  const context = useContext(ActiveRoleContext);
  if (context === undefined) {
    throw new Error('useActiveRole must be used within an ActiveRoleProvider');
  }
  return context;
};