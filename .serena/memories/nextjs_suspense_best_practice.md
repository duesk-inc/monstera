# Next.js Suspenseベストプラクティス

## 原則
useSearchParams()などの動的なフックを使用する場合、Suspenseは最小限の範囲でラップする。

## 推奨パターン

### ❌ 避けるべきパターン
```typescript
// ページ全体をSuspenseでラップ
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent />  // useSearchParams()を内部で使用
    </Suspense>
  );
}
```

### ✅ 推奨パターン
```typescript
// useSearchParams()部分のみをSuspenseでラップ
function PageContent() {
  return (
    <div>
      <Header />
      <Suspense fallback={null}>
        <SearchParamsComponent />  // useSearchParams()をここだけで使用
      </Suspense>
      <MainContent />
    </div>
  );
}
```

## 理由
1. Hydration errorの防止
2. emotionなどのCSS-in-JSライブラリとの競合回避
3. 最小限の再レンダリング範囲
4. パフォーマンスの最適化

## 適用すべきフック
- useSearchParams()
- useParams()（動的ルート）
- その他のサスペンスが必要なフック

## チェックリスト
- [ ] Suspenseの範囲は最小限か
- [ ] fallbackは適切か（nullでも可）
- [ ] SSRとCSRで一貫性があるか
- [ ] パフォーマンスへの影響を測定したか

## 発生日
2025-01-19

## 関連
- Hydration Mismatch問題
- Material-UI/emotion SSR設定