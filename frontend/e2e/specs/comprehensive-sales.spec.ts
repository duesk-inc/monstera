import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { SalesHelper } from '../helpers/sales-helper';

/**
 * 営業機能の包括的E2Eテスト
 * 
 * テストシナリオ:
 * 1. 提案管理の完全ワークフロー
 * 2. 面談管理の完全ワークフロー
 * 3. 契約延長管理の完全ワークフロー
 * 4. メール機能の統合テスト
 * 5. POC同期機能のテスト
 * 6. 営業チーム管理機能
 */

test.describe('営業機能統合テスト', () => {
  let authHelper: AuthHelper;
  let salesHelper: SalesHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    salesHelper = new SalesHelper(page);
  });

  test.describe('提案管理ワークフロー', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsSalesManager();
    });

    test('提案の完全ライフサイクルテスト', async ({ page }) => {
      // 1. 新規提案作成
      await page.goto('/sales/proposals');
      await page.waitForLoadState('networkidle');

      await page.click('[data-testid="create-proposal-button"]');
      await expect(page).toHaveURL(/.*proposals\/new/);

      // 基本情報入力
      await page.fill('[data-testid="client-name"]', 'テスト株式会社');
      await page.fill('[data-testid="project-name"]', 'Webシステム開発プロジェクト');
      await page.selectOption('[data-testid="project-type"]', 'web-development');
      await page.fill('[data-testid="budget"]', '5000000');
      await page.fill('[data-testid="duration-months"]', '6');

      // 技術要件入力
      await page.check('[data-testid="tech-react"]');
      await page.check('[data-testid="tech-nodejs"]');
      await page.check('[data-testid="tech-mysql"]');

      // 要求スキル入力
      await page.fill('[data-testid="required-skills"]', 'React, Node.js, MySQL, AWS');
      await page.selectOption('[data-testid="experience-level"]', 'mid-level');

      // 詳細説明入力
      await page.fill('[data-testid="project-description"]', 'ECサイトのリニューアルプロジェクトです。既存システムからの移行も含みます。');

      // 期限設定
      await page.fill('[data-testid="proposal-deadline"]', '2024-02-15');
      await page.fill('[data-testid="project-start-date"]', '2024-03-01');

      // 提案保存
      await page.click('[data-testid="save-proposal-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('提案を作成しました');

      // 2. 提案詳細確認と編集
      const proposalId = await page.locator('[data-testid="proposal-id"]').textContent();
      
      await page.click('[data-testid="edit-proposal-button"]');
      await page.fill('[data-testid="client-contact-email"]', 'contact@test-company.co.jp');
      await page.fill('[data-testid="client-contact-phone"]', '03-1234-5678');
      
      await page.click('[data-testid="update-proposal-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('提案を更新しました');

      // 3. 提案提出
      await page.click('[data-testid="submit-proposal-button"]');
      await expect(page.locator('[data-testid="submit-confirmation-dialog"]')).toBeVisible();
      await page.click('[data-testid="confirm-submit-button"]');
      
      await expect(page.locator('[data-testid="proposal-status"]')).toContainText('提出済');

      // 4. 面談スケジュール設定
      await page.click('[data-testid="schedule-interview-button"]');
      await expect(page.locator('[data-testid="interview-scheduling-dialog"]')).toBeVisible();

      await page.fill('[data-testid="interview-date"]', '2024-02-10');
      await page.fill('[data-testid="interview-time"]', '14:00');
      await page.selectOption('[data-testid="interview-type"]', 'online');
      await page.fill('[data-testid="meeting-url"]', 'https://zoom.us/j/123456789');

      await page.click('[data-testid="schedule-interview-confirm"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('面談をスケジュールしました');

      // 5. 提案結果更新
      await page.click('[data-testid="update-status-button"]');
      await page.selectOption('[data-testid="proposal-result"]', 'accepted');
      await page.fill('[data-testid="result-notes"]', 'クライアントから正式な受注をいただきました。');
      
      await page.click('[data-testid="save-result-button"]');
      await expect(page.locator('[data-testid="proposal-status"]')).toContainText('受注');
    });

    test('提案の一括管理機能', async ({ page }) => {
      await page.goto('/sales/proposals');
      await page.waitForLoadState('networkidle');

      // フィルター機能のテスト
      await page.selectOption('[data-testid="status-filter"]', 'pending');
      await page.selectOption('[data-testid="type-filter"]', 'web-development');
      await page.fill('[data-testid="date-range-from"]', '2024-01-01');
      await page.fill('[data-testid="date-range-to"]', '2024-12-31');
      
      await page.click('[data-testid="apply-filters-button"]');
      await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();

      // ソート機能のテスト
      await page.click('[data-testid="sort-by-deadline"]');
      await expect(page.locator('[data-testid="proposals-list"] [data-testid="proposal-item"]').first()).toBeVisible();

      // 一括選択機能
      await page.check('[data-testid="select-all-proposals"]');
      await expect(page.locator('[data-testid="bulk-actions-panel"]')).toBeVisible();

      // 一括ステータス更新
      await page.click('[data-testid="bulk-status-update"]');
      await page.selectOption('[data-testid="bulk-status-select"]', 'in-review');
      await page.click('[data-testid="apply-bulk-status"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('選択された提案のステータスを更新しました');

      // エクスポート機能
      await page.click('[data-testid="export-proposals-button"]');
      await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
      
      await page.check('[data-testid="export-format-excel"]');
      await page.check('[data-testid="include-details"]');
      await page.click('[data-testid="execute-export"]');
      
      await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
    });

    test('提案テンプレート機能', async ({ page }) => {
      await page.goto('/sales/proposals/templates');
      await page.waitForLoadState('networkidle');

      // 新規テンプレート作成
      await page.click('[data-testid="create-template-button"]');
      
      await page.fill('[data-testid="template-name"]', 'Webシステム開発標準テンプレート');
      await page.fill('[data-testid="template-description"]', 'Webシステム開発案件用の標準提案テンプレート');
      
      // デフォルト値設定
      await page.selectOption('[data-testid="default-project-type"]', 'web-development');
      await page.fill('[data-testid="default-duration"]', '6');
      await page.fill('[data-testid="default-team-size"]', '3-5');
      
      // 技術スタックのデフォルト選択
      await page.check('[data-testid="default-tech-react"]');
      await page.check('[data-testid="default-tech-nodejs"]');
      
      await page.click('[data-testid="save-template-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('テンプレートを作成しました');

      // テンプレートを使用した提案作成
      await page.goto('/sales/proposals/new');
      await page.selectOption('[data-testid="template-select"]', 'web-development-standard');
      
      // テンプレートの値が自動入力されることを確認
      await expect(page.locator('[data-testid="project-type"]')).toHaveValue('web-development');
      await expect(page.locator('[data-testid="duration-months"]')).toHaveValue('6');
      await expect(page.locator('[data-testid="tech-react"]')).toBeChecked();
    });
  });

  test.describe('面談管理ワークフロー', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsSalesManager();
    });

    test('面談の完全管理サイクル', async ({ page }) => {
      // 1. 面談スケジュール作成
      await page.goto('/sales/interviews');
      await page.waitForLoadState('networkidle');

      await page.click('[data-testid="schedule-interview-button"]');
      
      // 提案選択
      await page.selectOption('[data-testid="proposal-select"]', '1');
      
      // エンジニア選択
      await page.selectOption('[data-testid="engineer-select"]', 'john-doe');
      
      // 面談詳細設定
      await page.fill('[data-testid="interview-date"]', '2024-02-20');
      await page.fill('[data-testid="interview-start-time"]', '10:00');
      await page.fill('[data-testid="interview-end-time"]', '11:00');
      await page.selectOption('[data-testid="interview-type"]', 'technical');
      
      // 面談設定
      await page.selectOption('[data-testid="meeting-method"]', 'online');
      await page.fill('[data-testid="meeting-url"]', 'https://meet.google.com/abc-defg-hij');
      
      // 準備資料の設定
      await page.fill('[data-testid="required-materials"]', '履歴書、ポートフォリオ、技術資料');
      await page.fill('[data-testid="interview-agenda"]', '1. 自己紹介\n2. 技術的な質疑応答\n3. プロジェクト説明\n4. 質問タイム');
      
      await page.click('[data-testid="create-interview-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('面談をスケジュールしました');

      // 2. 面談通知の送信確認
      await expect(page.locator('[data-testid="notification-sent-indicator"]')).toBeVisible();
      
      // 3. 面談前のリマインダー設定
      await page.click('[data-testid="interview-item-1"] [data-testid="manage-button"]');
      await page.click('[data-testid="reminder-settings-button"]');
      
      await page.check('[data-testid="reminder-24h-before"]');
      await page.check('[data-testid="reminder-1h-before"]');
      await page.click('[data-testid="save-reminders-button"]');

      // 4. 面談結果の記録
      await page.click('[data-testid="record-result-button"]');
      
      // 評価項目入力
      await page.selectOption('[data-testid="technical-skill-rating"]', '4');
      await page.selectOption('[data-testid="communication-rating"]', '5');
      await page.selectOption('[data-testid="motivation-rating"]', '4');
      
      // 詳細コメント
      await page.fill('[data-testid="technical-notes"]', '技術的なスキルは十分で、特にReactの知識が豊富でした。');
      await page.fill('[data-testid="general-impression"]', '積極的で質問も多く、プロジェクトへの興味が高いと感じました。');
      
      // 次のアクション
      await page.selectOption('[data-testid="next-action"]', 'second-interview');
      await page.fill('[data-testid="next-action-notes"]', '最終面談を設定し、条件面の詳細を詰めたい。');
      
      await page.click('[data-testid="save-interview-result"]');
      await expect(page.locator('[data-testid="interview-status"]')).toContainText('完了');

      // 5. フォローアップ管理
      await page.click('[data-testid="schedule-followup-button"]');
      await page.fill('[data-testid="followup-date"]', '2024-02-25');
      await page.selectOption('[data-testid="followup-type"]', 'final-interview');
      
      await page.click('[data-testid="schedule-followup-confirm"]');
      await expect(page.locator('[data-testid="followup-scheduled"]')).toBeVisible();
    });

    test('面談カレンダー管理機能', async ({ page }) => {
      await page.goto('/sales/interviews/calendar');
      await page.waitForLoadState('networkidle');

      // カレンダービューの確認
      await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
      
      // 月次/週次/日次ビューの切り替え
      await page.click('[data-testid="view-month"]');
      await expect(page.locator('[data-testid="month-view"]')).toBeVisible();
      
      await page.click('[data-testid="view-week"]');
      await expect(page.locator('[data-testid="week-view"]')).toBeVisible();
      
      await page.click('[data-testid="view-day"]');
      await expect(page.locator('[data-testid="day-view"]')).toBeVisible();

      // 面談の直接スケジューリング
      await page.click('[data-testid="time-slot-10-00"]');
      await expect(page.locator('[data-testid="quick-schedule-dialog"]')).toBeVisible();
      
      await page.selectOption('[data-testid="quick-proposal"]', '1');
      await page.selectOption('[data-testid="quick-engineer"]', 'jane-smith');
      await page.click('[data-testid="quick-schedule-confirm"]');

      // 面談の移動（ドラッグ&ドロップのシミュレーション）
      await page.click('[data-testid="interview-block-1"]');
      await page.click('[data-testid="move-interview-button"]');
      await page.click('[data-testid="time-slot-14-00"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('面談時間を変更しました');

      // 競合チェック機能
      await page.click('[data-testid="check-conflicts-button"]');
      await expect(page.locator('[data-testid="conflicts-panel"]')).toBeVisible();
    });

    test('面談フィードバック収集', async ({ page }) => {
      await page.goto('/sales/interviews/123/feedback');
      await page.waitForLoadState('networkidle');

      // エンジニアからのフィードバック収集
      await page.click('[data-testid="collect-engineer-feedback"]');
      
      // フィードバックフォームの確認
      await expect(page.locator('[data-testid="feedback-form"]')).toBeVisible();
      
      // 自動送信されるフィードバック依頼メールの設定
      await page.check('[data-testid="send-feedback-request"]');
      await page.fill('[data-testid="feedback-deadline"]', '2024-02-22');
      
      await page.click('[data-testid="send-feedback-request-button"]');
      await expect(page.locator('[data-testid="feedback-request-sent"]')).toBeVisible();

      // クライアントからのフィードバック
      await page.click('[data-testid="client-feedback-tab"]');
      await page.selectOption('[data-testid="client-satisfaction"]', '5');
      await page.fill('[data-testid="client-comments"]', 'エンジニアのスキルレベルに満足しています。ぜひ参画をお願いしたいです。');
      
      await page.click('[data-testid="save-client-feedback"]');
      
      // フィードバック統計の表示
      await expect(page.locator('[data-testid="feedback-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-rating"]')).toContainText('4.5');
    });
  });

  test.describe('契約延長管理ワークフロー', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsSalesManager();
    });

    test('契約延長の完全プロセス', async ({ page }) => {
      // 1. 延長対象契約の確認
      await page.goto('/sales/contract-extensions');
      await page.waitForLoadState('networkidle');

      // 期限が近い契約の自動検出確認
      await expect(page.locator('[data-testid="upcoming-expirations"]')).toBeVisible();
      
      // アラート表示の確認
      const alertCount = await page.locator('[data-testid="expiration-alert-count"]').textContent();
      expect(parseInt(alertCount || '0')).toBeGreaterThanOrEqual(0);

      // 2. 延長手続きの開始
      await page.click('[data-testid="contract-item-1"] [data-testid="start-extension-button"]');
      
      // 契約詳細の確認
      await expect(page.locator('[data-testid="current-contract-details"]')).toBeVisible();
      
      // 延長条件の設定
      await page.fill('[data-testid="extension-period"]', '6');
      await page.selectOption('[data-testid="extension-unit"]', 'months');
      
      // 料金調整
      await page.check('[data-testid="rate-adjustment"]');
      await page.fill('[data-testid="new-rate"]', '850000');
      await page.fill('[data-testid="rate-justification"]', '市場相場の上昇とスキル向上を考慮した調整');
      
      // 条件変更
      await page.check('[data-testid="update-conditions"]');
      await page.fill('[data-testid="new-conditions"]', 'リモートワーク可能、週1回は必ず出社');
      
      // 3. クライアント確認依頼
      await page.click('[data-testid="send-extension-proposal"]');
      
      // 提案書の生成確認
      await expect(page.locator('[data-testid="proposal-generation-dialog"]')).toBeVisible();
      await page.check('[data-testid="include-performance-report"]');
      await page.check('[data-testid="include-market-comparison"]');
      
      await page.click('[data-testid="generate-proposal"]');
      await expect(page.locator('[data-testid="proposal-generated"]')).toBeVisible();
      
      // メール送信確認
      await page.click('[data-testid="send-to-client-button"]');
      await expect(page.locator('[data-testid="email-sent-confirmation"]')).toBeVisible();

      // 4. クライアント回答の管理
      await page.click('[data-testid="manage-response-button"]');
      
      // 回答期限の設定
      await page.fill('[data-testid="response-deadline"]', '2024-03-01');
      
      // リマインダー設定
      await page.check('[data-testid="reminder-1-week-before"]');
      await page.check('[data-testid="reminder-3-days-before"]');
      
      await page.click('[data-testid="set-deadline-button"]');

      // 5. 承認・却下の処理
      await page.selectOption('[data-testid="client-response"]', 'approved');
      await page.fill('[data-testid="client-response-notes"]', 'Extension approved with the proposed terms');
      await page.fill('[data-testid="final-start-date"]', '2024-04-01');
      
      await page.click('[data-testid="process-response-button"]');
      
      // 契約書生成
      await expect(page.locator('[data-testid="contract-generation-dialog"]')).toBeVisible();
      await page.click('[data-testid="generate-contract-button"]');
      
      await expect(page.locator('[data-testid="contract-ready"]')).toBeVisible();
      await expect(page.locator('[data-testid="extension-status"]')).toContainText('承認済');
    });

    test('延長契約の一括管理', async ({ page }) => {
      await page.goto('/sales/contract-extensions');
      await page.waitForLoadState('networkidle');

      // 期限別フィルタリング
      await page.selectOption('[data-testid="expiration-filter"]', 'within-30-days');
      await page.click('[data-testid="apply-filter"]');
      
      // 緊急度別ソート
      await page.click('[data-testid="sort-by-urgency"]');
      
      // 一括リマインダー送信
      await page.check('[data-testid="select-all-pending"]');
      await page.click('[data-testid="bulk-reminder-button"]');
      
      await expect(page.locator('[data-testid="bulk-reminder-dialog"]')).toBeVisible();
      await page.selectOption('[data-testid="reminder-template"]', 'urgent-extension');
      await page.click('[data-testid="send-bulk-reminders"]');
      
      await expect(page.locator('[data-testid="reminders-sent"]')).toContainText('リマインダーを送信しました');

      // 延長統計の確認
      await page.click('[data-testid="view-statistics"]');
      await expect(page.locator('[data-testid="extension-stats-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-extension-period"]')).toBeVisible();
    });

    test('自動延長提案システム', async ({ page }) => {
      await page.goto('/sales/settings/auto-extension');
      await page.waitForLoadState('networkidle');

      // 自動延長ルールの設定
      await page.check('[data-testid="enable-auto-extension"]');
      
      // 条件設定
      await page.fill('[data-testid="trigger-days-before"]', '60');
      await page.selectOption('[data-testid="performance-threshold"]', 'good');
      await page.selectOption('[data-testid="client-satisfaction-threshold"]', '4');
      
      // 自動アクション設定
      await page.check('[data-testid="auto-generate-proposal"]');
      await page.check('[data-testid="auto-send-client"]');
      
      // 承認フロー設定
      await page.check('[data-testid="require-manager-approval"]');
      await page.selectOption('[data-testid="approval-manager"]', 'sales-manager-1');
      
      await page.click('[data-testid="save-auto-extension-rules"]');
      await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();

      // 自動延長の実行履歴確認
      await page.click('[data-testid="auto-extension-history"]');
      await expect(page.locator('[data-testid="auto-extension-log"]')).toBeVisible();
    });
  });

  test.describe('メール管理統合機能', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsSalesManager();
    });

    test('営業メールテンプレート管理', async ({ page }) => {
      await page.goto('/sales/email-templates');
      await page.waitForLoadState('networkidle');

      // 新規テンプレート作成
      await page.click('[data-testid="create-template-button"]');
      
      await page.fill('[data-testid="template-name"]', '提案フォローアップメール');
      await page.selectOption('[data-testid="template-category"]', 'proposal-followup');
      
      // 件名設定
      await page.fill('[data-testid="email-subject"]', '【{{company_name}}】提案に関するフォローアップ');
      
      // 本文作成
      const emailBody = `{{client_name}}様

いつもお世話になっております。
{{company_name}}の{{sender_name}}です。

先日ご提出させていただきました「{{proposal_title}}」につきまして、
ご検討状況はいかがでしょうか。

ご不明な点やご質問がございましたら、
お気軽にお声がけください。

何卒よろしくお願いいたします。`;

      await page.fill('[data-testid="email-body"]', emailBody);
      
      // 変数設定
      await page.click('[data-testid="add-variable-button"]');
      await page.fill('[data-testid="variable-name"]', 'deadline_date');
      await page.fill('[data-testid="variable-description"]', '提案期限日');
      await page.click('[data-testid="save-variable"]');
      
      await page.click('[data-testid="save-template-button"]');
      await expect(page.locator('[data-testid="template-saved"]')).toBeVisible();

      // テンプレートの使用
      await page.goto('/sales/proposals/123');
      await page.click('[data-testid="send-email-button"]');
      
      await page.selectOption('[data-testid="email-template-select"]', 'proposal-followup');
      
      // 変数の自動置換確認
      await expect(page.locator('[data-testid="email-preview"]')).toContainText('テスト株式会社');
      
      // カスタマイズ
      await page.fill('[data-testid="custom-message"]', '追加の技術的な質問についても対応可能です。');
      
      await page.click('[data-testid="send-email-confirm"]');
      await expect(page.locator('[data-testid="email-sent"]')).toBeVisible();
    });

    test('メール自動化ワークフロー', async ({ page }) => {
      await page.goto('/sales/automation/email-workflows');
      await page.waitForLoadState('networkidle');

      // 新規ワークフロー作成
      await page.click('[data-testid="create-workflow-button"]');
      
      await page.fill('[data-testid="workflow-name"]', '提案後フォローアップシーケンス');
      
      // トリガー設定
      await page.selectOption('[data-testid="trigger-event"]', 'proposal-submitted');
      
      // ステップ1: 即座に確認メール
      await page.click('[data-testid="add-step-button"]');
      await page.selectOption('[data-testid="step-1-action"]', 'send-email');
      await page.selectOption('[data-testid="step-1-template"]', 'proposal-confirmation');
      await page.fill('[data-testid="step-1-delay"]', '0');
      
      // ステップ2: 1週間後にフォローアップ
      await page.click('[data-testid="add-step-button"]');
      await page.selectOption('[data-testid="step-2-action"]', 'send-email');
      await page.selectOption('[data-testid="step-2-template"]', 'proposal-followup');
      await page.fill('[data-testid="step-2-delay"]', '7');
      
      // 条件分岐の設定
      await page.click('[data-testid="add-condition-button"]');
      await page.selectOption('[data-testid="condition-field"]', 'proposal-status');
      await page.selectOption('[data-testid="condition-operator"]', 'equals');
      await page.fill('[data-testid="condition-value"]', 'no-response');
      
      // ステップ3: 2週間後に最終フォローアップ
      await page.click('[data-testid="add-step-button"]');
      await page.selectOption('[data-testid="step-3-action"]', 'send-email');
      await page.selectOption('[data-testid="step-3-template"]', 'final-followup');
      await page.fill('[data-testid="step-3-delay"]', '14');
      
      await page.click('[data-testid="save-workflow-button"]');
      await expect(page.locator('[data-testid="workflow-saved"]')).toBeVisible();

      // ワークフローの実行履歴確認
      await page.click('[data-testid="workflow-history"]');
      await expect(page.locator('[data-testid="execution-log"]')).toBeVisible();
    });

    test('メール配信分析', async ({ page }) => {
      await page.goto('/sales/analytics/email-performance');
      await page.waitForLoadState('networkidle');

      // 配信統計の確認
      await expect(page.locator('[data-testid="total-sent"]')).toBeVisible();
      await expect(page.locator('[data-testid="open-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="click-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-rate"]')).toBeVisible();

      // テンプレート別パフォーマンス
      await page.click('[data-testid="template-performance-tab"]');
      await expect(page.locator('[data-testid="template-stats-table"]')).toBeVisible();
      
      // 期間フィルター
      await page.selectOption('[data-testid="period-filter"]', 'last-30-days');
      await page.click('[data-testid="apply-filter"]');
      
      // エクスポート機能
      await page.click('[data-testid="export-analytics"]');
      await page.selectOption('[data-testid="export-format"]', 'excel');
      await page.click('[data-testid="download-report"]');
    });
  });

  test.describe('POC同期・外部連携機能', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsSalesManager();
    });

    test('POCシステム同期設定', async ({ page }) => {
      await page.goto('/sales/integrations/poc-sync');
      await page.waitForLoadState('networkidle');

      // 同期設定の確認
      await expect(page.locator('[data-testid="poc-connection-status"]')).toBeVisible();
      
      // API設定
      await page.fill('[data-testid="poc-api-endpoint"]', 'https://poc-system.company.com/api');
      await page.fill('[data-testid="poc-api-key"]', 'test-api-key-12345');
      
      // 同期間隔設定
      await page.selectOption('[data-testid="sync-interval"]', 'hourly');
      
      // 同期対象データ選択
      await page.check('[data-testid="sync-engineers"]');
      await page.check('[data-testid="sync-projects"]');
      await page.check('[data-testid="sync-assignments"]');
      
      // 競合解決ルール
      await page.selectOption('[data-testid="conflict-resolution"]', 'poc-wins');
      
      await page.click('[data-testid="save-sync-settings"]');
      await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();

      // 手動同期実行
      await page.click('[data-testid="manual-sync-button"]');
      await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible();
      
      // 同期結果確認
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
      await expect(page.locator('[data-testid="sync-summary"]')).toContainText('同期が完了しました');
    });

    test('データマッピング管理', async ({ page }) => {
      await page.goto('/sales/integrations/data-mapping');
      await page.waitForLoadState('networkidle');

      // フィールドマッピング設定
      await page.click('[data-testid="add-mapping-button"]');
      
      // ソースフィールド選択
      await page.selectOption('[data-testid="source-field"]', 'poc.engineer.name');
      await page.selectOption('[data-testid="target-field"]', 'engineer.full_name');
      
      // 変換ルール設定
      await page.selectOption('[data-testid="transformation-rule"]', 'format-name');
      await page.fill('[data-testid="transformation-params"]', '{"format": "last_first"}');
      
      await page.click('[data-testid="save-mapping"]');
      
      // バリデーションルール設定
      await page.click('[data-testid="add-validation-button"]');
      await page.selectOption('[data-testid="validation-field"]', 'engineer.email');
      await page.selectOption('[data-testid="validation-type"]', 'email-format');
      
      await page.click('[data-testid="save-validation"]');
      
      // マッピングテスト
      await page.click('[data-testid="test-mapping-button"]');
      await expect(page.locator('[data-testid="mapping-test-results"]')).toBeVisible();
    });

    test('同期履歴とエラー管理', async ({ page }) => {
      await page.goto('/sales/integrations/sync-history');
      await page.waitForLoadState('networkidle');

      // 同期履歴の確認
      await expect(page.locator('[data-testid="sync-history-table"]')).toBeVisible();
      
      // フィルター機能
      await page.selectOption('[data-testid="status-filter"]', 'error');
      await page.fill('[data-testid="date-from"]', '2024-01-01');
      await page.click('[data-testid="apply-history-filter"]');
      
      // エラー詳細確認
      await page.click('[data-testid="sync-error-item-1"]');
      await expect(page.locator('[data-testid="error-detail-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-stack-trace"]')).toBeVisible();
      
      // エラー解決アクション
      await page.click('[data-testid="retry-sync-button"]');
      await expect(page.locator('[data-testid="retry-initiated"]')).toBeVisible();
      
      // アラート設定
      await page.click('[data-testid="error-alert-settings"]');
      await page.check('[data-testid="email-on-error"]');
      await page.fill('[data-testid="alert-email"]', 'admin@company.com');
      await page.click('[data-testid="save-alert-settings"]');
    });
  });

  test.describe('営業チーム管理機能', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsSalesManager();
    });

    test('チームメンバー管理', async ({ page }) => {
      await page.goto('/sales/team-management');
      await page.waitForLoadState('networkidle');

      // 新規メンバー追加
      await page.click('[data-testid="add-team-member-button"]');
      
      await page.fill('[data-testid="member-name"]', '田中太郎');
      await page.fill('[data-testid="member-email"]', 'tanaka@company.com');
      await page.selectOption('[data-testid="member-role"]', 'sales-representative');
      await page.selectOption('[data-testid="member-territory"]', 'tokyo');
      
      // 権限設定
      await page.check('[data-testid="permission-view-proposals"]');
      await page.check('[data-testid="permission-edit-proposals"]');
      await page.check('[data-testid="permission-view-interviews"]');
      
      await page.click('[data-testid="save-member-button"]');
      await expect(page.locator('[data-testid="member-added"]')).toBeVisible();

      // チーム構造の管理
      await page.click('[data-testid="manage-team-structure"]');
      
      // 担当領域の設定
      await page.click('[data-testid="assign-territory-button"]');
      await page.selectOption('[data-testid="territory-select"]', 'osaka');
      await page.selectOption('[data-testid="assign-to-member"]', 'tanaka-taro');
      await page.click('[data-testid="confirm-assignment"]');
      
      // 目標設定
      await page.click('[data-testid="set-targets-button"]');
      await page.fill('[data-testid="monthly-target"]', '10');
      await page.fill('[data-testid="quarterly-target"]', '30');
      await page.click('[data-testid="save-targets"]');
    });

    test('パフォーマンス追跡', async ({ page }) => {
      await page.goto('/sales/team-performance');
      await page.waitForLoadState('networkidle');

      // 個人パフォーマンス確認
      await expect(page.locator('[data-testid="performance-dashboard"]')).toBeVisible();
      
      // メンバー選択
      await page.selectOption('[data-testid="member-select"]', 'tanaka-taro');
      
      // KPI表示
      await expect(page.locator('[data-testid="proposals-submitted"]')).toBeVisible();
      await expect(page.locator('[data-testid="interviews-conducted"]')).toBeVisible();
      await expect(page.locator('[data-testid="contracts-closed"]')).toBeVisible();
      await expect(page.locator('[data-testid="revenue-generated"]')).toBeVisible();
      
      // 期間比較
      await page.selectOption('[data-testid="comparison-period"]', 'last-quarter');
      await page.click('[data-testid="apply-comparison"]');
      
      await expect(page.locator('[data-testid="performance-trend"]')).toBeVisible();
      
      // チーム全体のランキング
      await page.click('[data-testid="team-ranking-tab"]');
      await expect(page.locator('[data-testid="ranking-table"]')).toBeVisible();
      
      // パフォーマンスレポートエクスポート
      await page.click('[data-testid="export-performance-report"]');
      await page.selectOption('[data-testid="report-format"]', 'pdf');
      await page.check('[data-testid="include-charts"]');
      await page.click('[data-testid="generate-report"]');
    });

    test('売上予測・分析機能', async ({ page }) => {
      await page.goto('/sales/forecasting');
      await page.waitForLoadState('networkidle');

      // 売上予測モデルの確認
      await expect(page.locator('[data-testid="forecast-chart"]')).toBeVisible();
      
      // 予測パラメータ調整
      await page.selectOption('[data-testid="forecast-model"]', 'linear-regression');
      await page.fill('[data-testid="confidence-interval"]', '95');
      await page.selectOption('[data-testid="forecast-period"]', '6-months');
      
      await page.click('[data-testid="update-forecast"]');
      await expect(page.locator('[data-testid="forecast-updated"]')).toBeVisible();
      
      // シナリオ分析
      await page.click('[data-testid="scenario-analysis-tab"]');
      
      // 楽観的シナリオ
      await page.fill('[data-testid="optimistic-growth"]', '20');
      await page.fill('[data-testid="optimistic-conversion"]', '80');
      
      // 悲観的シナリオ
      await page.fill('[data-testid="pessimistic-growth"]', '5');
      await page.fill('[data-testid="pessimistic-conversion"]', '40');
      
      await page.click('[data-testid="calculate-scenarios"]');
      await expect(page.locator('[data-testid="scenario-results"]')).toBeVisible();
      
      // 予測精度の確認
      await page.click('[data-testid="accuracy-metrics-tab"]');
      await expect(page.locator('[data-testid="mae-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="rmse-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="accuracy-trend"]')).toBeVisible();
    });
  });
});