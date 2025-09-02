% 画面/ナビゲーション（Draft）

- ルーティング基盤: App Router
- 認証済みレイアウト: `frontend/src/app/(authenticated)/layout.tsx:1`
- 共通ラッパ: `frontend/src/components/common/layout/SharedLayoutWrapper.tsx:1`

役割別メニュー
- エンジニア: `frontend/src/components/ui/EngineerSidebar.tsx:1`
  - `/dashboard` ダッシュボード
  - `/weekly-report` 週報
  - `/expenses` 経費申請
  - `/leave` 休暇申請
  - `/skill-sheet` スキルシート
  - `/profile` プロフィール
- 管理: `frontend/src/components/ui/AdminSidebar.tsx:1`
  - エンジニア管理（社員/週報/勤怠/経費/催促/休暇/フォロー/スキル）
  - ビジネス管理（取引先/請求）
  - 営業管理（パイプライン/提案/回答）
  - 経理管理（ダッシュボード/請求書/月次処理/プロジェクトグループ/freee）
  - 設定（一般/経費承認者）

初期スコープ外（UI 方針）
- 週報管理タブの「未提出者管理」「アラート管理」は v0 では非表示
- 「承認催促管理」は将来機能（v0 は無効化/非活性表示とする）

ガード
- Middleware で Cookie の Cognito アクセストークン形式を軽検証: `frontend/src/middleware.ts:1`
- ログイン画面の自動遷移（認証済→ダッシュボード）あり

TODO
- 画面遷移図（主要フロー: ログイン→週報作成→提出 など）
- モバイル時のドロワー動作仕様
