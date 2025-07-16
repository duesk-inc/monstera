# 提案情報確認機能フック

## 概要

提案情報確認機能のためのReact Queryフック集です。TanStack Query v5を使用して、提案・質問関連のデータ取得・更新管理を行います。

## 主要フック

### データ取得フック

#### `useProposals`
- 提案一覧の取得・管理
- フィルタリング、ソート、ページネーション対応
- 自動キャッシュ・無効化

```typescript
const { proposals, filters, setFilters, setPage } = useProposals({
  initialFilters: { status: 'proposed' },
  autoFetch: true
});
```

#### `useProposalDetail`
- 提案詳細情報の取得
- 質問一覧も含む完全な詳細データ

```typescript
const { data: proposal, isLoading } = useProposalDetail(proposalId);
```

#### `useQuestions`
- 提案の質問一覧取得
- ページネーション対応

```typescript
const { questions, total, updateParams } = useQuestions({
  proposalId,
  initialParams: { limit: 20 }
});
```

### データ更新フック

#### `useUpdateProposalStatus`
- 提案ステータス更新（選考へ進む/見送り）
- 関連クエリの自動無効化

```typescript
const updateStatus = useUpdateProposalStatus({
  onSuccess: () => console.log('ステータス更新完了')
});
```

#### `useCreateQuestion`
- 質問投稿
- リアルタイム反映

```typescript
const createQuestion = useCreateQuestion({
  onSuccess: (question) => console.log('質問投稿完了', question)
});
```

#### `useUpdateQuestion`・`useDeleteQuestion`
- 質問の編集・削除
- 24時間制限の考慮

### 営業担当者向けフック

#### `usePendingQuestions`
- 未回答質問一覧の取得

#### `useRespondToQuestion`
- 質問への回答投稿

#### `useAssignQuestion`
- 質問の担当者割り当て（管理者用）

### 統計・分析フック

#### `useProposalStats`
- 提案統計情報の取得

#### `useProposalDashboard`
- ダッシュボード用データの取得

### 高度な機能フック

#### `useInfiniteProposals`
- 無限スクロール対応の提案一覧

#### `useBatchUpdateProposalStatus`
- 複数提案の一括ステータス更新

#### `useBatchDeleteQuestions`
- 複数質問の一括削除

### ユーティリティフック

#### `useProposalCache`
- キャッシュ管理（事前読み込み、削除）

#### `useInvalidateProposalQueries`
- 全提案関連クエリの無効化

## クエリキー体系

```typescript
const PROPOSAL_QUERY_KEYS = {
  all: ['proposals'],
  lists: () => [...PROPOSAL_QUERY_KEYS.all, 'list'],
  list: (params) => [...PROPOSAL_QUERY_KEYS.lists(), params],
  details: () => [...PROPOSAL_QUERY_KEYS.all, 'detail'],
  detail: (id) => [...PROPOSAL_QUERY_KEYS.details(), id],
  questions: (proposalId) => [...PROPOSAL_QUERY_KEYS.detail(proposalId), 'questions'],
  // ...
};
```

## エラーハンドリング

- 統一されたエラーハンドリング
- 日本語エラーメッセージ
- Toast通知自動表示
- リトライ戦略の実装

## キャッシュ戦略

- **Stale Time**: 5分（デフォルト）
- **GC Time**: 10分（デフォルト）
- **リトライ**: サーバーエラーのみ最大3回
- **事前読み込み**: 次ページの自動プリフェッチ

## 使用例

### 基本的な提案一覧表示

```typescript
function ProposalList() {
  const {
    proposals,
    isLoading,
    filters,
    setFilters,
    page,
    setPage,
    totalPages
  } = useProposals();

  if (isLoading) return <Loading />;

  return (
    <div>
      <ProposalFilters filters={filters} onChange={setFilters} />
      <ProposalTable proposals={proposals} />
      <Pagination 
        page={page} 
        totalPages={totalPages} 
        onChange={setPage} 
      />
    </div>
  );
}
```

### 提案詳細とステータス更新

```typescript
function ProposalDetail({ proposalId }: { proposalId: string }) {
  const { data: proposal, isLoading } = useProposalDetail(proposalId);
  const updateStatus = useUpdateProposalStatus({
    onSuccess: () => showToast('ステータスを更新しました')
  });

  const handleStatusUpdate = (status: 'proceed' | 'declined') => {
    updateStatus.mutate({ id: proposalId, status });
  };

  if (isLoading) return <Loading />;
  if (!proposal) return <NotFound />;

  return (
    <div>
      <ProposalInfo proposal={proposal} />
      <StatusUpdateButtons onUpdate={handleStatusUpdate} />
      <QuestionSection proposalId={proposalId} />
    </div>
  );
}
```

### 質問投稿フォーム

```typescript
function QuestionForm({ proposalId }: { proposalId: string }) {
  const [questionText, setQuestionText] = useState('');
  const createQuestion = useCreateQuestion({
    onSuccess: () => {
      setQuestionText('');
      showToast('質問を投稿しました');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (questionText.trim()) {
      createQuestion.mutate({ proposalId, questionText });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextArea
        value={questionText}
        onChange={(e) => setQuestionText(e.target.value)}
        placeholder="質問内容を入力してください"
        maxLength={2000}
      />
      <Button 
        type="submit" 
        disabled={!questionText.trim() || createQuestion.isPending}
      >
        質問を投稿
      </Button>
    </form>
  );
}
```

## 注意事項

- フックはReactコンポーネント内でのみ使用してください
- エラーハンドリングは自動で行われますが、必要に応じてonErrorコールバックを使用してください
- 大量データの場合は無限スクロールフック（`useInfiniteProposals`）の使用を検討してください
- キャッシュの整合性のため、データ更新後は適切なクエリ無効化が自動実行されます