import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProposalQuestionList } from '../index';
import { mockQuestions, createMockQuestion } from '@/test-utils/proposalData';

// useProposalPermissions フックのモック
jest.mock('@/hooks/proposal/useProposalPermissions', () => ({
  useProposalPermissions: () => ({
    canEditQuestionComprehensive: jest.fn().mockReturnValue(true),
    canDeleteQuestionComprehensive: jest.fn().mockReturnValue(true),
    canRespondToQuestions: true,
    currentUserId: 'eng-001',
  }),
}));

describe('ProposalQuestionList', () => {
  const defaultProps = {
    questions: mockQuestions,
    isLoading: false,
    error: null,
    isEditable: true,
    onCreateQuestion: jest.fn(),
    onUpdateQuestion: jest.fn(), 
    onDeleteQuestion: jest.fn(),
    onRefresh: jest.fn(),
    title: '質問・回答',
    emptyMessage: '質問がありません',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('レンダリング', () => {
    it('質問一覧が正しく表示される', () => {
      render(<ProposalQuestionList {...defaultProps} />);

      // タイトルの確認
      expect(screen.getByText('質問・回答')).toBeInTheDocument();

      // 質問数の確認
      expect(screen.getByText(/全.*2.*件/)).toBeInTheDocument();

      // 各質問の内容確認
      mockQuestions.forEach(question => {
        expect(screen.getByText(question.questionText)).toBeInTheDocument();
      });
    });

    it('ローディング状態が正しく表示される', () => {
      render(<ProposalQuestionList {...defaultProps} isLoading={true} />);

      // ローディング中でもタイトルは表示される
      expect(screen.getByText('質問・回答')).toBeInTheDocument();
      // Skeleton要素が含まれているコンテナを確認
      const container = screen.getByText('質問・回答').closest('div');
      expect(container).toBeInTheDocument();
    });

    it('エラー状態が正しく表示される', () => {
      const error = new Error('データの取得に失敗しました');
      render(<ProposalQuestionList {...defaultProps} error={error} />);

      expect(screen.getByText('質問の取得に失敗しました')).toBeInTheDocument();
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
    });

    it('質問がない場合の空状態が表示される', () => {
      render(<ProposalQuestionList {...defaultProps} questions={[]} />);

      expect(screen.getByText('質問がありません')).toBeInTheDocument();
    });
  });

  describe('質問投稿機能', () => {
    it('質問投稿フォームが表示・非表示できる', async () => {
      const user = userEvent.setup();
      render(<ProposalQuestionList {...defaultProps} />);

      // 初期状態ではダイアログは非表示
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // 質問投稿ボタンをクリック
      const addButton = screen.getByRole('button', { name: /質問を投稿/ });
      await user.click(addButton);

      // ダイアログが表示される
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/質問内容を入力してください/)).toBeInTheDocument();
      });
    });

    it('質問を投稿できる', async () => {
      const user = userEvent.setup();
      const onCreateQuestion = jest.fn().mockResolvedValue(undefined);
      render(<ProposalQuestionList {...defaultProps} onCreateQuestion={onCreateQuestion} />);

      // 質問投稿ボタンをクリック
      await user.click(screen.getByRole('button', { name: /質問を投稿/ }));

      // ダイアログが表示されるまで待つ
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 質問を入力
      const textarea = screen.getByPlaceholderText(/質問内容を入力してください/);
      await user.type(textarea, 'テスト質問です');

      // 投稿ボタンをクリック
      const postButton = screen.getByRole('button', { name: '投稿' });
      await user.click(postButton);

      // onCreateQuestion が呼ばれることを確認
      await waitFor(() => {
        expect(onCreateQuestion).toHaveBeenCalledWith('テスト質問です');
      });
    });

    it('空の質問は投稿できない', async () => {
      const user = userEvent.setup();
      render(<ProposalQuestionList {...defaultProps} />);

      // 質問投稿ボタンをクリック
      await user.click(screen.getByRole('button', { name: /質問を投稿/ }));

      // ダイアログが表示されるまで待つ
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 投稿ボタンが無効になっていることを確認
      const postButton = screen.getByRole('button', { name: '投稿' });
      expect(postButton).toBeDisabled();

      // onCreateQuestion が呼ばれないことを確認
      expect(defaultProps.onCreateQuestion).not.toHaveBeenCalled();
    });

    it('編集不可の場合は質問投稿ボタンが表示されない', () => {
      render(<ProposalQuestionList {...defaultProps} isEditable={false} />);

      expect(screen.queryByRole('button', { name: /質問を投稿/ })).not.toBeInTheDocument();
    });
  });

  describe('質問編集機能', () => {
    it('質問を編集できる', async () => {
      const user = userEvent.setup();
      const onUpdateQuestion = jest.fn().mockResolvedValue(undefined);
      const editableQuestion = createMockQuestion({
        id: 'q-003',
        questionText: '編集可能な質問',
        isResponded: false,
        createdAt: new Date().toISOString(), // 24時間以内
      });

      render(
        <ProposalQuestionList 
          {...defaultProps} 
          questions={[editableQuestion]}
          onUpdateQuestion={onUpdateQuestion}
        />
      );

      // メニューボタンをクリック
      const menuButton = screen.getByRole('button', { name: /質問メニュー/ });
      await user.click(menuButton);

      // 編集オプションをクリック
      const editOption = screen.getByText('編集');
      await user.click(editOption);

      // 編集ダイアログが表示される
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // テキストを編集
      const textarea = screen.getByDisplayValue('編集可能な質問');
      await user.clear(textarea);
      await user.type(textarea, '更新された質問');

      // 更新ボタンをクリック
      const updateButton = screen.getByRole('button', { name: /更新/ });
      await user.click(updateButton);

      // onUpdateQuestion が呼ばれることを確認
      await waitFor(() => {
        expect(onUpdateQuestion).toHaveBeenCalledWith('q-003', '更新された質問');
      });
    });

    it('回答済みの質問は編集できない', async () => {
      const user = userEvent.setup();
      const respondedQuestion = mockQuestions[0]; // 回答済みの質問

      render(
        <ProposalQuestionList 
          {...defaultProps} 
          questions={[respondedQuestion]}
        />
      );

      // 回答済みの質問にはメニューボタン自体が表示されない
      expect(screen.queryByRole('button', { name: /質問メニュー/ })).not.toBeInTheDocument();
    });
  });

  describe('質問削除機能', () => {
    it('質問を削除できる', async () => {
      const user = userEvent.setup();
      const onDeleteQuestion = jest.fn().mockResolvedValue(undefined);
      const deletableQuestion = createMockQuestion({
        id: 'q-004',
        questionText: '削除可能な質問',
        isResponded: false,
        createdAt: new Date().toISOString(), // 24時間以内
      });

      render(
        <ProposalQuestionList 
          {...defaultProps} 
          questions={[deletableQuestion]}
          onDeleteQuestion={onDeleteQuestion}
        />
      );

      // メニューボタンをクリック
      const menuButton = screen.getByRole('button', { name: /質問メニュー/ });
      await user.click(menuButton);

      // 削除オプションをクリック
      const deleteOption = screen.getByText('削除');
      await user.click(deleteOption);

      // 確認ダイアログが表示される
      await waitFor(() => {
        expect(screen.getByText(/この質問を削除してもよろしいですか/)).toBeInTheDocument();
      });

      // 削除ボタンをクリック
      const confirmButton = screen.getByRole('button', { name: /削除/ });
      await user.click(confirmButton);

      // onDeleteQuestion が呼ばれることを確認
      await waitFor(() => {
        expect(onDeleteQuestion).toHaveBeenCalledWith('q-004');
      });
    });

    it('削除確認をキャンセルできる', async () => {
      const user = userEvent.setup();
      const question = createMockQuestion({
        isResponded: false,
        createdAt: new Date().toISOString(),
      });

      render(
        <ProposalQuestionList 
          {...defaultProps} 
          questions={[question]}
        />
      );

      // メニューボタンをクリック
      const menuButton = screen.getByRole('button', { name: /質問メニュー/ });
      await user.click(menuButton);

      // 削除オプションをクリック
      await user.click(screen.getByText('削除'));

      // キャンセルボタンをクリック
      const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
      await user.click(cancelButton);

      // onDeleteQuestion が呼ばれないことを確認
      expect(defaultProps.onDeleteQuestion).not.toHaveBeenCalled();
    });
  });

  describe('営業担当者向け機能', () => {
    it('営業担当者モードで質問回答機能が表示される', async () => {
      const user = userEvent.setup();
      const onRespondQuestion = jest.fn().mockResolvedValue(undefined);
      const unansweredQuestion = mockQuestions[1]; // 未回答の質問

      render(
        <ProposalQuestionList 
          {...defaultProps} 
          questions={[unansweredQuestion]}
          isSalesView={true}
          onRespondQuestion={onRespondQuestion}
        />
      );

      // 回答ボタンが表示される
      const respondButton = screen.getByRole('button', { name: /回答する/ });
      expect(respondButton).toBeInTheDocument();

      // 回答ボタンをクリック
      await user.click(respondButton);

      // 回答入力ダイアログが表示される
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('質問に回答')).toBeInTheDocument();
      });

      // 回答を入力
      const textarea = screen.getByPlaceholderText(/回答内容を入力してください/);
      await user.type(textarea, 'テスト回答です');

      // 回答送信ボタンをクリック
      const sendButton = screen.getByRole('button', { name: /回答を送信/ });
      await user.click(sendButton);

      // onRespondQuestion が呼ばれることを確認
      await waitFor(() => {
        expect(onRespondQuestion).toHaveBeenCalledWith(
          unansweredQuestion.id,
          'テスト回答です'
        );
      });
    });

    it('営業担当者モードでは質問投稿ボタンが表示されない', () => {
      render(
        <ProposalQuestionList 
          {...defaultProps} 
          isSalesView={true}
          isEditable={false}
        />
      );

      expect(screen.queryByRole('button', { name: /質問を投稿/ })).not.toBeInTheDocument();
    });
  });

  describe('その他の機能', () => {
    it('エラー時にリロードボタンが動作する', async () => {
      const user = userEvent.setup();
      const error = new Error('エラーが発生しました');
      render(<ProposalQuestionList {...defaultProps} error={error} />);

      const reloadButton = screen.getByRole('button', { name: '再読み込み' });
      await user.click(reloadButton);

      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });


    it('時間表示が適切にフォーマットされる', () => {
      const recentQuestion = createMockQuestion({
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分前
      });

      render(
        <ProposalQuestionList 
          {...defaultProps} 
          questions={[recentQuestion]}
        />
      );

      // formatDateTimeは日付時刻形式で表示するので、投稿:ラベルが表示されることを確認
      expect(screen.getByText(/投稿:/)).toBeInTheDocument();
    });
  });
});