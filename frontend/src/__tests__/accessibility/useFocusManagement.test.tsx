import { renderHook, act } from '@testing-library/react';
import { useFocusManagement, useLiveRegion } from '../../hooks/accessibility/useFocusManagement';

// Mock functions
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    display: 'block',
    visibility: 'visible',
    opacity: '1'
  })
});

describe('useFocusManagement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('フォーカスの保存と復元が正しく動作する', () => {
    const { result } = renderHook(() => useFocusManagement());

    // テスト用の要素を作成
    const button = document.createElement('button');
    button.textContent = 'Test Button';
    document.body.appendChild(button);
    button.focus();

    // フォーカスを保存
    act(() => {
      result.current.saveFocus();
    });

    // 他の要素にフォーカス
    const otherButton = document.createElement('button');
    otherButton.textContent = 'Other Button';
    document.body.appendChild(otherButton);
    otherButton.focus();

    expect(document.activeElement).toBe(otherButton);

    // フォーカスを復元
    act(() => {
      result.current.restoreFocus();
    });

    expect(document.activeElement).toBe(button);
  });

  test('最初の要素にフォーカスが正しく動作する', () => {
    const { result } = renderHook(() => useFocusManagement());

    // コンテナとフォーカス可能な要素を作成
    const container = document.createElement('div');
    const button1 = document.createElement('button');
    const button2 = document.createElement('button');
    
    button1.textContent = 'Button 1';
    button2.textContent = 'Button 2';
    button1.tabIndex = 0;
    button2.tabIndex = 0;
    
    // focusメソッドをモック
    const focusSpy = jest.spyOn(button1, 'focus');
    
    container.appendChild(button1);
    container.appendChild(button2);
    document.body.appendChild(container);

    // 最初の要素にフォーカス
    act(() => {
      result.current.focusFirstElement(container);
    });

    expect(focusSpy).toHaveBeenCalled();
  });

  test('最後の要素にフォーカスが正しく動作する', () => {
    const { result } = renderHook(() => useFocusManagement());

    // コンテナとフォーカス可能な要素を作成
    const container = document.createElement('div');
    const button1 = document.createElement('button');
    const button2 = document.createElement('button');
    const button3 = document.createElement('button');
    
    button1.textContent = 'Button 1';
    button2.textContent = 'Button 2';
    button3.textContent = 'Button 3';
    button1.tabIndex = 0;
    button2.tabIndex = 0;
    button3.tabIndex = 0;
    
    // focusメソッドをモック
    const focusSpy = jest.spyOn(button3, 'focus');
    
    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);
    document.body.appendChild(container);

    // 最後の要素にフォーカス
    act(() => {
      result.current.focusLastElement(container);
    });

    expect(focusSpy).toHaveBeenCalled();
  });

  test('フォーカストラップが正しく動作する', () => {
    const { result } = renderHook(() => useFocusManagement());

    // テスト用の要素を作成
    const container = document.createElement('div');
    const firstButton = document.createElement('button');
    const lastButton = document.createElement('button');
    
    firstButton.textContent = 'First';
    lastButton.textContent = 'Last';
    
    container.appendChild(firstButton);
    container.appendChild(lastButton);
    document.body.appendChild(container);

    // フォーカストラップを設定
    act(() => {
      result.current.setFocusTrap(container);
      result.current.activateFocusTrap();
    });

    // 最後の要素からTabキーでフォーカストラップをテスト
    lastButton.focus();
    
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(tabEvent);
    });

    // フォーカストラップを非アクティブ化
    act(() => {
      result.current.deactivateFocusTrap();
    });
  });
});

describe('useLiveRegion', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // ライブリージョンをクリーンアップ
    const liveRegions = document.querySelectorAll('[aria-live]');
    liveRegions.forEach(region => {
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }
    });
  });

  test('ライブリージョンでのアナウンスが正しく動作する', async () => {
    const { result } = renderHook(() => useLiveRegion());

    // アナウンスを実行
    act(() => {
      result.current.announce('テストメッセージ', 'polite');
    });

    // ライブリージョンが作成されることを確認
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion?.textContent).toBe('テストメッセージ');

    // メッセージがクリアされることを確認
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(liveRegion?.textContent).toBe('');
  });

  test('緊急アナウンスが正しく動作する', async () => {
    const { result } = renderHook(() => useLiveRegion());

    // 緊急アナウンスを実行
    act(() => {
      result.current.announce('エラーメッセージ', 'assertive');
    });

    await new Promise(resolve => setTimeout(resolve, 150));
    
    const liveRegion = document.querySelector('[aria-live="assertive"]');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion?.textContent).toBe('エラーメッセージ');
  });

  test('クリーンアップが正しく動作する', () => {
    const { result } = renderHook(() => useLiveRegion());

    // アナウンスを実行してライブリージョンを作成
    act(() => {
      result.current.announce('テストメッセージ');
    });

    // ライブリージョンが存在することを確認
    expect(document.querySelector('[aria-live]')).toBeTruthy();

    // クリーンアップを実行
    act(() => {
      result.current.cleanup();
    });

    // ライブリージョンが削除されることを確認
    expect(document.querySelector('[aria-live]')).toBeNull();
  });

  test('複数のアナウンスが順次処理される', async () => {
    const { result } = renderHook(() => useLiveRegion());

    // 複数のアナウンスを実行
    act(() => {
      result.current.announce('メッセージ1', 'polite');
    });

    await new Promise(resolve => setTimeout(resolve, 150));
    
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toBe('メッセージ1');

    act(() => {
      result.current.announce('メッセージ2', 'polite');
    });

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(liveRegion?.textContent).toBe('メッセージ2');
  });
});