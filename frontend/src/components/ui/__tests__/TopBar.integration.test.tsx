import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopBar } from '../TopBar';
import { useAuth } from '@/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/common';

// モック
jest.mock('@/hooks/useAuth');
jest.mock('@/components/common/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">NotificationBell</div>
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe('TopBar Integration Tests - Authentication System', () => {
  const mockOnMenuClick = jest.fn();
  const mockOnUserMenuClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('認証済みユーザーの場合', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      first_name: '太郎',
      last_name: '山田',
      role: 'user' as const,
      roles: ['user'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
        initializeAuth: jest.fn(),
        syncWithCognito: jest.fn(),
        refreshAuth: jest.fn()
      });
    });

    it('ユーザーアバターが表示される', () => {
      render(
        <TestWrapper>
          <TopBar
            onMenuClick={mockOnMenuClick}
            onUserMenuClick={mockOnUserMenuClick}
            isMobile={false}
          />
        </TestWrapper>
      );

      const userMenuButton = screen.getByTestId('user-menu-button');
      expect(userMenuButton).toBeInTheDocument();
      
      // アバターが表示されていることを確認
      const avatar = userMenuButton.querySelector('.MuiAvatar-root');
      expect(avatar).toBeInTheDocument();
    });

    it('ユーザーメニューボタンクリックでハンドラーが呼ばれる', () => {
      render(
        <TestWrapper>
          <TopBar
            onMenuClick={mockOnMenuClick}
            onUserMenuClick={mockOnUserMenuClick}
            isMobile={false}
          />
        </TestWrapper>
      );

      const userMenuButton = screen.getByTestId('user-menu-button');
      fireEvent.click(userMenuButton);
      
      expect(mockOnUserMenuClick).toHaveBeenCalledTimes(1);
    });

    it('管理者の場合、通知ベルが表示される', () => {
      render(
        <TestWrapper>
          <TopBar
            onMenuClick={mockOnMenuClick}
            onUserMenuClick={mockOnUserMenuClick}
            isMobile={false}
            isAdmin={true}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });

    it('一般ユーザーの場合、通知ベルが表示されない', () => {
      render(
        <TestWrapper>
          <TopBar
            onMenuClick={mockOnMenuClick}
            onUserMenuClick={mockOnUserMenuClick}
            isMobile={false}
            isAdmin={false}
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument();
    });
  });

  describe('未認証ユーザーの場合', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
        initializeAuth: jest.fn(),
        syncWithCognito: jest.fn(),
        refreshAuth: jest.fn()
      });
    });

    it('ユーザーアバターがグレー表示になる', () => {
      render(
        <TestWrapper>
          <TopBar
            onMenuClick={mockOnMenuClick}
            onUserMenuClick={mockOnUserMenuClick}
            isMobile={false}
          />
        </TestWrapper>
      );

      const userMenuButton = screen.getByTestId('user-menu-button');
      const avatar = userMenuButton.querySelector('.MuiAvatar-root');
      
      // スタイルの確認（グレー背景）
      expect(avatar).toHaveStyle({ backgroundColor: expect.stringContaining('grey') });
    });
  });

  describe('モバイル表示の場合', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
        initializeAuth: jest.fn(),
        syncWithCognito: jest.fn(),
        refreshAuth: jest.fn()
      });
    });

    it('メニューボタンが表示される', () => {
      render(
        <TestWrapper>
          <TopBar
            onMenuClick={mockOnMenuClick}
            onUserMenuClick={mockOnUserMenuClick}
            isMobile={true}
          />
        </TestWrapper>
      );

      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(button => 
        button.querySelector('svg[data-testid="MenuIcon"]')
      );
      
      expect(menuButton).toBeInTheDocument();
    });

    it('MONSTERAロゴが表示される', () => {
      render(
        <TestWrapper>
          <TopBar
            onMenuClick={mockOnMenuClick}
            onUserMenuClick={mockOnUserMenuClick}
            isMobile={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('MONSTERA')).toBeInTheDocument();
    });
  });

  describe('認証状態の切り替え', () => {
    it('認証状態が変更されるとUIが更新される', async () => {
      const { rerender } = render(
        <TestWrapper>
          <TopBar
            onMenuClick={mockOnMenuClick}
            onUserMenuClick={mockOnUserMenuClick}
            isMobile={false}
          />
        </TestWrapper>
      );

      // 初期状態（未認証）
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
        initializeAuth: jest.fn(),
        syncWithCognito: jest.fn(),
        refreshAuth: jest.fn()
      });

      let userMenuButton = screen.getByTestId('user-menu-button');
      let avatar = userMenuButton.querySelector('.MuiAvatar-root');
      expect(avatar).toHaveStyle({ backgroundColor: expect.stringContaining('grey') });

      // 認証済み状態に変更
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        first_name: '太郎',
        last_name: '山田',
        role: 'user' as const,
        roles: ['user'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
        initializeAuth: jest.fn(),
        syncWithCognito: jest.fn(),
        refreshAuth: jest.fn()
      });

      rerender(
        <TestWrapper>
          <TopBar
            onMenuClick={mockOnMenuClick}
            onUserMenuClick={mockOnUserMenuClick}
            isMobile={false}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        userMenuButton = screen.getByTestId('user-menu-button');
        avatar = userMenuButton.querySelector('.MuiAvatar-root');
        expect(avatar).toHaveStyle({ backgroundColor: expect.stringContaining('primary') });
      });
    });
  });
});