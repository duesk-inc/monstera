import { Page, expect } from '@playwright/test';
import { AuthHelper } from './auth-helper';

/**
 * エンジニア管理関連のヘルパー関数
 */
export class EngineerHelper {
  private authHelper: AuthHelper;

  constructor(private page: Page) {
    this.authHelper = new AuthHelper(page);
  }

  /**
   * エンジニア管理ページに移動
   */
  async navigateToEngineerManagement() {
    // 管理者でログインしていることを確認
    const isAdmin = await this.authHelper.isAdmin();
    if (!isAdmin) {
      await this.authHelper.loginAsAdmin();
    }

    await this.page.click('[data-testid="engineer-management-menu"]');
    await this.page.waitForURL('/admin/engineers', { timeout: 10000 });
    await this.page.waitForSelector('[data-testid="engineer-list-table"]', { timeout: 10000 });
  }

  /**
   * 新規エンジニア作成
   */
  async createEngineer(engineerData: {
    email: string;
    firstName: string;
    lastName: string;
    firstNameKana: string;
    lastNameKana: string;
    sei: string;
    mei: string;
    seiKana?: string;
    meiKana?: string;
    department?: string;
    position?: string;
    phoneNumber?: string;
  }) {
    await this.navigateToEngineerManagement();
    
    // 新規追加ボタンをクリック
    await this.page.click('[data-testid="add-engineer-button"]');
    await this.page.waitForURL('/admin/engineers/new', { timeout: 10000 });
    
    // フォーム表示待ち
    await this.page.waitForSelector('[data-testid="engineer-form"]', { timeout: 10000 });
    
    // 必須フィールドの入力
    await this.page.fill('[data-testid="email-field"]', engineerData.email);
    await this.page.fill('[data-testid="firstName-field"]', engineerData.firstName);
    await this.page.fill('[data-testid="lastName-field"]', engineerData.lastName);
    await this.page.fill('[data-testid="firstNameKana-field"]', engineerData.firstNameKana);
    await this.page.fill('[data-testid="lastNameKana-field"]', engineerData.lastNameKana);
    await this.page.fill('[data-testid="sei-field"]', engineerData.sei);
    await this.page.fill('[data-testid="mei-field"]', engineerData.mei);
    
    // オプションフィールドの入力
    if (engineerData.seiKana) {
      await this.page.fill('[data-testid="seiKana-field"]', engineerData.seiKana);
    }
    if (engineerData.meiKana) {
      await this.page.fill('[data-testid="meiKana-field"]', engineerData.meiKana);
    }
    if (engineerData.department) {
      await this.page.fill('[data-testid="department-field"]', engineerData.department);
    }
    if (engineerData.position) {
      await this.page.fill('[data-testid="position-field"]', engineerData.position);
    }
    if (engineerData.phoneNumber) {
      await this.page.fill('[data-testid="phoneNumber-field"]', engineerData.phoneNumber);
    }
    
    // 保存ボタンをクリック
    await this.page.click('[data-testid="submit-button"]');
    
    // 成功メッセージの確認
    await this.page.waitForSelector('[data-testid="success-toast"]', { timeout: 10000 });
    
    // エンジニア詳細ページにリダイレクトされることを確認
    await this.page.waitForURL(/\/admin\/engineers\/[^\/]+$/, { timeout: 10000 });
  }

  /**
   * エンジニア検索
   */
  async searchEngineer(keyword: string) {
    await this.navigateToEngineerManagement();
    
    // 検索フィールドに入力
    await this.page.fill('[data-testid="search-field"]', keyword);
    
    // 検索結果の表示待ち
    await this.page.waitForFunction(
      (searchKeyword) => {
        const table = document.querySelector('[data-testid="engineer-list-table"]');
        return table && table.textContent?.includes(searchKeyword);
      },
      keyword,
      { timeout: 10000 }
    );
  }

  /**
   * エンジニア情報の編集
   */
  async editEngineer(engineerId: string, updatedData: {
    department?: string;
    position?: string;
    phoneNumber?: string;
  }) {
    await this.page.goto(`/admin/engineers/${engineerId}/edit`);
    await this.page.waitForSelector('[data-testid="engineer-form"]', { timeout: 10000 });
    
    // 更新するフィールドの入力
    if (updatedData.department) {
      await this.page.fill('[data-testid="department-field"]', updatedData.department);
    }
    if (updatedData.position) {
      await this.page.fill('[data-testid="position-field"]', updatedData.position);
    }
    if (updatedData.phoneNumber) {
      await this.page.fill('[data-testid="phoneNumber-field"]', updatedData.phoneNumber);
    }
    
    // 保存ボタンをクリック
    await this.page.click('[data-testid="submit-button"]');
    
    // 成功メッセージの確認
    await this.page.waitForSelector('[data-testid="success-toast"]', { timeout: 10000 });
  }

