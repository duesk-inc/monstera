'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { logout as apiLogout, getCurrentUser } from '@/lib/api/auth';
import { DebugLogger } from '@/lib/debug/logger';

// ユーザーデータの型定義
export interface UserData {
  id: string;
  name: string;
  email: string;
  department: string;
  gender: 'male' | 'female' | 'other' | 'not_specified';
  role: string;
}

// 認証コンテキストの型定義
interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: UserData) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// コンテキスト作成
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

// Providerコンポーネント
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初期化時にローカルストレージからユーザー情報をロード
  useEffect(() => {
    const loadUserFromLocalStorage = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        DebugLogger.apiError({
          category: '認証',
          operation: 'ユーザーデータ読み込み'
        }, {
          error
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromLocalStorage();
  }, []);

  // ログイン処理
  const login = (userData: UserData) => {
    setUser(userData);
    // ローカルストレージに保存
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // ユーザー情報をリフレッシュ
  const refreshUser = async () => {
    try {
      DebugLogger.info({
        category: '認証コンテキスト',
        operation: 'ユーザー情報リフレッシュ'
      }, 'Cognito認証でユーザー情報をリフレッシュ');

      const response = await getCurrentUser();
      if (response.user) {
        const userData: UserData = {
          id: response.user.id,
          name: `${response.user.first_name || ''} ${response.user.last_name || ''}`.trim(),
          email: response.user.email,
          department: response.user.department || '',
          gender: 'not_specified', // デフォルト値
          role: response.user.role
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        // ユーザー情報がnullの場合はクリア
        setUser(null);
        localStorage.removeItem('user');
      }
    } catch (error) {
      DebugLogger.apiError({
        category: '認証コンテキスト',
        operation: 'ユーザー情報リフレッシュ'
      }, {
        error
      });
      // エラーが発生した場合はユーザー情報をクリア
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    DebugLogger.info({
      category: '認証コンテキスト',
      operation: 'ログアウト'
    }, 'Cognito認証でログアウト処理を実行');

    // Cognito認証APIを呼び出してログアウト
    apiLogout()
      .then(() => {
        setUser(null);
        // ローカルストレージから削除
        localStorage.removeItem('user');
        
        DebugLogger.info({
          category: '認証コンテキスト',
          operation: 'ログアウト成功'
        }, 'ログアウト処理が正常に完了');
      })
      .catch(error => {
        DebugLogger.apiError({
          category: '認証コンテキスト',
          operation: 'ログアウトエラー'
        }, {
          error
        });
        // エラーが発生してもユーザー情報はクリア
        setUser(null);
        localStorage.removeItem('user');
      });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout: handleLogout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// カスタムフック
export function useAuth() {
  return useContext(AuthContext);
}

// 仮のデモデータ（開発用）
export const demoUsers: UserData[] = [
  {
    id: '1',
    name: '山田 太郎',
    email: 'taro.yamada@duesk.co.jp',
    department: '開発部',
    gender: 'male',
    role: 'employee',
  },
  {
    id: '2',
    name: '佐藤 花子',
    email: 'hanako.sato@duesk.co.jp',
    department: '人事部',
    gender: 'female',
    role: 'manager',
  },
  {
    id: '3',
    name: '田中 一郎',
    email: 'ichiro.tanaka@duesk.co.jp',
    department: '営業部',
    gender: 'male',
    role: 'admin',
  },
]; 