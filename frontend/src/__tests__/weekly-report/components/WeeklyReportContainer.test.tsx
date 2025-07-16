// WeeklyReportContainerコンポーネントのテスト

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeeklyReportContainer from '@/components/features/weeklyReport/WeeklyReportContainer';
import { customRender } from '../utils';

// モックの設定
jest.mock('@/components/features/weeklyReport/MoodSelector', () => {
  return function MoodSelector({ 
    selectedMood, 
    onMoodChange, 
    isDisabled,
    ...props 
  }: any) {
    return (
      <div data-testid="mood-selector" {...props}>
        {[1, 2, 3, 4, 5].map(mood => (
          <button
            key={mood}
            data-testid={`mood-${mood}`}
            onClick={() => !isDisabled && onMoodChange && onMoodChange(mood)}
            disabled={isDisabled}
            className={selectedMood === mood ? 'selected' : ''}
          >
            {mood === 1 && 'サイテー'}
            {mood === 2 && 'イマイチ'}
            {mood === 3 && 'ふつう'}
            {mood === 4 && 'よい'}
            {mood === 5 && 'サイコー'}
          </button>
        ))}
      </div>
    );
  };
});

jest.mock('@/components/features/weeklyReport/WeeklySummary', () => {
  return function WeeklySummary({ 
    value, 
    onChange, 
    isDisabled,
    error,
    maxLength = 1000,
    ...props 
  }: any) {
    return (
      <div data-testid="weekly-summary" {...props}>
        <textarea
          data-testid="weekly-remarks-textarea"
          value={value || ''}
          onChange={(e) => !isDisabled && onChange && onChange(e.target.value)}
          disabled={isDisabled}
          placeholder="今週の業務を振り返って..."
          maxLength={maxLength}
        />
        <div data-testid="character-count">
          {(value || '').length}/{maxLength}
        </div>
        {error && (
          <div data-testid="weekly-remarks-error" role="alert">
            {error}
          </div>
        )}
      </div>
    );
  };
});

jest.mock('@/components/common/ActionButton', () => {
  return function ActionButton({ 
    children, 
    onClick, 
    disabled, 
    loading,
    buttonType,
    icon,
    ...props 
  }: any) {
    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        data-testid={`action-button-${children.toLowerCase().replace(/\s+/g, '-').replace('する', '')}`}
        data-button-type={buttonType}
        {...props}
      >
        {loading && <span data-testid="loading-spinner">Loading...</span>}
        {icon && <span data-testid="button-icon">{icon}</span>}
        {children}
      </button>
    );
  };
});

