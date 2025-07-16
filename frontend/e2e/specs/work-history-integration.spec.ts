import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { WorkHistoryHelper } from '../helpers/work-history-helper';
import { workHistoryTestData } from '../test-data/work-history-test-data';

test.describe('職務経歴統合テスト', () => {
  let authHelper: AuthHelper;
  let workHistoryHelper: WorkHistoryHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    workHistoryHelper = new WorkHistoryHelper(page);
    await authHelper.loginAsEngineer();
  });

  test.describe('複雑なワークフロー', () => {
    test('複数プロジェクトの一括管理フロー', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();

      // 複数のプロジェクトを連続作成
      const projects = [
        workHistoryTestData.basicWorkHistory,
        workHistoryTestData.ongoingProject,
        workHistoryTestData.shortTermProject
      ];

      for (const project of projects) {
        await workHistoryHelper.openCreateDialog();
        
        // 基本情報
        await workHistoryHelper.fillBasicInfo(project);
        await workHistoryHelper.navigateToStep(1);
        
        // 詳細情報
        await workHistoryHelper.fillProjectDetails(project);
        await workHistoryHelper.navigateToStep(2);
        
        // 技術スキル
        for (const tech of project.technologies) {
          await workHistoryHelper.addTechnologySkill(tech);
        }
        
        await workHistoryHelper.saveForm();
        await page.waitForTimeout(1000); // 保存間隔
      }

      // 統計情報の確認
      await workHistoryHelper.verifyStatistics({
        totalProjects: 3,
        primaryIndustry: 'IT・ソフトウェア' // 2/3がIT
      });

      // 技術スキルの集計確認
      await workHistoryHelper.verifyTechnologySummary([
        'React', 'TypeScript', 'Node.js', 'Next.js', 'Go'
      ]);
    });

    test('長期プロジェクトのキャリア分析フロー', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();

      // 長期プロジェクトの作成
      await workHistoryHelper.openCreateDialog();
      await workHistoryHelper.fillBasicInfo(workHistoryTestData.largeScaleProject);
      await workHistoryHelper.navigateToStep(1);
      await workHistoryHelper.fillProjectDetails(workHistoryTestData.largeScaleProject);
      await workHistoryHelper.navigateToStep(2);
      
      for (const tech of workHistoryTestData.largeScaleProject.technologies) {
        await workHistoryHelper.addTechnologySkill(tech);
      }
      
      await workHistoryHelper.saveForm();

      // 分析ページへ移動（仮定）
      const analyticsButton = page.locator('button:has-text("キャリア分析")');
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click();
        
        // 分析結果の確認
        await expect(page.locator('text="システムアーキテクト経験"')).toBeVisible();
        await expect(page.locator('text="大規模プロジェクト経験あり"')).toBeVisible();
      }
    });
  });

  test.describe('データ整合性テスト', () => {
    test('同時編集の競合解決', async ({ browser }) => {
      // 2つのブラウザコンテキストを作成
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const authHelper1 = new AuthHelper(page1);
      const authHelper2 = new AuthHelper(page2);
      const workHistoryHelper1 = new WorkHistoryHelper(page1);
      const workHistoryHelper2 = new WorkHistoryHelper(page2);
      
      // 両方のコンテキストでログイン
      await authHelper1.loginAsEngineer();
      await authHelper2.loginAsEngineer();
      
      // 両方で同じ職務経歴を編集
      await workHistoryHelper1.navigateToWorkHistoryList();
      await workHistoryHelper2.navigateToWorkHistoryList();
      
      const projectName = workHistoryTestData.basicWorkHistory.projectName;
      
      // コンテキスト1で編集開始
      await workHistoryHelper1.editWorkHistory(projectName);
      await page1.fill('input[name="role"]', '更新されたロール1');
      
      // コンテキスト2で編集開始
      await workHistoryHelper2.editWorkHistory(projectName);
      await page2.fill('input[name="role"]', '更新されたロール2');
      
      // コンテキスト1で保存
      await workHistoryHelper1.saveForm();
      
      // コンテキスト2で保存試行
      await page2.click('button:has-text("保存")');
      
      // 競合エラーまたは警告の確認
      const conflictMessage = page2.locator('text="他のユーザーによって更新されています", text="競合が発生しました"');
      await expect(conflictMessage).toBeVisible({ timeout: 5000 });
      
      await context1.close();
      await context2.close();
    });

    test('大量データでのパフォーマンステスト', async ({ page }) => {
      // APIレスポンスをモック（大量データ）
      const mockProjects = Array.from({ length: 50 }, (_, i) => ({
        id: `project-${i}`,
        project_name: `テストプロジェクト${i + 1}`,
        start_date: '2020-01-01',
        end_date: i % 2 === 0 ? '2023-12-31' : null,
        industry: 'IT・ソフトウェア',
        role: 'エンジニア',
        technologies: [
          { id: `tech-${i}-1`, technology_name: 'React' },
          { id: `tech-${i}-2`, technology_name: 'Node.js' }
        ]
      }));

      await page.route('**/api/v1/work-history', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            work_histories: mockProjects,
            summary: {
              total_projects: 50,
              total_months: 200,
              primary_industry: 'IT・ソフトウェア'
            },
            it_experience: {
              years: 16,
              months: 8,
              total_months: 200
            },
            technology_skills: []
          })
        });
      });

      const startTime = Date.now();
      await workHistoryHelper.navigateToWorkHistoryList();
      const loadTime = Date.now() - startTime;

      // パフォーマンス基準：3秒以内に表示
      expect(loadTime).toBeLessThan(3000);

      // 仮想スクロールの確認
      const container = page.locator('[data-testid="work-history-list"]');
      await container.scrollIntoViewIfNeeded();
      
      // 最初の10件が表示されていることを確認
      const visibleCards = await page.locator('[data-testid="work-history-card"]').count();
      expect(visibleCards).toBeGreaterThanOrEqual(10);
      expect(visibleCards).toBeLessThanOrEqual(20); // 仮想スクロール
    });
  });

  test.describe('外部連携テスト', () => {
    test('スキルシートとの連携', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();

      // スキルシート生成ボタンの確認
      const skillSheetButton = page.locator('button:has-text("スキルシート生成")');
      if (await skillSheetButton.isVisible()) {
        await skillSheetButton.click();
        
        // スキルシート画面への遷移確認
        await page.waitForURL('**/skill-sheet**');
        
        // 職務経歴データが反映されていることを確認
        await expect(page.locator('text="職務経歴から自動反映されました"')).toBeVisible();
      }
    });

    test('週報への反映', async ({ page }) => {
      // 職務経歴を作成
      await workHistoryHelper.navigateToWorkHistoryList();
      await workHistoryHelper.openCreateDialog();
      await workHistoryHelper.fillBasicInfo(workHistoryTestData.ongoingProject);
      await workHistoryHelper.saveForm();

      // 週報ページへ移動
      await page.goto('/weekly-report');
      await page.waitForLoadState('networkidle');

      // プロジェクト選択で職務経歴が表示されることを確認
      const projectSelect = page.locator('[data-testid="project-select"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.click();
        await expect(page.locator(`text="${workHistoryTestData.ongoingProject.projectName}"`)).toBeVisible();
      }
    });
  });

  test.describe('セキュリティテスト', () => {
    test('他ユーザーの職務経歴へのアクセス制限', async ({ page }) => {
      // 他ユーザーの職務経歴IDに直接アクセス
      const otherUserId = 'other-user-work-history-id';
      await page.goto(`/work-history/${otherUserId}`);

      // アクセス拒否またはリダイレクトの確認
      await expect(page.locator('text="アクセス権限がありません", text="404"')).toBeVisible({ timeout: 5000 });
    });

    test('XSS攻撃の防御確認', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();
      await workHistoryHelper.openCreateDialog();

      // XSS攻撃を試みる
      const xssPayload = '<script>alert("XSS")</script>';
      await page.fill('input[name="projectName"]', xssPayload);
      await page.fill('input[name="startDate"]', '2023-01-01');
      await page.click('[data-testid="industry-select"]');
      await page.click('li[role="option"]:first-child');
      await page.fill('input[name="role"]', 'テスト');

      await workHistoryHelper.saveForm();

      // スクリプトが実行されないことを確認
      page.on('dialog', dialog => {
        // アラートが表示された場合はテスト失敗
        expect(dialog.message()).not.toBe('XSS');
        dialog.dismiss();
      });

      // エスケープされて表示されることを確認
      await expect(page.locator('text="<script>alert("XSS")</script>"')).toBeVisible();
    });
  });

  test.describe('アクセシビリティテスト', () => {
    test('キーボードナビゲーション', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();

      // Tabキーでナビゲーション
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // 新規作成ボタンにフォーカス
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
      expect(focusedElement).toBe('新規作成');

      // Enterキーで新規作成ダイアログを開く
      await page.keyboard.press('Enter');
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Escapeキーでダイアログを閉じる
      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('スクリーンリーダー対応', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();

      // ARIA属性の確認
      const mainContent = page.locator('main');
      await expect(mainContent).toHaveAttribute('aria-label', /職務経歴/);

      // 職務経歴カードのARIA属性
      const card = page.locator('[data-testid="work-history-card"]').first();
      await expect(card).toHaveAttribute('role', 'article');
      await expect(card).toHaveAttribute('aria-label', /プロジェクト/);

      // ボタンのARIA属性
      const editButton = card.locator('button[aria-label="編集"]');
      await expect(editButton).toHaveAttribute('aria-label', '編集');
    });
  });

  test.describe('国際化対応テスト', () => {
    test('日本語以外の文字入力', async ({ page }) => {
      await workHistoryHelper.navigateToWorkHistoryList();
      await workHistoryHelper.openCreateDialog();

      // 英語、中国語、韓国語などの入力
      const internationalProject = {
        projectName: 'Global E-commerce Platform 全球电商平台 글로벌 이커머스',
        startDate: '2023-01-01',
        industry: 'IT・ソフトウェア',
        role: 'Full Stack Engineer',
        projectOverview: 'A multinational e-commerce platform supporting multiple languages and currencies.'
      };

      await workHistoryHelper.fillBasicInfo(internationalProject);
      await page.fill('textarea[name="projectOverview"]', internationalProject.projectOverview);
      
      await workHistoryHelper.saveForm();

      // 正しく保存・表示されることを確認
      await workHistoryHelper.verifyWorkHistoryCard(internationalProject.projectName);
    });
  });
});