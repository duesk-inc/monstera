# ハードコーディング削減 移行ガイド

## 概要

このガイドは、Monsteraプロジェクトにおけるハードコーディングを削減し、保守性の高いコードベースを実現するための移行手順を説明します。

## 定数ファイル構成

```
src/constants/
├── index.ts              # 統合エクスポート
├── api.ts               # API関連
├── auth.ts              # 認証関連
├── business-rules.ts    # ビジネスルール
├── defaultWorkTime.ts   # デフォルト勤務時間
├── delays.ts            # タイムアウト・遅延
├── dimensions.ts        # UI寸法
├── endpoints.ts         # APIエンドポイント
├── network.ts           # ネットワーク設定
├── pagination.ts        # ページネーション
├── routes.ts            # ルーティング
├── storage.ts           # ストレージキー
├── typography.ts        # タイポグラフィ
├── ui.ts               # UI全般
├── weeklyMood.ts       # 週報気分
└── weeklyReport.ts     # 週報関連
```

## 移行手順

### 1. UI寸法値の移行

#### Before:
```typescript
// ❌ ハードコードされた値
<Box sx={{ padding: 16, borderRadius: 8 }}>
  <Avatar sx={{ width: 40, height: 40 }} />
</Box>
```

#### After:
```typescript
// ✅ 定数を使用
import { SPACING, BORDER_RADIUS, COMPONENT_SIZES } from '@/constants/dimensions';

<Box sx={{ padding: SPACING.MD, borderRadius: BORDER_RADIUS.MD }}>
  <Avatar sx={{ 
    width: COMPONENT_SIZES.AVATAR.MD, 
    height: COMPONENT_SIZES.AVATAR.MD 
  }} />
</Box>
```

### 2. フォント関連の移行

#### Before:
```typescript
// ❌ ハードコードされた値
<Typography sx={{ fontSize: 16, fontWeight: 500 }}>
  タイトル
</Typography>
```

#### After:
```typescript
// ✅ 定数を使用
import { FONT_SIZE, FONT_WEIGHT } from '@/constants/typography';

<Typography sx={{ 
  fontSize: FONT_SIZE.BASE, 
  fontWeight: FONT_WEIGHT.MEDIUM 
}}>
  タイトル
</Typography>
```

### 3. タイムアウト・遅延の移行

#### Before:
```typescript
// ❌ ハードコードされた値
setTimeout(() => {
  router.push('/dashboard');
}, 3000);

const client = axios.create({
  timeout: 15000
});
```

#### After:
```typescript
// ✅ 定数を使用
import { UI_DELAYS, API_TIMEOUTS } from '@/constants/delays';

setTimeout(() => {
  router.push('/dashboard');
}, UI_DELAYS.REDIRECT);

const client = axios.create({
  timeout: API_TIMEOUTS.SHORT
});
```

### 4. ページネーションの移行

#### Before:
```typescript
// ❌ ハードコードされた値
const [params, setParams] = useState({ page: 1, limit: 20 });
```

#### After:
```typescript
// ✅ 定数を使用
import { PAGINATION } from '@/constants/pagination';

const [params, setParams] = useState({ 
  page: PAGINATION.DEFAULT_PAGE, 
  limit: PAGINATION.DEFAULT_PAGE_SIZE 
});
```

### 5. ストレージキーの移行

#### Before:
```typescript
// ❌ ハードコードされた値
localStorage.setItem('user', JSON.stringify(userData));
localStorage.getItem('access_token');
```

#### After:
```typescript
// ✅ 定数を使用
import { AUTH_STORAGE_KEYS } from '@/constants/storage';

localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(userData));
localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
```

### 6. APIエンドポイントの移行

#### Before:
```typescript
// ❌ ハードコードされた値
const response = await axios.get('/api/v1/profile');
const weeklyReport = await axios.post(`/api/v1/weekly-reports/${id}/submit`);
```

