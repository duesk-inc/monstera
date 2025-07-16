/**
 * アクセシビリティ関連のユーティリティ関数
 */

/**
 * アクセシビリティテストのヘルパー関数
 */
export class AccessibilityTester {
  /**
   * フォーカス可能な要素をチェック
   */
  static checkFocusableElements(container: HTMLElement): {
    focusableElements: HTMLElement[];
    issues: string[];
  } {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ];

    const focusableElements = Array.from(
      container.querySelectorAll(focusableSelectors.join(', '))
    ) as HTMLElement[];

    const issues: string[] = [];

    focusableElements.forEach((element, index) => {
      // tabindexの検証
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex && parseInt(tabIndex) > 0) {
        issues.push(`Element ${index + 1} has positive tabindex (${tabIndex}), which can cause focus order issues`);
      }

      // aria-labelまたはvisible textの検証
      const hasLabel = element.getAttribute('aria-label') ||
                       element.getAttribute('aria-labelledby') ||
                       element.textContent?.trim() ||
                       (element as HTMLInputElement).placeholder;
      
      if (!hasLabel) {
        issues.push(`Element ${index + 1} (${element.tagName}) lacks accessible name`);
      }

      // 最小タッチターゲットサイズの検証
      const rect = element.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        issues.push(`Element ${index + 1} is smaller than recommended touch target size (44x44px)`);
      }
    });

    return { focusableElements, issues };
  }

  /**
   * ARIA属性をチェック
   */
  static checkAriaAttributes(container: HTMLElement): string[] {
    const issues: string[] = [];
    const elements = container.querySelectorAll('*');

    elements.forEach((element, index) => {
      // aria-labelledbyの参照先チェック
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const referenced = document.getElementById(labelledBy);
        if (!referenced) {
          issues.push(`Element ${index + 1} references non-existent ID in aria-labelledby: ${labelledBy}`);
        }
      }

      // aria-describedbyの参照先チェック
      const describedBy = element.getAttribute('aria-describedby');
      if (describedBy) {
        const referenced = document.getElementById(describedBy);
        if (!referenced) {
          issues.push(`Element ${index + 1} references non-existent ID in aria-describedby: ${describedBy}`);
        }
      }

      // 無効なaria-expanded
      const expanded = element.getAttribute('aria-expanded');
      if (expanded && !['true', 'false'].includes(expanded)) {
        issues.push(`Element ${index + 1} has invalid aria-expanded value: ${expanded}`);
      }

      // roleの検証
      const role = element.getAttribute('role');
      if (role) {
        const validRoles = [
          'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
          'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
          'contentinfo', 'dialog', 'document', 'feed', 'figure', 'form',
          'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list',
          'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu',
          'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation',
          'none', 'note', 'option', 'presentation', 'progressbar', 'radio',
          'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar',
          'search', 'searchbox', 'separator', 'slider', 'spinbutton', 'status',
          'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox',
          'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
        ];
        
        if (!validRoles.includes(role)) {
          issues.push(`Element ${index + 1} has invalid role: ${role}`);
        }
      }
    });

    return issues;
  }

  /**
   * 色のコントラストをチェック（簡易版）
   */
  static checkColorContrast(element: HTMLElement): {
    ratio: number;
    passes: boolean;
    level: 'AA' | 'AAA' | 'fail';
  } {
    const styles = window.getComputedStyle(element);
    const backgroundColor = styles.backgroundColor;
    const color = styles.color;
    const fontSize = parseFloat(styles.fontSize);
    
    // RGB値を抽出（簡易実装）
    const bgRgb = this.parseRgb(backgroundColor);
    const textRgb = this.parseRgb(color);
    
    if (!bgRgb || !textRgb) {
      return { ratio: 0, passes: false, level: 'fail' };
    }
    
    const ratio = this.calculateContrastRatio(bgRgb, textRgb);
    
    // WCAG基準
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && styles.fontWeight === 'bold');
    const aaThreshold = isLargeText ? 3 : 4.5;
    const aaaThreshold = isLargeText ? 4.5 : 7;
    
    let level: 'AA' | 'AAA' | 'fail' = 'fail';
    if (ratio >= aaaThreshold) {
      level = 'AAA';
    } else if (ratio >= aaThreshold) {
      level = 'AA';
    }
    
    return {
      ratio,
      passes: ratio >= aaThreshold,
      level
    };
  }

  /**
   * RGB文字列をパース
   */
  private static parseRgb(rgbString: string): [number, number, number] | null {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return null;
    
    return [
      parseInt(match[1]),
      parseInt(match[2]),
      parseInt(match[3])
    ];
  }

  /**
   * コントラスト比を計算
   */
  private static calculateContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
    const luminance1 = this.relativeLuminance(rgb1);
    const luminance2 = this.relativeLuminance(rgb2);
    
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * 相対輝度を計算
   */
  private static relativeLuminance([r, g, b]: [number, number, number]): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
}

