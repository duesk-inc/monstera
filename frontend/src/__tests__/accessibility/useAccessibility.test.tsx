import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { useAccessibility, useAriaAttributes, useKeyboardNavigation } from '../../hooks/accessibility/useAccessibility';

describe('useAccessibility', () => {
  beforeEach(() => {
    // DOM要素をクリア
    document.body.innerHTML = '';
  });

  test('キーボードユーザーを検出する', () => {
    const { result } = renderHook(() => useAccessibility());

    // 初期状態
    expect(result.current.isKeyboardUser).toBe(false);

    // キーボードイベントを発火
    act(() => {
      fireEvent.keyDown(document, { key: 'Tab' });
    });

    expect(result.current.isKeyboardUser).toBe(true);

    // マウスイベントを発火
    act(() => {
      fireEvent.mouseDown(document);
    });

    expect(result.current.isKeyboardUser).toBe(false);
  });

  test('フォーカス管理が正しく動作する', () => {
    const TestComponent = () => {
      const { registerFocusableElements, focusNext, focusPrevious, focusFirst, focusLast } = useAccessibility();

      React.useEffect(() => {
        const elements = [
          document.getElementById('button1'),
          document.getElementById('button2'),
          document.getElementById('button3'),
        ].filter(Boolean) as HTMLElement[];
        registerFocusableElements(elements);
      }, [registerFocusableElements]);

      return (
        <div>
          <button id="button1">Button 1</button>
          <button id="button2">Button 2</button>
          <button id="button3">Button 3</button>
          <button onClick={focusNext}>Next</button>
          <button onClick={focusPrevious}>Previous</button>
          <button onClick={focusFirst}>First</button>
          <button onClick={focusLast}>Last</button>
        </div>
      );
    };

    render(<TestComponent />);

    const button1 = document.getElementById('button1') as HTMLElement;
    const button2 = document.getElementById('button2') as HTMLElement;
    const button3 = document.getElementById('button3') as HTMLElement;
    const nextButton = screen.getByText('Next');
    const previousButton = screen.getByText('Previous');
    const firstButton = screen.getByText('First');
    const lastButton = screen.getByText('Last');

    // 最初の要素にフォーカス
    act(() => {
      fireEvent.click(firstButton);
    });
    expect(document.activeElement).toBe(button1);

    // 次の要素にフォーカス
    act(() => {
      fireEvent.click(nextButton);
    });
    expect(document.activeElement).toBe(button2);

    // 前の要素にフォーカス
    act(() => {
      fireEvent.click(previousButton);
    });
    expect(document.activeElement).toBe(button1);

    // 最後の要素にフォーカス
    act(() => {
      fireEvent.click(lastButton);
    });
    expect(document.activeElement).toBe(button3);
  });
});

describe('useAriaAttributes', () => {
  test('リスト属性を正しく生成する', () => {
    const { result } = renderHook(() => useAriaAttributes());

    const attributes = result.current.getListAttributes(5, 2, 3);
    
    expect(attributes).toEqual({
      role: 'list',
      'aria-label': '職務経歴一覧 5件',
      'aria-live': 'polite',
      'aria-atomic': 'false',
      'aria-describedby': 'pagination-info-2-3',
    });
  });

  test('リストアイテム属性を正しく生成する', () => {
    const { result } = renderHook(() => useAriaAttributes());

    const attributes = result.current.getListItemAttributes(0, 5, 'test-id', 'Test Project');
    
    expect(attributes).toEqual({
      role: 'listitem',
      'aria-setsize': 5,
      'aria-posinset': 1,
      'aria-labelledby': 'work-history-title-test-id',
      'aria-describedby': 'work-history-details-test-id',
      'aria-label': '職務経歴 1件目: Test Project',
    });
  });

  test('ボタン属性を正しく生成する', () => {
    const { result } = renderHook(() => useAriaAttributes());

    const attributes = result.current.getButtonAttributes('編集', 'Test Project', false, true);
    
    expect(attributes).toEqual({
      'aria-label': 'Test Projectの編集',
      'aria-pressed': false,
      'aria-haspopup': 'true',
    });
  });

  test('フォームフィールド属性を正しく生成する', () => {
    const { result } = renderHook(() => useAriaAttributes());

    const attributes = result.current.getFormFieldAttributes(
      'projectName',
      true,
      true,
      'プロジェクト名は必須です',
      'プロジェクトの正式名称を入力してください'
    );
    
    expect(attributes).toEqual({
      id: 'field-projectName',
      'aria-required': true,
      'aria-invalid': true,
      'aria-describedby': 'field-projectName-error field-projectName-help',
    });
  });

  test('ステータス属性を正しく生成する', () => {
    const { result } = renderHook(() => useAriaAttributes());

    // ローディング状態
    const loadingAttributes = result.current.getStatusAttributes('loading', 'データを読み込み中');
    expect(loadingAttributes).toEqual({
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
      'aria-label': 'データを読み込み中',
    });

    // エラー状態
    const errorAttributes = result.current.getStatusAttributes('error', 'エラーが発生しました');
    expect(errorAttributes).toEqual({
      role: 'alert',
      'aria-live': 'assertive',
      'aria-atomic': 'true',
      'aria-label': 'エラーが発生しました',
    });
  });
});

describe('useKeyboardNavigation', () => {
  test('矢印キーナビゲーションが正しく動作する', () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    const mockOnNext = jest.fn();
    const mockOnPrevious = jest.fn();
    const mockOnFirst = jest.fn();
    const mockOnLast = jest.fn();

    const mockEvent = {
      key: 'ArrowDown',
      preventDefault: jest.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleArrowNavigation(mockEvent, mockOnNext, mockOnPrevious, mockOnFirst, mockOnLast);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnNext).toHaveBeenCalled();

    // ArrowUp
    const upEvent = {
      key: 'ArrowUp',
      preventDefault: jest.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleArrowNavigation(upEvent, mockOnNext, mockOnPrevious, mockOnFirst, mockOnLast);
    });

    expect(upEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnPrevious).toHaveBeenCalled();

    // Home
    const homeEvent = {
      key: 'Home',
      preventDefault: jest.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleArrowNavigation(homeEvent, mockOnNext, mockOnPrevious, mockOnFirst, mockOnLast);
    });

    expect(homeEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnFirst).toHaveBeenCalled();

    // End
    const endEvent = {
      key: 'End',
      preventDefault: jest.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleArrowNavigation(endEvent, mockOnNext, mockOnPrevious, mockOnFirst, mockOnLast);
    });

    expect(endEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnLast).toHaveBeenCalled();
  });

  test('アクションキーが正しく動作する', () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    const mockOnAction = jest.fn();

    // Enter キー
    const enterEvent = {
      key: 'Enter',
      preventDefault: jest.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleActionKeys(enterEvent, mockOnAction);
    });

    expect(enterEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnAction).toHaveBeenCalled();

    // Space キー
    const spaceEvent = {
      key: ' ',
      preventDefault: jest.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleActionKeys(spaceEvent, mockOnAction);
    });

    expect(spaceEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnAction).toHaveBeenCalledTimes(2);
  });

  test('Escapeキーが正しく動作する', () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    const mockOnEscape = jest.fn();

    const escapeEvent = {
      key: 'Escape',
      preventDefault: jest.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleEscapeKey(escapeEvent, mockOnEscape);
    });

    expect(escapeEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnEscape).toHaveBeenCalled();
  });
});