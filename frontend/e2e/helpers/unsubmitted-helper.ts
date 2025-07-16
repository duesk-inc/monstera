import { Page, Locator } from '@playwright/test';

/**
 * 未提出者管理機能のヘルパー関数
 */
export class UnsubmittedHelper {
  constructor(private page: Page) {}

  /**
   * 未提出者管理タブに移動
   */
  async navigateToUnsubmittedTab() {
    await this.page.goto('/admin/weekly-reports');
    await this.page.waitForSelector('[data-testid="weekly-reports-page"]');
    await this.page.click('[role="tab"]:has-text("未提出者管理")');
    await this.page.waitForSelector('[data-testid="unsubmitted-management-tab"]');
  }

  /**
   * サマリー統計を取得
   */
  async getSummaryStats() {
    return {
      total: await this.getCardValue('unsubmitted-total-card'),
      overdue7Days: await this.getCardValue('overdue-7days-card'),
      overdue14Days: await this.getCardValue('overdue-14days-card'),
      escalationTargets: await this.getCardValue('escalation-targets-card'),
    };
  }

  /**
   * カードの値を取得
   */
  private async getCardValue(cardTestId: string): Promise<number> {
    const valueText = await this.page
      .locator(`[data-testid="${cardTestId}"] [data-testid="card-value"]`)
      .textContent();
    return parseInt(valueText || '0');
  }

  /**
   * 部署でフィルタリング
   */
  async filterByDepartment(department: string) {
    await this.page.selectOption('[data-testid="department-filter"]', department);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 最小経過日数でフィルタリング
   */
  async filterByMinDaysOverdue(days: number) {
    await this.page.fill('[data-testid="min-days-filter"]', days.toString());
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * テーブルの行数を取得
   */
  async getTableRowCount(): Promise<number> {
    return await this.page.locator('[data-testid="unsubmitted-table"] tbody tr').count();
  }

  /**
   * 特定の行を取得
   */
  getTableRow(index: number): Locator {
    return this.page.locator('[data-testid="unsubmitted-table"] tbody tr').nth(index);
  }

  /**
   * ユーザーを選択
   */
  async selectUsers(indices: number[]) {
    for (const index of indices) {
      const checkbox = this.getTableRow(index).locator('input[type="checkbox"]');
      await checkbox.check();
    }
  }

  /**
   * 全ユーザーを選択
   */
  async selectAllUsers() {
    const selectAllCheckbox = this.page.locator('[data-testid="select-all-checkbox"]');
    await selectAllCheckbox.check();
  }

  /**
   * 単一ユーザーへのリマインダー送信
   */
  async sendReminderToUser(rowIndex: number) {
    const sendButton = this.getTableRow(rowIndex).locator('[data-testid="send-reminder-button"]');
    await sendButton.click();
    
    // 確認ダイアログで送信
    await this.page.waitForSelector('[data-testid="reminder-confirm-dialog"]');
    await this.page.click('[data-testid="confirm-send-button"]');
    
    // 成功メッセージを待つ
    await this.page.waitForSelector('[data-testid="toast-success"]');
  }

  /**
   * 一括リマインダー送信
   */
  async sendBulkReminders() {
    await this.page.click('[data-testid="bulk-send-reminder-button"]');
    
    // 確認ダイアログで送信
    await this.page.waitForSelector('[data-testid="bulk-reminder-dialog"]');
    await this.page.click('[data-testid="confirm-bulk-send-button"]');
    
    // 成功メッセージを待つ
    await this.page.waitForSelector('[data-testid="toast-success"]');
  }

  /**
   * CSVエクスポート
   */
  async exportAsCSV() {
    await this.page.click('[data-testid="export-button"]');
    await this.page.waitForSelector('[data-testid="export-menu"]');
    
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('[data-testid="export-csv-option"]');
    
    return await downloadPromise;
  }

  /**
   * Excelエクスポート
   */
  async exportAsExcel() {
    await this.page.click('[data-testid="export-button"]');
    await this.page.waitForSelector('[data-testid="export-menu"]');
    
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('[data-testid="export-excel-option"]');
    
    return await downloadPromise;
  }

  /**
   * データのリフレッシュ
   */
  async refreshData() {
    await this.page.click('[data-testid="refresh-button"]');
    await this.page.waitForSelector('[data-testid="loading-indicator"]');
    await this.page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden' });
  }

  /**
   * 特定のユーザーの情報を取得
   */
  async getUserInfo(rowIndex: number) {
    const row = this.getTableRow(rowIndex);
    
    return {
      name: await row.locator('[data-testid="user-name"]').textContent(),
      email: await row.locator('[data-testid="user-email"]').textContent(),
      department: await row.locator('[data-testid="user-department"]').textContent(),
      weekPeriod: await row.locator('[data-testid="week-period"]').textContent(),
      daysOverdue: await row.locator('[data-testid="days-overdue"]').textContent(),
      manager: await row.locator('[data-testid="manager-name"]').textContent(),
      reminderStatus: await row.locator('[data-testid="reminder-status"]').textContent(),
    };
  }

  /**
   * エスカレーション対象者の数を取得
   */
  async getEscalationTargetsCount(): Promise<number> {
    const escalationRows = await this.page
      .locator('[data-testid="unsubmitted-table"] tbody tr')
      .filter({ has: this.page.locator('[data-testid="days-overdue-chip"][data-severity="error"]') })
      .count();
    
    return escalationRows;
  }

  /**
   * 経過日数による警告レベルを確認
   */
  async checkOverdueWarningLevels() {
    const warningCount = await this.page
      .locator('[data-testid="days-overdue-chip"][data-severity="warning"]')
      .count();
    
    const errorCount = await this.page
      .locator('[data-testid="days-overdue-chip"][data-severity="error"]')
      .count();
    
    const infoCount = await this.page
      .locator('[data-testid="days-overdue-chip"][data-severity="info"]')
      .count();
    
    return {
      info: infoCount,      // 7日未満
      warning: warningCount, // 7-13日
      error: errorCount      // 14日以上
    };
  }
}