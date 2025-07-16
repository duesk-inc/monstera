import { Page, expect } from '@playwright/test';

/**
 * 営業関連機能のヘルパークラス
 */
export class SalesHelper {
  constructor(private page: Page) {}

  /**
   * 営業ダッシュボードに移動
   */
  async navigateToSalesDashboard() {
    await this.page.goto('/sales');
    await this.page.waitForSelector('[data-testid="sales-dashboard"]', { timeout: 10000 });
  }

  /**
   * 提案管理ページに移動
   */
  async navigateToProposalManagement() {
    await this.page.goto('/sales/proposals');
    await this.page.waitForSelector('[data-testid="proposal-data-table"]', { timeout: 15000 });
  }

  /**
   * 面談管理ページに移動
   */
  async navigateToInterviewManagement() {
    await this.page.goto('/sales/interviews');
    await this.page.waitForSelector('[data-testid="interview-calendar"]', { timeout: 15000 });
  }

  /**
   * 契約延長管理ページに移動
   */
  async navigateToExtensionManagement() {
    await this.page.goto('/sales/extensions');
    await this.page.waitForSelector('[data-testid="extension-table"]', { timeout: 15000 });
  }

  /**
   * メール管理ページに移動
   */
  async navigateToEmailManagement() {
    await this.page.goto('/sales/emails');
    await this.page.waitForSelector('[data-testid="email-templates"]', { timeout: 15000 });
  }

  /**
   * チーム管理ページに移動
   */
  async navigateToTeamManagement() {
    await this.page.goto('/sales/teams');
    await this.page.waitForSelector('[data-testid="team-members"]', { timeout: 15000 });
  }

  /**
   * POC同期管理ページに移動
   */
  async navigateToPocSyncManagement() {
    await this.page.goto('/sales/poc');
    await this.page.waitForSelector('[data-testid="poc-projects"]', { timeout: 15000 });
  }

  /**
   * 提案一覧から特定の提案を検索
   */
  async searchProposal(searchTerm: string) {
    await this.page.fill('[data-testid="proposal-search-input"]', searchTerm);
    await this.page.press('[data-testid="proposal-search-input"]', 'Enter');
    await this.page.waitForTimeout(1000); // 検索結果の反映を待つ
  }

  /**
   * 提案フィルターを設定
   */
  async filterProposals(status?: string, engineerId?: string, clientId?: string) {
    if (status) {
      await this.page.selectOption('[data-testid="status-filter"]', status);
    }
    if (engineerId) {
      await this.page.selectOption('[data-testid="engineer-filter"]', engineerId);
    }
    if (clientId) {
      await this.page.selectOption('[data-testid="client-filter"]', clientId);
    }
    await this.page.waitForTimeout(1000); // フィルター適用を待つ
  }

  /**
   * 新規提案作成ボタンをクリック
   */
  async clickCreateProposal() {
    await this.page.click('[data-testid="create-proposal-button"]');
    await this.page.waitForURL('**/proposals/new', { timeout: 10000 });
  }

  /**
   * 提案のステータスを変更
   */
  async changeProposalStatus(proposalId: string, newStatus: string) {
    const row = this.page.locator(`[data-testid="proposal-row-${proposalId}"]`);
    await row.locator('[data-testid="status-change-button"]').click();
    await this.page.selectOption('[data-testid="status-select"]', newStatus);
    await this.page.click('[data-testid="confirm-status-change"]');
    await this.page.waitForSelector('[data-testid="success-toast"]', { timeout: 5000 });
  }

  /**
   * 提案を編集
   */
  async editProposal(proposalId: string) {
    const row = this.page.locator(`[data-testid="proposal-row-${proposalId}"]`);
    await row.locator('[data-testid="more-actions-button"]').click();
    await this.page.click('[data-testid="edit-proposal-action"]');
    await this.page.waitForSelector('[data-testid="proposal-edit-dialog"]', { timeout: 5000 });
  }

  /**
   * 提案を削除
   */
  async deleteProposal(proposalId: string) {
    const row = this.page.locator(`[data-testid="proposal-row-${proposalId}"]`);
    await row.locator('[data-testid="more-actions-button"]').click();
    await this.page.click('[data-testid="delete-proposal-action"]');
    
    // 削除確認ダイアログ
    await this.page.waitForSelector('[data-testid="delete-confirmation-dialog"]', { timeout: 5000 });
    await this.page.click('[data-testid="confirm-delete-button"]');
    await this.page.waitForSelector('[data-testid="success-toast"]', { timeout: 5000 });
  }

  /**
   * 面談をスケジュール
   */
  async scheduleInterview(proposalId: string, interviewData: {
    date: string;
    time: string;
    duration: number;
    location?: string;
    meetingType: 'online' | 'onsite' | 'hybrid';
  }) {
    const row = this.page.locator(`[data-testid="proposal-row-${proposalId}"]`);
    await row.locator('[data-testid="more-actions-button"]').click();
    await this.page.click('[data-testid="schedule-interview-action"]');
    
    // 面談スケジュールダイアログ
    await this.page.waitForSelector('[data-testid="interview-dialog"]', { timeout: 5000 });
    
    // 日時設定
    await this.page.fill('[data-testid="interview-date-input"]', interviewData.date);
    await this.page.fill('[data-testid="interview-time-input"]', interviewData.time);
    await this.page.fill('[data-testid="interview-duration-input"]', interviewData.duration.toString());
    
    // 面談形式設定
    await this.page.selectOption('[data-testid="meeting-type-select"]', interviewData.meetingType);
    
    // 場所設定（オンサイトまたはハイブリッドの場合）
    if (interviewData.location && interviewData.meetingType !== 'online') {
      await this.page.fill('[data-testid="interview-location-input"]', interviewData.location);
    }
    
    // 保存
    await this.page.click('[data-testid="save-interview-button"]');
    await this.page.waitForSelector('[data-testid="success-toast"]', { timeout: 5000 });
  }

