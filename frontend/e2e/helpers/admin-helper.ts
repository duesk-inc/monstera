import { Page } from '@playwright/test';

/**
 * 管理者機能のヘルパークラス
 * 管理者週報管理画面のE2Eテストで使用する共通処理
 */
export class AdminHelper {
  constructor(private page: Page) {}

  /**
   * 週報管理画面に移動
   */
  async navigateToWeeklyReports() {
    await this.page.goto('/admin/weekly-reports');
    await this.page.waitForSelector('[data-testid="admin-weekly-reports-page"]');
  }

  /**
   * 指定したタブに切り替え
   */
  async switchToTab(tabName: '未提出者管理' | '週次レポート' | '月次レポート' | 'アラート設定') {
    await this.page.click(`[role="tab"]:has-text("${tabName}")`);
    
    // タブコンテンツが表示されるまで待機
    const tabTestIds = {
      '未提出者管理': 'unsubmitted-management-tab',
      '週次レポート': 'weekly-report-tab',
      '月次レポート': 'monthly-report-tab',
      'アラート設定': 'alert-settings-tab'
    };
    
    await this.page.waitForSelector(`[data-testid="${tabTestIds[tabName]}"]`);
  }

  /**
   * 日付範囲を設定
   */
  async setDateRange(startDate: string, endDate: string) {
    await this.page.fill('[data-testid="start-date-input"]', startDate);
    await this.page.fill('[data-testid="end-date-input"]', endDate);
  }

  /**
   * フィルターを適用
   */
  async applyFilter(filterType: 'status' | 'department', value: string) {
    const filterTestId = filterType === 'status' ? 'status-filter' : 'department-filter';
    await this.page.selectOption(`[data-testid="${filterTestId}"]`, value);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * データテーブルの行数を取得
   */
  async getTableRowCount(tableTestId: string): Promise<number> {
    return await this.page.locator(`[data-testid="${tableTestId}"] tbody tr`).count();
  }

  /**
   * ページネーション操作
   */
  async goToPage(pageNumber: number) {
    await this.page.click(`[data-testid="page-${pageNumber}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 次のページに移動
   */
  async goToNextPage() {
    await this.page.click('[data-testid="next-page-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 前のページに移動
   */
  async goToPreviousPage() {
    await this.page.click('[data-testid="previous-page-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * エクスポート操作
   */
  async exportData(format: 'csv' | 'excel' | 'pdf') {
    await this.page.click('[data-testid="export-button"]');
    await this.page.waitForSelector('[data-testid="export-menu"]');
    
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click(`[data-testid="export-${format}-option"]`);
    
    return await downloadPromise;
  }

  /**
   * ダイアログ操作
   */
  async confirmDialog() {
    await this.page.click('[data-testid="confirm-button"]');
  }

  async cancelDialog() {
    await this.page.click('[data-testid="cancel-button"]');
  }

  /**
   * Toast通知の確認
   */
  async waitForToast(type: 'success' | 'error' | 'warning' | 'info') {
    await this.page.waitForSelector(`[data-testid="toast-${type}"]`);
  }

  /**
   * アラート設定の更新
   */
  async updateAlertSettings(settings: {
    weeklyHoursLimit?: number;
    weeklyChangeLimit?: number;
    holidayWorkLimit?: number;
    monthlyOvertimeLimit?: number;
  }) {
    if (settings.weeklyHoursLimit !== undefined) {
      await this.page.fill('[data-testid="weekly-hours-limit-input"]', settings.weeklyHoursLimit.toString());
    }
    if (settings.weeklyChangeLimit !== undefined) {
      await this.page.fill('[data-testid="weekly-change-limit-input"]', settings.weeklyChangeLimit.toString());
    }
    if (settings.holidayWorkLimit !== undefined) {
      await this.page.fill('[data-testid="holiday-work-limit-input"]', settings.holidayWorkLimit.toString());
    }
    if (settings.monthlyOvertimeLimit !== undefined) {
      await this.page.fill('[data-testid="monthly-overtime-limit-input"]', settings.monthlyOvertimeLimit.toString());
    }
    
    await this.page.click('[data-testid="save-alert-settings-button"]');
  }

  /**
   * 月次レポートの月を選択
   */
  async selectMonth(year: number, month: number) {
    const monthValue = `${year}-${month.toString().padStart(2, '0')}`;
    await this.page.fill('[data-testid="month-picker"]', monthValue);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 統計カードの値を取得
   */
  async getStatCardValue(cardTestId: string): Promise<string> {
    const value = await this.page.locator(`[data-testid="${cardTestId}"] [data-testid="card-value"]`).textContent();
    return value || '';
  }

  /**
   * データの再読み込み
   */
  async refreshData() {
    await this.page.click('[data-testid="refresh-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * ローディング状態の確認
   */
  async waitForLoadingComplete() {
    // ローディングインジケーターが消えるまで待機
    await this.page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden' });
  }

  /**
   * エラー状態の確認
   */
  async checkForErrors(): Promise<boolean> {
    const errorElement = this.page.locator('[data-testid="error-message"]');
    return await errorElement.isVisible();
  }

  /**
   * 空状態の確認
   */
  async checkEmptyState(): Promise<boolean> {
    const emptyState = this.page.locator('[data-testid="empty-state"]');
    return await emptyState.isVisible();
  }
}