describe('WeeklyReportContainer', () => {
  // デフォルトのプロップス
  const defaultProps = {
    mood: null as any,
    weeklyRemarks: '',
    weeklyRemarksError: undefined,
    isSubmitted: false,
    loading: false,
    onMoodChange: jest.fn(),
    onWeeklyRemarksChange: jest.fn(),
    onSave: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    test('コンポーネントが正しくレンダリングされる', () => {
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      expect(screen.getByTestId('mood-selector')).toBeInTheDocument();
      expect(screen.getByTestId('weekly-summary')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-下書き保存')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-提出')).toBeInTheDocument();
    });

    test('Paperコンポーネントでラップされている', () => {
      const { container } = customRender(<WeeklyReportContainer {...defaultProps} />);
      
      const paper = container.querySelector('.MuiPaper-root');
      expect(paper).toBeInTheDocument();
    });

    test('セクション間に区切り線が表示される', () => {
      const { container } = customRender(<WeeklyReportContainer {...defaultProps} />);
      
      const dividers = container.querySelectorAll('.MuiDivider-root');
      expect(dividers.length).toBeGreaterThan(0);
    });
  });

  describe('ムード選択', () => {
    test('ムード選択コンポーネントが表示される', () => {
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      expect(screen.getByTestId('mood-selector')).toBeInTheDocument();
      
      // 5つのムードオプションが表示される
      expect(screen.getByTestId('mood-1')).toHaveTextContent('サイテー');
      expect(screen.getByTestId('mood-2')).toHaveTextContent('イマイチ');
      expect(screen.getByTestId('mood-3')).toHaveTextContent('ふつう');
      expect(screen.getByTestId('mood-4')).toHaveTextContent('よい');
      expect(screen.getByTestId('mood-5')).toHaveTextContent('サイコー');
    });

    test('選択されたムードがハイライトされる', () => {
      customRender(
        <WeeklyReportContainer 
          {...defaultProps} 
          mood={3}
        />
      );
      
      const selectedMood = screen.getByTestId('mood-3');
      expect(selectedMood).toHaveClass('selected');
      
      // 他のムードは選択されていない
      expect(screen.getByTestId('mood-1')).not.toHaveClass('selected');
      expect(screen.getByTestId('mood-2')).not.toHaveClass('selected');
      expect(screen.getByTestId('mood-4')).not.toHaveClass('selected');
      expect(screen.getByTestId('mood-5')).not.toHaveClass('selected');
    });

    test('ムード選択でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      const moodButton = screen.getByTestId('mood-4');
      await user.click(moodButton);
      
      expect(defaultProps.onMoodChange).toHaveBeenCalledWith(4);
      expect(defaultProps.onMoodChange).toHaveBeenCalledTimes(1);
    });

    test('提出済みの場合、ムード選択が無効化される', async () => {
      const user = userEvent.setup();
      customRender(
        <WeeklyReportContainer 
          {...defaultProps} 
          isSubmitted={true}
        />
      );
      
      const moodButton = screen.getByTestId('mood-3');
      expect(moodButton).toBeDisabled();
      
      await user.click(moodButton);
      expect(defaultProps.onMoodChange).not.toHaveBeenCalled();
    });
  });

  describe('週次所感入力', () => {
    test('週次所感入力エリアが表示される', () => {
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      expect(screen.getByTestId('weekly-summary')).toBeInTheDocument();
      expect(screen.getByTestId('weekly-remarks-textarea')).toBeInTheDocument();
      expect(screen.getByTestId('character-count')).toBeInTheDocument();
    });

    test('初期値が正しく表示される', () => {
      const initialRemarks = 'テスト用の週次所感です。';
      customRender(
        <WeeklyReportContainer 
          {...defaultProps} 
          weeklyRemarks={initialRemarks}
        />
      );
      
      const textarea = screen.getByTestId('weekly-remarks-textarea');
      expect(textarea).toHaveValue(initialRemarks);
      
      const charCount = screen.getByTestId('character-count');
      expect(charCount).toHaveTextContent(`${initialRemarks.length}/1000`);
    });

    test('テキスト入力でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      const textarea = screen.getByTestId('weekly-remarks-textarea');
      const testText = '今週は新機能の開発を行いました。';
      
      await user.type(textarea, testText);
      
      expect(defaultProps.onWeeklyRemarksChange).toHaveBeenCalled();
    });

    test('エラーメッセージが表示される', () => {
      const errorMessage = '週次所感は必須項目です。';
      customRender(
        <WeeklyReportContainer 
          {...defaultProps} 
          weeklyRemarksError={errorMessage}
        />
      );
      
      const errorElement = screen.getByTestId('weekly-remarks-error');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent(errorMessage);
      expect(errorElement).toHaveAttribute('role', 'alert');
    });

    test('提出済みの場合、入力エリアが無効化される', () => {
      customRender(
        <WeeklyReportContainer 
          {...defaultProps} 
          isSubmitted={true}
        />
      );
      
      const textarea = screen.getByTestId('weekly-remarks-textarea');
      expect(textarea).toBeDisabled();
    });

    test('文字数制限が適用される', () => {
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      const textarea = screen.getByTestId('weekly-remarks-textarea');
      expect(textarea).toHaveAttribute('maxLength', '1000');
    });
  });

  describe('アクションボタン', () => {
    test('下書き保存ボタンが表示される', () => {
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      const saveButton = screen.getByTestId('action-button-下書き保存');
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toHaveAttribute('data-button-type', 'save');
    });

    test('提出ボタンが表示される', () => {
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      const submitButton = screen.getByTestId('action-button-提出');
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('data-button-type', 'submit');
    });

    test('下書き保存ボタンクリックでハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      const saveButton = screen.getByTestId('action-button-下書き保存');
      await user.click(saveButton);
      
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    });

    test('提出ボタンクリックでハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      const submitButton = screen.getByTestId('action-button-提出');
      await user.click(submitButton);
      
      expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
    });

    test('提出済みの場合、アクションボタンが無効化される', () => {
      customRender(
        <WeeklyReportContainer 
          {...defaultProps} 
          isSubmitted={true}
        />
      );
      
      const saveButton = screen.getByTestId('action-button-下書き保存');
      const submitButton = screen.getByTestId('action-button-提出');
      
      expect(saveButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    test('ローディング中はボタンが無効化される', () => {
      customRender(
        <WeeklyReportContainer 
          {...defaultProps} 
          loading={true}
        />
      );
      
      const saveButton = screen.getByTestId('action-button-下書き保存');
      const submitButton = screen.getByTestId('action-button-提出');
      
      expect(saveButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    test('ボタンにアイコンが表示される', () => {
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      const icons = screen.getAllByTestId('button-icon');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('レスポンシブ対応', () => {
    test('モバイル表示でも適切にレイアウトされる', () => {
      // モバイルビューポートのシミュレーション
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      // モバイルでもボタンが表示される
      expect(screen.getByTestId('action-button-下書き保存')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-提出')).toBeInTheDocument();
    });
  });

  describe('統合テスト', () => {
    test('完全な入力フローが動作する', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      // ムード選択
      const moodButton = screen.getByTestId('mood-4');
      await user.click(moodButton);
      expect(defaultProps.onMoodChange).toHaveBeenCalledWith(4);
      
      // 週次所感入力
      const textarea = screen.getByTestId('weekly-remarks-textarea');
      await user.type(textarea, '今週は順調に進展しました。');
      expect(defaultProps.onWeeklyRemarksChange).toHaveBeenCalled();
      
      // 保存
      const saveButton = screen.getByTestId('action-button-下書き保存');
      await user.click(saveButton);
      expect(defaultProps.onSave).toHaveBeenCalled();
    });

    test('エラー状態でも適切に表示される', () => {
      customRender(
        <WeeklyReportContainer 
          {...defaultProps} 
          mood={2}
          weeklyRemarks="短い所感"
          weeklyRemarksError="もう少し詳しく記入してください。"
        />
      );
      
      // 選択されたムード
      expect(screen.getByTestId('mood-2')).toHaveClass('selected');
      
      // 入力された所感
      expect(screen.getByTestId('weekly-remarks-textarea')).toHaveValue('短い所感');
      
      // エラーメッセージ
      expect(screen.getByTestId('weekly-remarks-error')).toHaveTextContent('もう少し詳しく記入してください。');
      
      // ボタンは有効（エラーがあっても保存可能）
      expect(screen.getByTestId('action-button-下書き保存')).not.toBeDisabled();
      expect(screen.getByTestId('action-button-提出')).not.toBeDisabled();
    });
  });

  describe('アクセシビリティ', () => {
    test('適切なARIA属性が設定されている', () => {
      customRender(
        <WeeklyReportContainer 
          {...defaultProps} 
          weeklyRemarksError="エラーメッセージ"
        />
      );
      
      const errorElement = screen.getByTestId('weekly-remarks-error');
      expect(errorElement).toHaveAttribute('role', 'alert');
    });

    test('ボタンが適切にラベル付けされている', () => {
      customRender(<WeeklyReportContainer {...defaultProps} />);
      
      const saveButton = screen.getByTestId('action-button-下書き保存');
      const submitButton = screen.getByTestId('action-button-提出');
      
      expect(saveButton).toHaveTextContent('下書き保存');
      expect(submitButton).toHaveTextContent('提出');
    });

    test('フォーム要素が適切に無効化される', () => {
      customRender(
        <WeeklyReportContainer 
          {...defaultProps} 
          isSubmitted={true}
        />
      );
      
      // 全てのムードボタンが無効化
      [1, 2, 3, 4, 5].forEach(mood => {
        expect(screen.getByTestId(`mood-${mood}`)).toBeDisabled();
      });
      
      // テキストエリアが無効化
      expect(screen.getByTestId('weekly-remarks-textarea')).toBeDisabled();
      
      // アクションボタンが無効化
      expect(screen.getByTestId('action-button-下書き保存')).toBeDisabled();
      expect(screen.getByTestId('action-button-提出')).toBeDisabled();
    });
  });

  describe('エッジケース', () => {
    test('null値でもエラーなく表示される', () => {
      const nullProps = {
        ...defaultProps,
        mood: null,
        weeklyRemarks: '',
        weeklyRemarksError: undefined,
      };
      
      expect(() => {
        customRender(<WeeklyReportContainer {...nullProps} />);
      }).not.toThrow();
      
      // 文字数カウントが正しく表示される
      expect(screen.getByTestId('character-count')).toHaveTextContent('0/1000');
    });

    test('最大文字数の所感でも正しく表示される', () => {
      const longRemarks = 'あ'.repeat(1000);
      customRender(
        <WeeklyReportContainer 
          {...defaultProps} 
          weeklyRemarks={longRemarks}
        />
      );
      
      expect(screen.getByTestId('weekly-remarks-textarea')).toHaveValue(longRemarks);
      expect(screen.getByTestId('character-count')).toHaveTextContent('1000/1000');
    });

    test('不正なムード値でもクラッシュしない', () => {
      expect(() => {
        customRender(
          <WeeklyReportContainer 
            {...defaultProps} 
            mood={10 as any} // 不正な値
          />
        );
      }).not.toThrow();
    });
  });
});