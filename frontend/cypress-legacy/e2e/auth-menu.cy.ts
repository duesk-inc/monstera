describe('認証システム統合テスト', () => {
  const testUser = {
    email: 'admin@example.com',
    password: 'Admin123!',
    firstName: '管理者',
    lastName: 'テスト'
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('ログイン後のユーザーメニュー表示', () => {
    it('ログインするとユーザー情報が表示される', () => {
      // ログインページへアクセス
      cy.visit('/login');

      // ログインフォームに入力
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      
      // ログインボタンをクリック
      cy.get('button[type="submit"]').click();

      // ダッシュボードへのリダイレクトを待つ
      cy.url().should('include', '/dashboard');

      // ユーザーメニューボタンが表示されることを確認
      cy.get('[data-testid="user-menu-button"]').should('be.visible');

      // ユーザーメニューボタンをクリック
      cy.get('[data-testid="user-menu-button"]').click();

      // ユーザーメニューが開くことを確認
      cy.get('[data-testid="user-menu"]').should('be.visible');

      // ユーザー情報が表示されることを確認
      cy.get('[data-testid="user-name"]').should('contain', testUser.lastName);
      cy.get('[data-testid="user-email"]').should('contain', testUser.email);
      cy.get('[data-testid="user-role"]').should('be.visible');
      
      // ログアウトボタンが表示されることを確認
      cy.get('[data-testid="logout-button"]').should('be.visible');
    });

    it('ページリロード後も認証状態が保持される', () => {
      // 事前にログイン
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard');

      // ページをリロード
      cy.reload();

      // 認証状態が保持されていることを確認
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-menu-button"]').should('be.visible');

      // ユーザーメニューが正しく動作することを確認
      cy.get('[data-testid="user-menu-button"]').click();
      cy.get('[data-testid="user-menu"]').should('be.visible');
      cy.get('[data-testid="user-email"]').should('contain', testUser.email);
    });

    it('複数ロールを持つユーザーでロール切り替えが表示される', () => {
      // マルチロールユーザーでログイン（必要に応じてテストデータを調整）
      cy.visit('/login');
      cy.get('input[name="email"]').type('multi.role@example.com');
      cy.get('input[name="password"]').type('MultiRole123!');
      cy.get('button[type="submit"]').click();

      // ダッシュボードへ遷移
      cy.url().should('include', '/dashboard');

      // ユーザーメニューを開く
      cy.get('[data-testid="user-menu-button"]').click();

      // ロール切り替えコンポーネントが表示されることを確認
      cy.get('[data-testid="role-switcher"]').should('be.visible');
    });
  });

  describe('ログアウト機能', () => {
    beforeEach(() => {
      // 事前にログイン
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard');
    });

    it('ログアウトボタンクリックでログアウトされる', () => {
      // ユーザーメニューを開く
      cy.get('[data-testid="user-menu-button"]').click();
      
      // ログアウトボタンをクリック
      cy.get('[data-testid="logout-button"]').click();

      // ログインページへリダイレクトされることを確認
      cy.url().should('include', '/login');

      // ローカルストレージがクリアされることを確認
      cy.window().then((win) => {
        expect(win.localStorage.getItem('monstera_user')).to.be.null;
      });
    });

    it('ログアウト後、保護されたページにアクセスできない', () => {
      // ログアウト
      cy.get('[data-testid="user-menu-button"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // 保護されたページへ直接アクセスを試みる
      cy.visit('/dashboard', { failOnStatusCode: false });

      // ログインページへリダイレクトされることを確認
      cy.url().should('include', '/login');
    });
  });

  describe('未認証状態での表示', () => {
    it('未認証時はログインボタンが表示される', () => {
      // 未認証状態でダッシュボードへアクセス
      cy.visit('/login');

      // ユーザーメニューボタンが表示される（グレーアウト状態）
      cy.get('[data-testid="user-menu-button"]').should('be.visible');
      
      // クリックしてメニューを開く
      cy.get('[data-testid="user-menu-button"]').click();

      // ログインリンクが表示されることを確認
      cy.get('[data-testid="user-menu"]').within(() => {
        cy.contains('ログイン').should('be.visible');
      });
    });
  });

  describe('認証エラー処理', () => {
    it('401エラー時に自動的にログアウトされる', () => {
      // ログイン
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard');

      // 401エラーを発生させる（APIモックを使用）
      cy.intercept('GET', '/api/user/profile', {
        statusCode: 401,
        body: { error: 'Unauthorized' }
      });

      // プロフィール情報の再取得をトリガー
      cy.reload();

      // ログインページへリダイレクトされることを確認
      cy.url().should('include', '/login');
      
      // トーストメッセージが表示されることを確認
      cy.contains('セッションが切れました').should('be.visible');
    });
  });
});