  /**
   * エンジニアステータス変更
   */
  async changeEngineerStatus(engineerId: string, newStatus: string, reason: string) {
    await this.page.goto(`/admin/engineers/${engineerId}`);
    await this.page.waitForSelector('[data-testid="engineer-detail"]', { timeout: 10000 });
    
    // アクションメニューを開く
    await this.page.click('[data-testid="engineer-actions-menu"]');
    
    // ステータス変更を選択
    await this.page.click('[data-testid="change-status-action"]');
    
    // ステータス変更ダイアログの表示待ち
    await this.page.waitForSelector('[data-testid="status-change-dialog"]', { timeout: 10000 });
    
    // 新しいステータスを選択
    await this.page.selectOption('[data-testid="status-select"]', newStatus);
    
    // 変更理由を入力
    await this.page.fill('[data-testid="reason-field"]', reason);
    
    // 変更ボタンをクリック
    await this.page.click('[data-testid="confirm-status-change"]');
    
    // 成功メッセージの確認
    await this.page.waitForSelector('[data-testid="success-toast"]', { timeout: 10000 });
  }

  /**
   * エンジニア削除
   */
  async deleteEngineer(engineerId: string) {
    await this.page.goto(`/admin/engineers/${engineerId}`);
    await this.page.waitForSelector('[data-testid="engineer-detail"]', { timeout: 10000 });
    
    // アクションメニューを開く
    await this.page.click('[data-testid="engineer-actions-menu"]');
    
    // 削除を選択
    await this.page.click('[data-testid="delete-engineer-action"]');
    
    // 削除確認ダイアログの表示待ち
    await this.page.waitForSelector('[data-testid="delete-confirmation-dialog"]', { timeout: 10000 });
    
    // 削除を確認
    await this.page.click('[data-testid="confirm-delete"]');
    
    // 成功メッセージの確認
    await this.page.waitForSelector('[data-testid="success-toast"]', { timeout: 10000 });
    
    // エンジニア一覧ページにリダイレクトされることを確認
    await this.page.waitForURL('/admin/engineers', { timeout: 10000 });
  }

  /**
   * CSVエクスポート
   */
  async exportEngineersCSV() {
    await this.navigateToEngineerManagement();
    
    // ダウンロードイベントのリスナーを設定
    const downloadPromise = this.page.waitForEvent('download');
    
    // エクスポートボタンをクリック
    await this.page.click('[data-testid="export-csv-button"]');
    
    // ダウンロードの完了を待つ
    const download = await downloadPromise;
    
    // ファイル名を確認
    expect(download.suggestedFilename()).toMatch(/engineers.*\.csv$/);
    
    return download;
  }

  /**
   * CSVインポート
   */
  async importEngineersCSV(csvFilePath: string) {
    await this.page.goto('/admin/engineers/import');
    await this.page.waitForSelector('[data-testid="csv-import-form"]', { timeout: 10000 });
    
    // ファイルを選択
    await this.page.setInputFiles('[data-testid="csv-file-input"]', csvFilePath);
    
    // インポートボタンをクリック
    await this.page.click('[data-testid="import-button"]');
    
    // インポート結果の表示待ち
    await this.page.waitForSelector('[data-testid="import-result"]', { timeout: 30000 });
  }

  /**
   * エンジニア詳細情報の確認
   */
  async verifyEngineerDetail(engineerId: string, expectedData: {
    fullName: string;
    email: string;
    department?: string;
    position?: string;
    status: string;
  }) {
    await this.page.goto(`/admin/engineers/${engineerId}`);
    await this.page.waitForSelector('[data-testid="engineer-detail"]', { timeout: 10000 });
    
    // 基本情報の確認
    await expect(this.page.locator('[data-testid="engineer-name"]')).toContainText(expectedData.fullName);
    await expect(this.page.locator('[data-testid="engineer-email"]')).toContainText(expectedData.email);
    await expect(this.page.locator('[data-testid="engineer-status"]')).toContainText(expectedData.status);
    
    if (expectedData.department) {
      await expect(this.page.locator('[data-testid="engineer-department"]')).toContainText(expectedData.department);
    }
    
    if (expectedData.position) {
      await expect(this.page.locator('[data-testid="engineer-position"]')).toContainText(expectedData.position);
    }
  }

  /**
   * エンジニア一覧での存在確認
   */
  async verifyEngineerInList(engineerName: string, shouldExist: boolean = true) {
    await this.navigateToEngineerManagement();
    
    const engineerRow = this.page.locator(`[data-testid="engineer-row"]:has-text("${engineerName}")`);
    
    if (shouldExist) {
      await expect(engineerRow).toBeVisible();
    } else {
      await expect(engineerRow).not.toBeVisible();
    }
  }
}