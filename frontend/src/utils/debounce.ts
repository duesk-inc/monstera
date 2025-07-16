/**
 * デバウンスユーティリティ
 * 連続的な関数呼び出しを制御し、最後の呼び出しから指定時間後に実行
 */

/**
 * 関数をデバウンスする
 * @param func デバウンスする関数
 * @param wait 待機時間（ミリ秒）
 * @param options オプション設定
 * @returns デバウンスされた関数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;
  let lastCallTime: number | null = null;
  let lastThis: any;
  let lastArgs: Parameters<T> | null = null;
  let result: ReturnType<T> | undefined;

  const { leading = false, trailing = true, maxWait } = options;

  const invokeFunc = (time: number) => {
    const args = lastArgs!;
    const thisArg = lastThis;

    lastArgs = lastThis = null;
    lastCallTime = time;
    result = func.apply(thisArg, args);
    return result;
  };

  const leadingEdge = (time: number) => {
    lastCallTime = time;
    timeout = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  };

  const remainingWait = (time: number) => {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeWaiting = wait - timeSinceLastCall;

    if (maxWait !== undefined) {
      const timeSinceFirstCall = time - (lastCallTime || 0);
      return Math.min(timeWaiting, maxWait - timeSinceFirstCall);
    }

    return timeWaiting;
  };

  const shouldInvoke = (time: number) => {
    return (
      lastCallTime === null ||
      time - lastCallTime >= wait ||
      (maxWait !== undefined && time - lastCallTime >= maxWait)
    );
  };

  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeout = setTimeout(timerExpired, remainingWait(time));
  };

  const trailingEdge = (time: number) => {
    timeout = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = null;
    return result;
  };

  const cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    lastCallTime = null;
    lastArgs = lastThis = timeout = null;
  };

  const flush = () => {
    return timeout === null ? result : trailingEdge(Date.now());
  };

  const pending = () => {
    return timeout !== null;
  };

  const debounced = function (this: any, ...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;

    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(time);
      }
      if (maxWait !== undefined) {
        timeout = setTimeout(timerExpired, wait);
        return invokeFunc(time);
      }
    }

    if (timeout === null) {
      timeout = setTimeout(timerExpired, wait);
    }

    return result;
  } as DebouncedFunction<T>;

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced;
}

/**
 * 簡易版デバウンス（基本的な使用ケース用）
 */
export function simpleDebounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * プロミスを返すデバウンス関数
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let resolvePromise: ((value: ReturnType<T>) => void) | null = null;
  let rejectPromise: ((reason: any) => void) | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      if (timeout) clearTimeout(timeout);

      resolvePromise = resolve;
      rejectPromise = reject;

      timeout = setTimeout(async () => {
        try {
          const result = await func(...args);
          resolvePromise!(result);
        } catch (error) {
          rejectPromise!(error);
        }
      }, wait);
    });
  };
}

// 型定義
interface DebounceOptions {
  leading?: boolean;  // 最初の呼び出し時に即座に実行
  trailing?: boolean; // 最後の呼び出しから待機時間後に実行
  maxWait?: number;   // 最大待機時間
}

interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
  pending: () => boolean;
}