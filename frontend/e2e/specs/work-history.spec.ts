import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { WorkHistoryHelper } from '../helpers/work-history-helper';
import { workHistoryTestData } from '../test-data/work-history-test-data';

test.describe('職務経歴管理', () => {
  let authHelper: AuthHelper;
  let workHistoryHelper: WorkHistoryHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    workHistoryHelper = new WorkHistoryHelper(page);

    // エンジニアとしてログイン
    await authHelper.loginAsEngineer();
  });

  test.describe('基本機能', () => {
    test('職務経歴一覧ページの表示', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();
      
      // ページ要素の確認
      await expect(page.locator('h4:has-text("職務経歴一覧")')).toBeVisible();
      await expect(page.locator('button[aria-label="新規作成"]')).toBeVisible();
      
      // 統計情報セクションの確認
      await expect(page.locator('[data-testid="work-history-stats"]')).toBeVisible();
    });

    test('新規職務経歴の作成', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();
      await workHistoryHelper.openCreateDialog();

      // ステップ1: 基本情報入力
      await workHistoryHelper.fillBasicInfo(workHistoryTestData.basicWorkHistory);
      await workHistoryHelper.navigateToStep(1);

      // ステップ2: 詳細情報入力
      await workHistoryHelper.fillProjectDetails(workHistoryTestData.basicWorkHistory);
      await workHistoryHelper.navigateToStep(2);

      // ステップ3: 技術スキル追加
      for (const tech of workHistoryTestData.basicWorkHistory.technologies) {
        await workHistoryHelper.addTechnologySkill(tech);
      }

      // 保存
      await workHistoryHelper.saveForm();

      // 作成した職務経歴の確認
      await workHistoryHelper.verifyWorkHistoryCard(workHistoryTestData.basicWorkHistory.projectName);
    });

    test('職務経歴の編集', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();
      
      // 既存の職務経歴を編集
      await workHistoryHelper.editWorkHistory(workHistoryTestData.basicWorkHistory.projectName);

      // プロジェクト名を変更
      const updatedProjectName = 'ECサイトリニューアルプロジェクト（更新済み）';
      await page.fill('input[name="projectName"]', updatedProjectName);

      // 保存
      await workHistoryHelper.saveForm();

      // 更新された職務経歴の確認
      await workHistoryHelper.verifyWorkHistoryCard(updatedProjectName);
    });

    test('職務経歴の削除', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();
      
      // 削除前の確認
      const projectName = 'ECサイトリニューアルプロジェクト（更新済み）';
      await workHistoryHelper.verifyWorkHistoryCard(projectName);

      // 削除実行
      await workHistoryHelper.deleteWorkHistory(projectName);

      // 削除後の確認
      await expect(page.locator(`text="${projectName}"`)).not.toBeVisible();
    });
  });

  test.describe('一時保存機能', () => {
    test('入力途中での一時保存', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();
      await workHistoryHelper.openCreateDialog();

      // 一部のみ入力
      await workHistoryHelper.fillBasicInfo(workHistoryTestData.tempSaveData);

      // 一時保存
      await workHistoryHelper.saveTemporary();

      // ダイアログを閉じる
      await page.keyboard.press('Escape');

      // 再度新規作成を開く
      await workHistoryHelper.openCreateDialog();

      // 一時保存データが復元されていることを確認
      await expect(page.locator('input[name="projectName"]')).toHaveValue(workHistoryTestData.tempSaveData.projectName);
      await expect(page.locator('input[name="startDate"]')).toHaveValue(workHistoryTestData.tempSaveData.startDate);
    });

    test('自動保存の動作確認', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();
      await workHistoryHelper.openCreateDialog();

      // データ入力
      await page.fill('input[name="projectName"]', '自動保存テストプロジェクト');
      
      // 3秒待機（自動保存のトリガーを待つ）
      await page.waitForTimeout(3000);

      // 自動保存の通知を確認
      const autoSaveIndicator = page.locator('text="自動保存しました", text="保存済み"');
      await expect(autoSaveIndicator).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('検索とフィルタリング', () => {
    test.beforeEach(async ({ page }) => {
      // テストデータの準備
      await workHistoryHelper.navigateToWorkHistoryList();
      
      // 複数の職務経歴を作成
      for (const project of [workHistoryTestData.basicWorkHistory, workHistoryTestData.shortTermProject]) {
        await workHistoryHelper.openCreateDialog();
        await workHistoryHelper.fillBasicInfo(project);
        await workHistoryHelper.saveForm();
        await page.waitForTimeout(1000); // 作成間隔を設ける
      }
    });

    test('業界でフィルタリング', async ({ page }) => {
      await workHistoryHelper.applySearchFilter({
        industry: 'IT・ソフトウェア'
      });

      // フィルタ結果の確認
      await expect(page.locator('[data-testid="work-history-card"]')).toHaveCount(1);
      await workHistoryHelper.verifyWorkHistoryCard(workHistoryTestData.shortTermProject.projectName);
    });

    test('技術でフィルタリング', async ({ page }) => {
      await workHistoryHelper.applySearchFilter({
        technology: 'React'
      });

      // フィルタ結果の確認
      await workHistoryHelper.verifyWorkHistoryCard(workHistoryTestData.basicWorkHistory.projectName);
      await expect(page.locator(`text="${workHistoryTestData.shortTermProject.projectName}"`)).not.toBeVisible();
    });

    test('期間でフィルタリング', async ({ page }) => {
      await workHistoryHelper.applySearchFilter({
        startDateFrom: '2023-10-01',
        startDateTo: '2023-12-31'
      });

      // フィルタ結果の確認
      await workHistoryHelper.verifyWorkHistoryCard(workHistoryTestData.shortTermProject.projectName);
    });
  });

  test.describe('バリデーション', () => {
    test('必須項目の検証', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();
      await workHistoryHelper.openCreateDialog();

      // 空のまま保存を試みる
      await page.click('button:has-text("保存")');

      // エラーメッセージの確認
      await workHistoryHelper.verifyValidationError('projectName', 'プロジェクト名は必須です');
      await workHistoryHelper.verifyValidationError('startDate', '開始日は必須です');
      await workHistoryHelper.verifyValidationError('industry', '業界は必須です');
      await workHistoryHelper.verifyValidationError('role', '役割は必須です');
    });

    test('日付範囲の検証', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();
      await workHistoryHelper.openCreateDialog();

      // 無効な日付範囲を入力
      await page.fill('input[name="startDate"]', '2023-12-31');
      await page.fill('input[name="endDate"]', '2023-01-01');

      // 他の必須項目を入力
      await page.fill('input[name="projectName"]', 'テストプロジェクト');
      await page.click('[data-testid="industry-select"]');
      await page.click('li[role="option"]:has-text("IT・ソフトウェア")');
      await page.fill('input[name="role"]', 'エンジニア');

      // 保存を試みる
      await page.click('button:has-text("保存")');

      // エラーメッセージの確認
      await expect(page.locator('text="終了日は開始日より後の日付を入力してください"')).toBeVisible();
    });

    test('文字数制限の検証', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();
      await workHistoryHelper.openCreateDialog();

      // 255文字を超えるプロジェクト名
      const longProjectName = 'あ'.repeat(256);
      await page.fill('input[name="projectName"]', longProjectName);

      // 文字数カウンターの確認
      await expect(page.locator('text="256/255"')).toBeVisible();
      
      // エラーメッセージの確認
      await workHistoryHelper.verifyValidationError('projectName', 'プロジェクト名は255文字以内で入力してください');
    });
  });

  test.describe('PDF出力', () => {
    test('職務経歴のPDF出力', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();

      // PDFエクスポート
      const download = await workHistoryHelper.exportPDF();

      // ダウンロードファイルの確認
      const fileName = download.suggestedFilename();
      expect(fileName).toMatch(/work_history_.*\.pdf/);

      // ファイルサイズの確認（0より大きい）
      const path = await download.path();
      const fs = require('fs');
      const stats = fs.statSync(path);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  test.describe('統計情報', () => {
    test('統計情報の表示確認', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();

      // 統計情報の確認
      await workHistoryHelper.verifyStatistics({
        totalProjects: 2, // これまでのテストで作成した数
        primaryIndustry: 'IT・ソフトウェア'
      });

      // 技術スキルサマリーの確認
      await workHistoryHelper.verifyTechnologySummary(['React', 'Node.js']);
    });

    test('IT経験年数の計算確認', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();

      // IT経験年数セクションの確認
      const experienceSection = page.locator('[data-testid="it-experience"]');
      await expect(experienceSection).toBeVisible();
      
      // 年数表示の確認（形式: X年Yヶ月）
      await expect(experienceSection.locator('text=/\\d+年\\d+ヶ月/')).toBeVisible();
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('モバイル表示の確認', async ({ page }) => {
      // ビューポートをモバイルサイズに設定
      await page.setViewportSize({ width: 375, height: 667 });

      await workHistoryHelper.navigateToWorkHistoryList();

      // モバイル用レイアウトの確認
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      await expect(mobileMenu).toBeVisible();

      // カードのコンパクト表示確認
      const card = page.locator('[data-testid="work-history-card"]').first();
      const cardWidth = await card.boundingBox();
      expect(cardWidth?.width).toBeLessThan(350);

      // モバイル用FABの確認
      const fab = page.locator('button[aria-label="新規作成"]');
      await expect(fab).toBeVisible();
      const fabSize = await fab.boundingBox();
      expect(fabSize?.width).toBe(48); // モバイルサイズ
    });

    test('タブレット表示の確認', async ({ page }) => {
      // ビューポートをタブレットサイズに設定
      await page.setViewportSize({ width: 768, height: 1024 });

      await workHistoryHelper.navigateToWorkHistoryList();

      // グリッドレイアウトの確認
      const statsGrid = page.locator('[data-testid="work-history-stats"] .MuiGrid-container');
      await expect(statsGrid).toBeVisible();
    });
  });

  test.describe('エラーハンドリング', () => {
    test('ネットワークエラー時の表示', async ({ page }) => {
      // ネットワークエラーをシミュレート
      await page.route('**/api/v1/work-history**', route => route.abort());

      await workHistoryHelper.navigateToWorkHistoryList();

      // エラー状態の確認
      await expect(page.locator('text="データの取得に失敗しました"')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button:has-text("再試行")')).toBeVisible();
    });

    test('空データ時の表示', async ({ page }) => {
      // 空のレスポンスを返す
      await page.route('**/api/v1/work-history', route => {
        route.fulfill({
          status: 200,
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
            technology_skills: []
          })
        });
      });

      await workHistoryHelper.navigateToWorkHistoryList();

      // 空状態の確認
      await workHistoryHelper.verifyEmptyState();
    });
  });

  test.describe('管理者機能', () => {
    test.beforeEach(async ({ page }) => {
      // 管理者としてログイン
      await authHelper.logout();
      await authHelper.loginAsAdmin();
    });

    test('管理者用職務経歴管理ページの表示', async ({ page }) => {
      // 管理者用ナビゲーションから職務経歴管理へ
      await page.goto('/admin/engineers/work-history');

      // ページ要素の確認
      await expect(page.locator('h4:has-text("職務経歴管理")')).toBeVisible();
      await expect(page.locator('text="エンジニアの職務経歴を管理・確認できます"')).toBeVisible();
    });
  });
});