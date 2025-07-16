import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * アクセシビリティ用のユーティリティフック
 */
export const useAccessibility = () => {
  // フォーカス管理用の参照
  const focusableElementsRef = useRef<HTMLElement[]>([]);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(-1);
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  /**
   * キーボードユーザーを検出
   */
  useEffect(() => {
    const handleKeyDown = () => {
      setIsKeyboardUser(true);
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  /**
   * フォーカス可能な要素を登録
   */
  const registerFocusableElements = useCallback((elements: HTMLElement[]) => {
    focusableElementsRef.current = elements;
  }, []);

  /**
   * 次の要素にフォーカス
   */
  const focusNext = useCallback(() => {
    const elements = focusableElementsRef.current;
    if (elements.length === 0) return;

    const nextIndex = (currentFocusIndex + 1) % elements.length;
    elements[nextIndex]?.focus();
    setCurrentFocusIndex(nextIndex);
  }, [currentFocusIndex]);

  /**
   * 前の要素にフォーカス
   */
  const focusPrevious = useCallback(() => {
    const elements = focusableElementsRef.current;
    if (elements.length === 0) return;

    const prevIndex = currentFocusIndex <= 0 ? elements.length - 1 : currentFocusIndex - 1;
    elements[prevIndex]?.focus();
    setCurrentFocusIndex(prevIndex);
  }, [currentFocusIndex]);

  /**
   * 最初の要素にフォーカス
   */
  const focusFirst = useCallback(() => {
    const elements = focusableElementsRef.current;
    if (elements.length === 0) return;

    elements[0]?.focus();
    setCurrentFocusIndex(0);
  }, []);

  /**
   * 最後の要素にフォーカス
   */
  const focusLast = useCallback(() => {
    const elements = focusableElementsRef.current;
    if (elements.length === 0) return;

    const lastIndex = elements.length - 1;
    elements[lastIndex]?.focus();
    setCurrentFocusIndex(lastIndex);
  }, []);

  /**
   * 要素にフォーカス
   */
  const focusElement = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    
    element.focus();
    const index = focusableElementsRef.current.indexOf(element);
    if (index >= 0) {
      setCurrentFocusIndex(index);
    }
  }, []);

  return {
    isKeyboardUser,
    registerFocusableElements,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    focusElement,
    currentFocusIndex,
  };
};

/**
 * ARIA属性を生成するフック
 */
export const useAriaAttributes = () => {
  /**
   * リストのARIA属性を生成
   */
  const getListAttributes = useCallback((
    totalItems: number,
    currentPage?: number,
    totalPages?: number
  ) => ({
    role: 'list',
    'aria-label': `職務経歴一覧 ${totalItems}件`,
    'aria-live': 'polite',
    'aria-atomic': 'false',
    ...(currentPage && totalPages && {
      'aria-describedby': `pagination-info-${currentPage}-${totalPages}`,
    }),
  }), []);

  /**
   * リストアイテムのARIA属性を生成
   */
  const getListItemAttributes = useCallback((
    index: number,
    total: number,
    itemId: string,
    projectName?: string
  ) => ({
    role: 'listitem',
    'aria-setsize': total,
    'aria-posinset': index + 1,
    'aria-labelledby': `work-history-title-${itemId}`,
    'aria-describedby': `work-history-details-${itemId}`,
    ...(projectName && {
      'aria-label': `職務経歴 ${index + 1}件目: ${projectName}`,
    }),
  }), []);

  /**
   * ボタンのARIA属性を生成
   */
  const getButtonAttributes = useCallback((
    action: string,
    itemName?: string,
    isPressed?: boolean,
    hasPopup?: boolean
  ) => ({
    'aria-label': itemName ? `${itemName}の${action}` : action,
    ...(isPressed !== undefined && { 'aria-pressed': isPressed }),
    ...(hasPopup && { 'aria-haspopup': 'true' }),
  }), []);

  /**
   * フォームフィールドのARIA属性を生成
   */
  const getFormFieldAttributes = useCallback((
    fieldName: string,
    isRequired?: boolean,
    hasError?: boolean,
    errorMessage?: string,
    helpText?: string
  ) => {
    const fieldId = `field-${fieldName}`;
    const errorId = `${fieldId}-error`;
    const helpId = `${fieldId}-help`;

    return {
      id: fieldId,
      'aria-required': isRequired,
      'aria-invalid': hasError,
      'aria-describedby': [
        hasError && errorId,
        helpText && helpId,
      ].filter(Boolean).join(' ') || undefined,
    };
  }, []);

  /**
   * ステータスメッセージのARIA属性を生成
   */
  const getStatusAttributes = useCallback((
    status: 'loading' | 'success' | 'error',
    message?: string
  ) => ({
    role: status === 'loading' ? 'status' : 'alert',
    'aria-live': status === 'loading' ? 'polite' : 'assertive',
    'aria-atomic': 'true',
    ...(message && { 'aria-label': message }),
  }), []);

  return {
    getListAttributes,
    getListItemAttributes,
    getButtonAttributes,
    getFormFieldAttributes,
    getStatusAttributes,
  };
};

/**
 * キーボードイベントハンドリングフック
 */
export const useKeyboardNavigation = () => {
  /**
   * 矢印キーナビゲーション
   */
  const handleArrowNavigation = useCallback((
    event: React.KeyboardEvent,
    onNext: () => void,
    onPrevious: () => void,
    onFirst?: () => void,
    onLast?: () => void
  ) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        onNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        onPrevious();
        break;
      case 'Home':
        if (onFirst) {
          event.preventDefault();
          onFirst();
        }
        break;
      case 'End':
        if (onLast) {
          event.preventDefault();
          onLast();
        }
        break;
    }
  }, []);

  /**
   * Tab/Shift+Tabナビゲーション
   */
  const handleTabNavigation = useCallback((
    event: React.KeyboardEvent,
    onNext: () => void,
    onPrevious: () => void
  ) => {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        event.preventDefault();
        onPrevious();
      } else {
        event.preventDefault();
        onNext();
      }
    }
  }, []);

  /**
   * Enter/Spaceキーでのアクション実行
   */
  const handleActionKeys = useCallback((
    event: React.KeyboardEvent,
    onAction: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onAction();
    }
  }, []);

  /**
   * Escapeキーでの終了
   */
  const handleEscapeKey = useCallback((
    event: React.KeyboardEvent,
    onEscape: () => void
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onEscape();
    }
  }, []);

  return {
    handleArrowNavigation,
    handleTabNavigation,
    handleActionKeys,
    handleEscapeKey,
  };
};