  /**
   * 提案メールを送信
   */
  async sendProposalEmail(proposalId: string, emailData: {
    template?: string;
    subject?: string;
    customMessage?: string;
  }) {
    const row = this.page.locator(`[data-testid="proposal-row-${proposalId}"]`);
    await row.locator('[data-testid="more-actions-button"]').click();
    await this.page.click('[data-testid="send-email-action"]');
    
    // メール送信ダイアログ
    await this.page.waitForSelector('[data-testid="email-dialog"]', { timeout: 5000 });
    
    if (emailData.template) {
      await this.page.selectOption('[data-testid="email-template-select"]', emailData.template);
    }
    
    if (emailData.subject) {
      await this.page.fill('[data-testid="email-subject-input"]', emailData.subject);
    }
    
    if (emailData.customMessage) {
      await this.page.fill('[data-testid="email-message-textarea"]', emailData.customMessage);
    }
    
    // 送信
    await this.page.click('[data-testid="send-email-button"]');
    await this.page.waitForSelector('[data-testid="success-toast"]', { timeout: 5000 });
  }

  /**
   * 提案データをエクスポート
   */
  async exportProposalData() {
    await this.page.click('[data-testid="export-button"]');
    
    // ダウンロード開始を待つ
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('[data-testid="confirm-export-button"]');
    const download = await downloadPromise;
    
    return download;
  }

  /**
   * 提案データをインポート
   */
  async importProposalData(filePath: string) {
    await this.page.click('[data-testid="import-button"]');
    await this.page.waitForSelector('[data-testid="import-dialog"]', { timeout: 5000 });
    
    // ファイル選択
    await this.page.setInputFiles('[data-testid="file-input"]', filePath);
    
    // インポート実行
    await this.page.click('[data-testid="confirm-import-button"]');
    await this.page.waitForSelector('[data-testid="success-toast"]', { timeout: 10000 });
  }

  /**
   * 提案の詳細を確認
   */
  async viewProposalDetails(proposalId: string) {
    const row = this.page.locator(`[data-testid="proposal-row-${proposalId}"]`);
    await row.click();
    await this.page.waitForSelector('[data-testid="proposal-details-dialog"]', { timeout: 5000 });
  }

  /**
   * 提案統計情報を確認
   */
  async checkProposalStatistics() {
    await expect(this.page.locator('[data-testid="total-proposals-count"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="active-proposals-count"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="success-rate"]')).toBeVisible();
  }

  /**
   * テーブルのページネーションを操作
   */
  async navigateToPage(pageNumber: number) {
    await this.page.click(`[data-testid="pagination-page-${pageNumber}"]`);
    await this.page.waitForTimeout(1000);
  }

  /**
   * テーブルのソートを実行
   */
  async sortBy(column: string) {
    await this.page.click(`[data-testid="sort-${column}"]`);
    await this.page.waitForTimeout(1000);
  }

  /**
   * バルクアクションを実行
   */
  async executeBulkAction(proposalIds: string[], action: string) {
    // 複数の提案を選択
    for (const id of proposalIds) {
      await this.page.check(`[data-testid="proposal-checkbox-${id}"]`);
    }
    
    // バルクアクションメニューを開く
    await this.page.click('[data-testid="bulk-actions-button"]');
    await this.page.click(`[data-testid="bulk-action-${action}"]`);
    
    // 確認ダイアログ
    await this.page.click('[data-testid="confirm-bulk-action"]');
    await this.page.waitForSelector('[data-testid="success-toast"]', { timeout: 5000 });
  }

  /**
   * 提案の進捗状況を確認
   */
  async checkProposalProgress(proposalId: string) {
    const row = this.page.locator(`[data-testid="proposal-row-${proposalId}"]`);
    const progressBar = row.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toBeVisible();
    
    const progressText = await progressBar.textContent();
    return progressText;
  }

  /**
   * 期限切れ近くの提案をチェック
   */
  async checkUpcomingDeadlines() {
    await expect(this.page.locator('[data-testid="deadline-alert"]')).toBeVisible();
    const deadlineCount = await this.page.locator('[data-testid="deadline-count"]').textContent();
    return parseInt(deadlineCount || '0');
  }

  /**
   * 営業担当者としてログイン
   */
  async loginAsSalesRepresentative() {
    await this.page.goto('/login');
    await this.page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });
    
    await this.page.fill('[data-testid="email-input"]', 'sales@duesk.co.jp');
    await this.page.fill('[data-testid="password-input"]', 'sales123');
    
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/sales', { timeout: 15000 });
  }

  /**
   * レスポンシブ表示の確認
   */
  async checkResponsiveLayout() {
    // モバイルサイズに変更
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500);
    
    // ハンバーガーメニューが表示されることを確認
    await expect(this.page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // デスクトップサイズに戻す
    await this.page.setViewportSize({ width: 1280, height: 720 });
    await this.page.waitForTimeout(500);
  }

  /**
   * 検索結果の件数を取得
   */
  async getSearchResultCount(): Promise<number> {
    const countText = await this.page.locator('[data-testid="search-result-count"]').textContent();
    return parseInt(countText?.match(/\d+/)?.[0] || '0');
  }

  /**
   * エラーメッセージの確認
   */
  async checkErrorMessage(expectedMessage: string) {
    await expect(this.page.locator('[data-testid="error-toast"]')).toContainText(expectedMessage);
  }

  /**
   * ローディング状態の確認
   */
  async waitForLoadingToComplete() {
    await this.page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden', timeout: 10000 });
  }
}