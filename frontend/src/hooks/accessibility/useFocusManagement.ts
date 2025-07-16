import { useCallback, useEffect, useRef } from 'react';

/**
 * フォーカス管理フック
 */
export const useFocusManagement = () => {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const focusTrapRef = useRef<HTMLElement | null>(null);

  /**
   * 現在のアクティブ要素を保存
   */
  const saveFocus = useCallback(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement;
  }, []);

  /**
   * 保存されたフォーカスを復元
   */
  const restoreFocus = useCallback(() => {
    if (previousActiveElementRef.current) {
      // 要素がまだDOMに存在するかチェック
      if (document.contains(previousActiveElementRef.current)) {
        previousActiveElementRef.current.focus();
      }
      previousActiveElementRef.current = null;
    }
  }, []);

  /**
   * 要素内の最初のフォーカス可能な要素にフォーカス
   */
  const focusFirstElement = useCallback((container: HTMLElement | null) => {
    if (!container) return;

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, []);

  /**
   * 要素内の最後のフォーカス可能な要素にフォーカス
   */
  const focusLastElement = useCallback((container: HTMLElement | null) => {
    if (!container) return;

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, []);

  /**
   * フォーカストラップを設定
   */
  const setFocusTrap = useCallback((element: HTMLElement | null) => {
    focusTrapRef.current = element;
  }, []);

  /**
   * フォーカストラップイベントハンドラー
   */
  const handleFocusTrap = useCallback((event: KeyboardEvent) => {
    if (!focusTrapRef.current || event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(focusTrapRef.current);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  /**
   * フォーカストラップをアクティブ化
   */
  const activateFocusTrap = useCallback(() => {
    document.addEventListener('keydown', handleFocusTrap);
  }, [handleFocusTrap]);

  /**
   * フォーカストラップを非アクティブ化
   */
  const deactivateFocusTrap = useCallback(() => {
    document.removeEventListener('keydown', handleFocusTrap);
  }, [handleFocusTrap]);

  /**
   * コンポーネントのアンマウント時にフォーカストラップを解除
   */
  useEffect(() => {
    return () => {
      deactivateFocusTrap();
    };
  }, [deactivateFocusTrap]);

  return {
    saveFocus,
    restoreFocus,
    focusFirstElement,
    focusLastElement,
    setFocusTrap,
    activateFocusTrap,
    deactivateFocusTrap,
  };
};

/**
 * フォーカス可能な要素を取得
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  const elements = container.querySelectorAll(focusableSelectors);
  return Array.from(elements).filter(
    (element) => isVisible(element as HTMLElement)
  ) as HTMLElement[];
}

/**
 * 要素が表示されているかチェック
 */
function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

/**
 * ライブリージョン管理フック
 */
export const useLiveRegion = () => {
  const liveRegionRef = useRef<HTMLElement | null>(null);

  /**
   * ライブリージョンにメッセージを追加
   */
  const announce = useCallback((
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    if (!liveRegionRef.current) {
      // ライブリージョンが存在しない場合は作成
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only'; // スクリーンリーダー専用クラス
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    // メッセージを設定（小さな遅延を入れてスクリーンリーダーが確実に読み上げるようにする）
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = message;
      }
    }, 100);

    // 少し後にメッセージをクリア
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  /**
   * ライブリージョンをクリーンアップ
   */
  const cleanup = useCallback(() => {
    if (liveRegionRef.current && liveRegionRef.current.parentNode) {
      liveRegionRef.current.parentNode.removeChild(liveRegionRef.current);
      liveRegionRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    announce,
    cleanup,
  };
};