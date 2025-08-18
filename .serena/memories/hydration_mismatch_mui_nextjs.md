# Hydration Mismatch - Next.js App Router + Material-UI

## 問題パターン
Next.js App RouterでMaterial-UI（emotion）を使用する際、Suspenseとemotionのグローバルスタイルが競合してHydration mismatchが発生する。

## 症状
```
Hydration failed because the server rendered HTML didn't match the client.
+ <Suspense fallback={...}>
- <style data-emotion="...">
```

## 原因
1. useSearchParams()をSuspenseでラップ（必須）
2. emotionのSSR設定が不適切
3. CssBaselineのグローバルスタイル注入タイミング

## 解決策

### 1. Suspenseの分離
```typescript
// searchParamsを使う部分だけSuspenseでラップ
function PageContent() {
  return (
    <div>
      <Suspense fallback={<Loading />}>
        <SearchParamsComponent />
      </Suspense>
      <RestOfContent />
    </div>
  );
}
```

### 2. dynamic importでSSR無効化
```typescript
const Component = dynamic(() => import('./Component'), {
  ssr: false,
  loading: () => <Loading />
});
```

### 3. emotion SSR設定
- EmotionCacheProviderを実装
- useServerInsertedHTMLフックを使用

## 注意事項
- 開発環境と本番環境で挙動が異なる場合がある
- パフォーマンスへの影響を考慮
- 他のページでも同様の問題が発生する可能性

## 発生日
2025-01-19