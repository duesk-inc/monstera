# React Hooksの一般的なエラーパターン

## 1. useCallbackをuseMemo内で使用
**問題**: React HooksのルールによりuseMemo内でuseCallbackを呼ぶことは禁止
**解決**: useCallbackを外部で定義してからuseMemo内で参照

```typescript
// ❌ 間違い
const columns = useMemo(() => ({
  format: useCallback(() => {}, [])
}), []);

// ✅ 正しい
const formatFn = useCallback(() => {}, []);
const columns = useMemo(() => ({
  format: formatFn
}), [formatFn]);
```

## 2. 防御的プログラミング
オブジェクトのプロパティアクセス前に必ずnullチェックを行う：
```typescript
const handler = useCallback((row: Item) => {
  if (!row) return;  // 防御的チェック
  // 処理
}, []);
```

## 3. ESLintの活用
`eslint-plugin-react-hooks`の警告は必ず対応する。CI/CDでのチェック必須。