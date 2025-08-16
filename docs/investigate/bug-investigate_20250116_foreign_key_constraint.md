# バグ調査レポート: スキルシート保存時の外部キー制約違反エラー

## 調査日時
2025年1月16日 10:33

## バグの概要
スキルシート一時保存・更新処理でバックエンドで外部キー制約違反エラーが発生し、データの保存ができない。

## エラー内容

### PostgreSQLエラー
```
ERROR: insert or update on table "work_histories" violates foreign key constraint "work_histories_industry_fkey"
DETAIL: Key (industry)=(0) is not present in table "industries".
```

### エラー発生箇所
- ファイル: `backend/internal/service/skill_sheet_service.go:393`
- 処理: `work_histories`テーブルへのINSERT処理

## 根本原因

### 原因1: 無効なindustry値
フロントエンドから送信されるデータまたはバックエンドでの処理で、`industry`フィールドに`0`が設定されている。

### 原因2: industriesテーブルの有効値
`industries`テーブルには以下の有効なIDのみが存在：
- 1: IT・通信
- 2: 金融・保険  
- 3: 医療・福祉
- 4: 製造
- 5: 小売・流通
- 6: 公共・官公庁
- 7: その他

**ID=0のレコードは存在しない**ため、外部キー制約違反が発生。

### 原因3: バリデーション不足
`skill_sheet_service.go`の380行目で、`workReq.Industry`の値を検証せずに直接使用：
```go
workHistory := model.WorkHistory{
    // ...
    Industry: workReq.Industry,  // 値の検証なし
    // ...
}
```

## 影響範囲

### 影響を受ける機能
1. **スキルシート一時保存** - 保存できない
2. **スキルシート更新** - 更新できない
3. **職務経歴の追加・編集** - 保存できない

### 影響を受けるユーザー
- 全エンジニアユーザー - スキルシート機能が保存不可

### データ整合性への影響
- トランザクションのロールバックにより、データ不整合は発生しない
- 但し、プロフィールは作成されるが職務経歴が保存されない状態になる可能性

## 修正方針

### 方針1: バックエンドでのバリデーション追加（推奨）
```go
// skill_sheet_service.goの修正案
industry := workReq.Industry
if industry < 1 || industry > 7 {
    // 無効な値の場合は「その他」を設定
    industry = 7
    s.logger.Warn("無効なindustry値を「その他」に設定",
        zap.Int32("original_value", workReq.Industry),
        zap.Int32("new_value", industry))
}

workHistory := model.WorkHistory{
    // ...
    Industry: industry,
    // ...
}
```

### 方針2: フロントエンドでの初期値設定
フロントエンドで業種が未選択の場合に適切なデフォルト値を設定：
- 初期値を`7`（その他）に設定
- または必須選択項目として検証を強化

### 方針3: エラーハンドリングの改善
より具体的なエラーメッセージを返す：
```go
if err := tx.Create(&workHistory).Error; err != nil {
    if strings.Contains(err.Error(), "work_histories_industry_fkey") {
        return fmt.Errorf("無効な業種が選択されています")
    }
    return err
}
```

## 回避策
現時点での回避策：
1. フロントエンドで業種を必ず選択する（1-7の値）
2. 業種が不明な場合は「その他（7）」を選択

## 関連ファイル
- `backend/internal/service/skill_sheet_service.go` - エラー発生箇所
- `backend/internal/dto/profile_dto.go` - WorkHistoryRequestの定義
- `backend/migrations/000002_create_profiles_and_related_tables.up.sql` - テーブル定義
- `frontend/src/components/features/skillSheet/WorkHistoryEditDialog.tsx` - フロントエンド入力画面

## テスト項目
- [ ] industry値が0の場合の処理
- [ ] industry値が1-7の範囲外の場合の処理
- [ ] industry値が正常な場合の処理
- [ ] フロントエンドでの業種選択の初期値

## 今後の推奨事項

### 短期的
1. バックエンドでindustry値のバリデーションを追加
2. 無効な値は「その他（7）」にフォールバック
3. エラーメッセージの改善

### 長期的
1. フロントエンドとバックエンドの定数を共通化
2. バリデーションルールの統一
3. 外部キー制約に関するエラーハンドリングの標準化

## ステータス
**status**: SUCCESS  
**next**: BUG-FIX  
**details**: "バグの根本原因を特定。bug-investigate_20250116_foreign_key_constraint.mdに詳細記録。修正フェーズへ移行。"