#### After:
```typescript
// ✅ 定数を使用
import { USER_ENDPOINTS, WEEKLY_REPORT_ENDPOINTS } from '@/constants/endpoints';

const response = await axios.get(USER_ENDPOINTS.PROFILE);
const weeklyReport = await axios.post(WEEKLY_REPORT_ENDPOINTS.SUBMIT(id));
```

### 7. ビジネスルールの移行

#### Before:
```typescript
// ❌ ハードコードされた値
if (fileSize > 5 * 1024 * 1024) {
  throw new Error('ファイルサイズは5MB以下にしてください');
}

const isValidPassword = password.length >= 8;
```

#### After:
```typescript
// ✅ 定数を使用
import { FILE_LIMITS, VALIDATION_RULES } from '@/constants/business-rules';

if (fileSize > FILE_LIMITS.MAX_SIZE.IMAGE_BYTES) {
  throw new Error(`ファイルサイズは${FILE_LIMITS.MAX_SIZE.IMAGE_MB}MB以下にしてください`);
}

const isValidPassword = password.length >= VALIDATION_RULES.PASSWORD.MIN_LENGTH;
```

## ユーティリティ関数の活用

### spacing関数
```typescript
import { spacing, px } from '@/constants/dimensions';

// 8pxグリッドベースの計算
const margin = spacing(2); // 16px
const paddingStyle = px(spacing(3)); // "24px"
```

### remとpxの変換
```typescript
import { remToPx, pxToRem } from '@/constants/typography';

const pixelValue = remToPx(1.5); // 24
const remValue = pxToRem(16); // "1rem"
```

### 通貨フォーマット
```typescript
import { formatCurrency } from '@/constants/business-rules';

const price = formatCurrency(10000); // "¥10,000"
```

## ESLintの活用

プロジェクトには、ハードコーディングを検出するESLintルールが設定されています：

```bash
# ESLintを実行して違反を検出
npm run lint

# 自動修正可能な違反を修正
npm run lint:fix
```

## ベストプラクティス

1. **新規コード作成時**
   - 数値や文字列を直接記述する前に、既存の定数を確認
   - 適切な定数がない場合は、追加を検討

2. **レビュー時の確認事項**
   - マジックナンバーがないか
   - 適切な定数を使用しているか
   - 定数の命名が適切か

3. **定数の管理**
   - 関連する定数は同じファイルにまとめる
   - 定数名は意味が明確になるように命名
   - 必要に応じてコメントを追加

4. **段階的な移行**
   - 新規開発時は必ず定数を使用
   - 既存コードは修正時に合わせて移行
   - 重要度の高い箇所から優先的に対応

## FAQ

### Q: どの値を定数化すべきか？
A: 以下の基準で判断してください：
- 複数箇所で使用される値
- ビジネスロジックに関わる値
- 将来変更される可能性がある値
- 意味が不明瞭な数値（マジックナンバー）

### Q: 定数ファイルが見つからない場合は？
A: `/src/constants/index.ts` から全ての定数がエクスポートされています。
また、`APP_CONSTANTS` オブジェクトを使用することで、名前空間付きでアクセスできます。

### Q: 新しい定数カテゴリが必要な場合は？
A: 適切なファイル名で新規作成し、`/src/constants/index.ts` に追加してください。

### Q: 既存のハードコーディングを見つけるには？
A: ESLintを実行するか、以下のパターンを検索してください：
- 数値リテラル: `\d+`
- ピクセル値: `\d+px`
- 時間値: `setTimeout.*\d+`
- 文字列リテラル: `'[^']+?'` または `"[^"]+?"`

## 参考リンク

- [ESLint no-magic-numbers](https://eslint.org/docs/latest/rules/no-magic-numbers)
- [Clean Code: Meaningful Names](https://github.com/ryanmcdermott/clean-code-javascript#variables)
- [Material-UI Theming](https://mui.com/material-ui/customization/theming/)