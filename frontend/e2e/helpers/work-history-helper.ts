import { Page, expect } from '@playwright/test';

/**
 * 職務経歴関連のヘルパー関数
 */
export class WorkHistoryHelper {
  constructor(private page: Page) {}

  /**
   * 職務経歴一覧ページへ移動
   */
  async navigateToWorkHistoryList() {
    // APIレスポンスをモック
    await this.page.route('**/api/v1/work-history**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          work_histories: [],
          summary: {
            total_projects: 0,
            total_months: 0,
            primary_industry: null
          },
          it_experience: {
            years: 0,
            months: 0,
            total_months: 0
          },
          technology_skills: [],
          total: 0
        })
      });
    });

    // マスターデータのAPIもモック
    await this.page.route('**/api/v1/work-history/master-data**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          industries: [
            { id: 1, name: 'IT・ソフトウェア' },
            { id: 2, name: '金融' },
            { id: 3, name: '製造業' }
          ],
          processes: [
            { id: 1, name: '要件定義' },
            { id: 2, name: '設計' },
            { id: 3, name: '実装' }
          ],
          technology_categories: [
            { id: 1, name: 'プログラミング言語' },
            { id: 2, name: 'フレームワーク' },
            { id: 3, name: 'データベース' }
          ]
        })
      });
    });
    
    await this.page.goto('/work-history');
    await this.page.waitForLoadState('networkidle');
    
    // ページタイトルまたは特徴的な要素の確認
    await expect(this.page.locator('h4:has-text("職務経歴一覧")')).toBeVisible({ timeout: 10000 });
  }

  /**
   * 新規作成ダイアログを開く
   */
  async openCreateDialog() {
    // フローティングアクションボタンをクリック
    const fabButton = this.page.locator('button[aria-label="新規作成"]');
    await fabButton.click();
    
    // ダイアログの表示待ち
    await this.page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await expect(this.page.locator('h2:has-text("職務経歴"), h2:has-text("新規作成")')).toBeVisible();
  }

  /**
   * 職務経歴の基本情報を入力
   */
  async fillBasicInfo(data: {
    projectName: string;
    startDate: string;
    endDate?: string;
    industry: string;
    companyName?: string;
    teamSize?: number;
    role: string;
  }) {
    // プロジェクト名
    await this.page.fill('input[name="projectName"]', data.projectName);
    
    // 開始日
    await this.page.fill('input[name="startDate"]', data.startDate);
    
    // 終了日（任意）
    if (data.endDate) {
      await this.page.fill('input[name="endDate"]', data.endDate);
    }
    
    // 業界選択
    await this.page.click('[data-testid="industry-select"], #industry');
    await this.page.click(`li[role="option"]:has-text("${data.industry}")`);
    
    // 会社名（任意）
    if (data.companyName) {
      await this.page.fill('input[name="companyName"]', data.companyName);
    }
    
    // チームサイズ（任意）
    if (data.teamSize) {
      await this.page.fill('input[name="teamSize"]', data.teamSize.toString());
    }
    
    // 役割
    await this.page.fill('input[name="role"]', data.role);
  }

  /**
   * プロジェクト詳細情報を入力
   */
  async fillProjectDetails(data: {
    projectOverview?: string;
    responsibilities?: string;
    achievements?: string;
    processes?: string[];
  }) {
    // プロジェクト概要
    if (data.projectOverview) {
      await this.page.fill('textarea[name="projectOverview"]', data.projectOverview);
    }
    
    // 担当業務
    if (data.responsibilities) {
      await this.page.fill('textarea[name="responsibilities"]', data.responsibilities);
    }
    
    // 実績・成果
    if (data.achievements) {
      await this.page.fill('textarea[name="achievements"]', data.achievements);
    }
    
    // 開発プロセス
    if (data.processes && data.processes.length > 0) {
      for (const process of data.processes) {
        // プロセスチップをクリック
        await this.page.click(`[role="button"]:has-text("${process}")`);
      }
    }
  }

  /**
   * 技術スキルを追加
   */
  async addTechnologySkill(data: {
    category: string;
    technology: string;
  }) {
    // 技術追加ボタンをクリック
    await this.page.click('button:has-text("技術を追加")');
    
    // カテゴリ選択
    await this.page.click('[data-testid="technology-category-select"]');
    await this.page.click(`li[role="option"]:has-text("${data.category}")`);
    
    // 技術名入力（オートコンプリート）
    const techInput = this.page.locator('input[placeholder*="技術名"]').last();
    await techInput.fill(data.technology);
    
    // オートコンプリートから選択または手動入力
    const autocompleteOption = this.page.locator(`li[role="option"]:has-text("${data.technology}")`);
    if (await autocompleteOption.isVisible({ timeout: 2000 })) {
      await autocompleteOption.click();
    }
  }

  /**
   * フォームを保存
   */
  async saveForm() {
    // 保存ボタンをクリック
    await this.page.click('button:has-text("保存")');
    
    // 成功メッセージの確認
    await expect(this.page.locator('text="保存しました"')).toBeVisible({ timeout: 5000 });
    
    // ダイアログが閉じるのを待つ
    await expect(this.page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * 一時保存
   */
  async saveTemporary() {
    // 一時保存ボタンをクリック
    await this.page.click('button:has-text("一時保存")');
    
    // 成功メッセージの確認
    await expect(this.page.locator('text="一時保存しました"')).toBeVisible({ timeout: 5000 });
  }

  /**
   * 職務経歴カードの存在確認
   */
  async verifyWorkHistoryCard(projectName: string) {
    const card = this.page.locator(`[data-testid="work-history-card"]:has-text("${projectName}")`);
    await expect(card).toBeVisible({ timeout: 10000 });
    
    return card;
  }

  /**
   * 職務経歴を編集
   */
  async editWorkHistory(projectName: string) {
    const card = await this.verifyWorkHistoryCard(projectName);
    
    // 編集ボタンをクリック
    const editButton = card.locator('button[aria-label="編集"]');
    await editButton.click();
    
    // 編集ダイアログの表示待ち
    await this.page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await expect(this.page.locator('h2:has-text("職務経歴の編集")')).toBeVisible();
  }

  /**
   * 職務経歴を削除
   */
  async deleteWorkHistory(projectName: string) {
    const card = await this.verifyWorkHistoryCard(projectName);
    
    // 削除ボタンをクリック
    const deleteButton = card.locator('button[aria-label="削除"]');
    await deleteButton.click();
    
    // 確認ダイアログで「削除」をクリック
    await this.page.click('button:has-text("削除する")');
    
    // 削除成功メッセージの確認
    await expect(this.page.locator('text="削除しました"')).toBeVisible({ timeout: 5000 });
    
    // カードが削除されたことを確認
    await expect(card).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * 検索フィルターを適用
   */
  async applySearchFilter(filters: {
    searchQuery?: string;
    industry?: string;
    technology?: string;
    startDateFrom?: string;
    startDateTo?: string;
    isActive?: boolean;
  }) {
    // 検索クエリ
    if (filters.searchQuery) {
      await this.page.fill('input[placeholder*="検索"]', filters.searchQuery);
    }
    
    // 業界フィルター
    if (filters.industry) {
      await this.page.click('[data-testid="industry-filter"]');
      await this.page.click(`li[role="option"]:has-text("${filters.industry}")`);
    }
    
    // 技術フィルター
    if (filters.technology) {
      await this.page.click('[data-testid="technology-filter"]');
      await this.page.fill('input[placeholder*="技術"]', filters.technology);
      await this.page.keyboard.press('Enter');
    }
    
    // 開始日フィルター
    if (filters.startDateFrom) {
      await this.page.fill('input[name="startDateFrom"]', filters.startDateFrom);
    }
    
    if (filters.startDateTo) {
      await this.page.fill('input[name="startDateTo"]', filters.startDateTo);
    }
    
    // アクティブフラグ
    if (filters.isActive !== undefined) {
      const checkbox = this.page.locator('input[type="checkbox"][name="isActive"]');
      if (filters.isActive) {
        await checkbox.check();
      } else {
        await checkbox.uncheck();
      }
    }
  }

  /**
   * PDF出力
   */
  async exportPDF() {
    // PDFエクスポートボタンをクリック
    await this.page.click('button:has-text("PDF出力")');
    
    // ダウンロード開始の待機
    const downloadPromise = this.page.waitForEvent('download');
    const download = await downloadPromise;
    
    // ダウンロードファイル名の確認
    expect(download.suggestedFilename()).toContain('work_history');
    expect(download.suggestedFilename()).toContain('.pdf');
    
    return download;
  }

  /**
   * 統計情報の確認
   */
  async verifyStatistics(expected: {
    totalProjects?: number;
    totalMonths?: number;
    itExperienceYears?: string;
    primaryIndustry?: string;
  }) {
    // 統計カードの確認
    const statsSection = this.page.locator('[data-testid="work-history-stats"]');
    await expect(statsSection).toBeVisible();
    
    if (expected.totalProjects !== undefined) {
      await expect(statsSection.locator(`text="${expected.totalProjects}件"`)).toBeVisible();
    }
    
    if (expected.totalMonths !== undefined) {
      await expect(statsSection.locator(`text="${expected.totalMonths}ヶ月"`)).toBeVisible();
    }
    
    if (expected.itExperienceYears) {
      await expect(statsSection.locator(`text="${expected.itExperienceYears}"`)).toBeVisible();
    }
    
    if (expected.primaryIndustry) {
      await expect(statsSection.locator(`text="${expected.primaryIndustry}"`)).toBeVisible();
    }
  }

  /**
   * 技術スキルサマリーの確認
   */
  async verifyTechnologySummary(expectedTechnologies: string[]) {
    const techSection = this.page.locator('[data-testid="technology-summary"]');
    await expect(techSection).toBeVisible();
    
    for (const tech of expectedTechnologies) {
      await expect(techSection.locator(`text="${tech}"`)).toBeVisible();
    }
  }

  /**
   * ステップナビゲーション
   */
  async navigateToStep(stepIndex: number) {
    const stepButton = this.page.locator(`[data-testid="step-${stepIndex}"]`);
    await stepButton.click();
    
    // ステップ内容の表示待ち
    await this.page.waitForTimeout(500);
  }

  /**
   * フォームバリデーションエラーの確認
   */
  async verifyValidationError(fieldName: string, errorMessage: string) {
    const field = this.page.locator(`[name="${fieldName}"]`);
    const errorText = this.page.locator(`text="${errorMessage}"`);
    
    // フィールドにフォーカスしてエラーを表示
    await field.focus();
    await field.blur();
    
    await expect(errorText).toBeVisible({ timeout: 3000 });
  }

  /**
   * 空状態の確認
   */
  async verifyEmptyState() {
    await expect(this.page.locator('text="職務経歴がありません"')).toBeVisible();
    await expect(this.page.locator('button:has-text("新規作成")')).toBeVisible();
  }

  /**
   * ローディング状態の確認
   */
  async verifyLoadingState() {
    await expect(this.page.locator('[role="progressbar"], .MuiSkeleton-root')).toBeVisible();
  }
}