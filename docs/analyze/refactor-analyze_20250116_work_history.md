# リファクタリング分析: 職務経歴の個別管理機能

## 分析日時
2025年1月16日 16:35

## 分析対象
スキルシート機能における職務経歴の管理方式

## 現状分析

### ユーザーの認識: ✅ 正しい
「スキルシート画面で作成する職務経歴は個々で保存する仕様にはなっていない」という認識は正確です。

### 現在の実装状況

#### 1. フロントエンド実装
- **保存方式**: スキルシート全体を一括保存
- **データ管理**: React Hook Formのstateで管理
- **編集フロー**:
  1. 職務経歴の追加・編集・削除はすべてメモリ上で実行
  2. 「保存」または「一時保存」ボタンで全体を一括送信
  3. 個別の職務経歴APIは使用していない

```typescript
// frontend/src/components/features/skillSheet/WorkHistoryContentCards.tsx
const handleAddWorkHistory = useCallback(() => {
  // メモリ上にデータを追加
  setValue('workHistory', [...currentValues, emptyWorkHistory]);
  // 編集ダイアログを開く
  setEditDialog({ isOpen: true, index: newIndex, isNew: true });
}, [getValues, setValue]);
```

#### 2. バックエンド実装
- **スキルシートAPI**: 実装済み・動作中
  - `PUT /api/v1/skill-sheet` - 全体更新
  - `POST /api/v1/skill-sheet/temp-save` - 全体一時保存
- **職務経歴個別API**: エンドポイントは定義済みだが**未実装**
  - `GET /api/v1/work-history` - 一覧取得（TODO）
  - `GET /api/v1/work-history/:id` - 個別取得（TODO）
  - `POST /api/v1/work-history` - 作成（TODO）
  - `PUT /api/v1/work-history/:id` - 更新（TODO）
  - `DELETE /api/v1/work-history/:id` - 削除（TODO）

```go
// backend/internal/handler/work_history_handler.go
func (h *WorkHistoryHandler) CreateWorkHistory(c *gin.Context) {
    // TODO: 実装予定
    RespondSuccess(c, http.StatusCreated, "職務経歴を作成しました", gin.H{
        "work_history_id": uuid.New().String(),
    })
}
```

#### 3. データベース設計
- **テーブル構造**: 個別管理に対応可能
  - `work_histories`テーブルは独立したエンティティ
  - `profile_id`で紐付け（外部キー制約）
  - 個別のCRUD操作が可能な設計

```sql
CREATE TABLE work_histories (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    -- 各種フィールド
    FOREIGN KEY (profile_id) REFERENCES profiles(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 問題点と改善機会

### 現状の問題点
1. **データ損失リスク**
   - ブラウザクラッシュ時に未保存データが失われる
   - 長時間の編集作業で不安定
   
2. **UX上の課題**
   - 職務経歴を1つ追加するだけでも全体を保存する必要がある
   - 複数人での同時編集が困難
   - 変更履歴の追跡が困難
   
3. **パフォーマンス**
   - 職務経歴が多い場合、全体の送受信でオーバーヘッド
   - 不要なデータ転送が発生

4. **保守性**
   - フロントエンドの状態管理が複雑
   - バリデーションロジックが分散

### 改善機会
1. **段階的な保存**
   - 個別の職務経歴を即座に保存
   - 自動保存機能の実装が容易に
   
2. **データ整合性の向上**
   - トランザクション単位を小さくできる
   - 部分的な更新失敗の影響を限定
   
3. **協調編集の可能性**
   - 複数人での同時編集が可能に
   - 変更の競合を最小化

## リファクタリング計画

### フェーズ1: バックエンドAPI実装（必須）
1. **WorkHistoryService実装**
   - 個別CRUD処理の実装
   - バリデーションロジックの統一
   - トランザクション管理

2. **WorkHistoryHandler実装**
   - TODOになっている各メソッドの実装
   - エラーハンドリング
   - 認証・認可チェック

### フェーズ2: フロントエンド改修（段階的移行）
1. **API Client層の追加**
   ```typescript
   // lib/api/workHistory.ts
   export const createWorkHistory = async (data: WorkHistoryFormData)
   export const updateWorkHistory = async (id: string, data: WorkHistoryFormData)
   export const deleteWorkHistory = async (id: string)
   ```

2. **状態管理の改善**
   - 個別保存後のstate更新
   - 楽観的更新の実装
   - エラーリカバリー

3. **UI/UXの最適化**
   - 保存状態のインジケーター
   - 個別保存ボタンの追加
   - 自動保存オプション

### フェーズ3: 移行戦略
1. **既存機能との並行稼働**
   - フィーチャーフラグで切り替え
   - 段階的なユーザー移行

2. **データ移行**
   - 既存データの整合性確認
   - バックアップ戦略

## 必要な作業項目

### バックエンド（推定工数: 3-5日）
- [ ] WorkHistoryServiceの実装
- [ ] WorkHistoryRepositoryの実装
- [ ] WorkHistoryHandlerの各メソッド実装
- [ ] 単体テストの作成
- [ ] 統合テストの作成
- [ ] APIドキュメントの更新

### フロントエンド（推定工数: 5-7日）
- [ ] API Client関数の実装
- [ ] Custom Hooksの改修
- [ ] WorkHistoryEditDialogの改修
- [ ] WorkHistoryContentCardsの改修
- [ ] 状態管理ロジックの更新
- [ ] エラーハンドリングの実装
- [ ] UIテストの更新

### 共通（推定工数: 2日）
- [ ] 移行計画の詳細化
- [ ] テストシナリオの作成
- [ ] ドキュメントの更新
- [ ] パフォーマンステスト

## リスク評価

### 技術的リスク
- **中**: 既存機能への影響（スキルシート全体保存との互換性）
- **低**: データ整合性（トランザクション管理で対応可能）

### ビジネスリスク
- **低**: ユーザー影響（段階的移行で最小化）
- **低**: ダウンタイム（APIは新規追加のため影響なし）

## 推奨事項

### 短期的対応
1. **バックエンドAPIの実装を優先**
   - 基盤を整えることで将来の拡張が容易に
   - APIが実装されていても、フロントエンドは既存方式で動作可能

2. **段階的な移行**
   - まず1つの職務経歴で動作確認
   - 問題がなければ全面移行

### 長期的対応
1. **リアルタイム協調編集**
   - WebSocketを使用した同時編集
   - 変更の自動マージ

2. **バージョン管理**
   - 職務経歴の変更履歴
   - 復元機能

3. **AI支援機能**
   - 職務経歴の自動生成・改善提案
   - スキルマッチング

## 結論

ユーザーの認識は正確であり、現在のスキルシート機能は職務経歴を個別に保存する仕様になっていません。しかし、バックエンドには既にAPIエンドポイントが定義されており、データベース設計も個別管理に対応しているため、リファクタリングの基盤は整っています。

推奨されるアプローチは、まずバックエンドAPIを実装し、その後フロントエンドを段階的に移行することです。これにより、リスクを最小限に抑えながら、UXとデータ管理の両面で大幅な改善が期待できます。

## ステータス
**status**: MAJOR_REFACTORING_NEEDED  
**next**: REFACTOR-PLAN  
**details**: "大規模な改善が必要。refactor-analyze_20250116_work_history.mdに詳細記録。慎重な計画が必要。"