/**
 * アクセシビリティ設定管理
 */
export class AccessibilitySettings {
  private static readonly STORAGE_KEY = 'accessibility-settings';

  static getSettings(): {
    enhancedMode: boolean;
    reduceMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
    announcements: boolean;
  } {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return { ...this.getDefaults(), ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load accessibility settings:', error);
    }
    
    return this.getDefaults();
  }

  static saveSettings(settings: Partial<ReturnType<typeof AccessibilitySettings.getSettings>>): void {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      
      // CSS変数で設定を反映
      this.applyCssSettings(updated);
    } catch (error) {
      console.warn('Failed to save accessibility settings:', error);
    }
  }

  private static getDefaults() {
    return {
      enhancedMode: false,
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      largeText: false,
      announcements: true,
    };
  }

  private static applyCssSettings(settings: ReturnType<typeof AccessibilitySettings.getSettings>): void {
    const root = document.documentElement;
    
    // 設定に応じてCSS変数を設定
    root.style.setProperty('--a11y-enhanced', settings.enhancedMode ? '1' : '0');
    root.style.setProperty('--a11y-reduced-motion', settings.reduceMotion ? '1' : '0');
    root.style.setProperty('--a11y-high-contrast', settings.highContrast ? '1' : '0');
    root.style.setProperty('--a11y-large-text', settings.largeText ? '1.2' : '1');
    
    // bodyにクラスを追加/削除
    document.body.classList.toggle('accessibility-enhanced', settings.enhancedMode);
    document.body.classList.toggle('reduce-motion', settings.reduceMotion);
    document.body.classList.toggle('high-contrast', settings.highContrast);
    document.body.classList.toggle('large-text', settings.largeText);
  }

  static initialize(): void {
    const settings = this.getSettings();
    this.applyCssSettings(settings);
    
    // メディアクエリの変更を監視
    const reduceMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastMQ = window.matchMedia('(prefers-contrast: high)');
    
    reduceMotionMQ.addEventListener('change', (e) => {
      this.saveSettings({ reduceMotion: e.matches });
    });
    
    highContrastMQ.addEventListener('change', (e) => {
      this.saveSettings({ highContrast: e.matches });
    });
  }
}

/**
 * スクリーンリーダー検出
 */
export function detectScreenReader(): boolean {
  // スクリーンリーダーの検出は困難だが、いくつかのヒューリスティックを使用
  
  // User Agent文字列チェック
  const userAgent = navigator.userAgent.toLowerCase();
  const screenReaderUAs = [
    'nvda', 'jaws', 'dragon', 'zoomtext', 'fusion', 'hal', 'supernova',
    'cobra', 'thunder', 'speakout', 'voiceover', 'talkback'
  ];
  
  if (screenReaderUAs.some(sr => userAgent.includes(sr))) {
    return true;
  }
  
  // Speech Synthesis API の使用状況
  if ('speechSynthesis' in window && speechSynthesis.getVoices().length > 0) {
    return true;
  }
  
  // Reduced motionの設定
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return true;
  }
  
  return false;
}

/**
 * フォーカス管理ヘルパー
 */
export class FocusManager {
  private static focusHistory: HTMLElement[] = [];
  
  static saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusHistory.push(activeElement);
    }
  }
  
  static restoreFocus(): boolean {
    const lastFocused = this.focusHistory.pop();
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
      return true;
    }
    return false;
  }
  
  static clearHistory(): void {
    this.focusHistory = [];
  }
}

/**
 * キーボードトラップ管理
 */
export class TrapFocus {
  private element: HTMLElement;
  private originalTabIndex: Map<HTMLElement, string> = new Map();
  
  constructor(element: HTMLElement) {
    this.element = element;
  }
  
  activate(): void {
    // 外部の要素のtabindexを無効化
    const allElements = document.querySelectorAll('*');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (!this.element.contains(htmlEl) && htmlEl.tabIndex >= 0) {
        this.originalTabIndex.set(htmlEl, htmlEl.getAttribute('tabindex') || '');
        htmlEl.tabIndex = -1;
      }
    });
    
    // 最初のフォーカス可能要素にフォーカス
    const focusable = this.getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }
  
  deactivate(): void {
    // 元のtabindexを復元
    this.originalTabIndex.forEach((originalValue, element) => {
      if (originalValue) {
        element.setAttribute('tabindex', originalValue);
      } else {
        element.removeAttribute('tabindex');
      }
    });
    this.originalTabIndex.clear();
  }
  
  private getFocusableElements(): HTMLElement[] {
    const selectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ];
    
    return Array.from(this.element.querySelectorAll(selectors.join(', '))) as HTMLElement[];
  }
}