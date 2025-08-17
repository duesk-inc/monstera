# APIクライアント完全移行戦略

## 移行状況
- 新システム実装: 完了（100%）
- 実際の移行: 未着手（0%）
- 影響範囲: 103ファイル（24直接 + 79サブモジュール）

## 7フェーズ移行計画

### Phase 1: 準備と基盤整備（2日）
- 自動移行スクリプト作成（jscodeshift使用）
- Feature Flag実装
- ベースラインメトリクス測定

### Phase 2: 認証・コアモジュール（3日）
- auth, profile, user, notification
- 最重要モジュールから開始

### Phase 3: 管理者機能（2日）
- admin配下の11ファイル
- 管理者プリセット活用

### Phase 4: ビジネスロジック（3日）
- expense, weeklyReport, workHistory, skillSheet, sales
- 適切なプリセット選択

### Phase 5: UIコンポーネント（2日）
- components, appディレクトリ
- React Query統合

### Phase 6: 旧システム削除（1日）
- 後方互換性レイヤー削除
- デッドコード削除

### Phase 7: 最終検証（2日）
- パフォーマンステスト
- ドキュメント更新

## 自動移行パターン

### インポート変換
```javascript
// Before
import apiClient from '@/lib/api';
import { apiClient } from '@/lib/api';
import { getAuthClient } from '@/lib/api';

// After
import { createPresetApiClient } from '@/lib/api';
```

### 使用箇所変換
```javascript
// Before
apiClient.get('/api/v1/data')

// After
const client = createPresetApiClient('auth');
client.get('/data')
```

## リスク緩和策

1. **Feature Flag**: 段階的切り替え
2. **Canary Deployment**: 10%→30%→60%→100%
3. **自動ロールバック**: エラー率閾値監視
4. **Dual Mode**: 移行期間中の二重動作

## 成功基準
- 全103ファイル移行完了
- パフォーマンス30%以上改善
- バンドルサイズ30%以上削減
- テストカバレッジ90%以上
- エラー率1%以下

## 推定期間
15営業日（約3週間）