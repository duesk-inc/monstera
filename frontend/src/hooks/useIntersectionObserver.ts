import { useEffect, useRef, useState, MutableRefObject } from 'react';

interface UseIntersectionObserverProps {
  target: MutableRefObject<HTMLElement | null>;
  onIntersect?: () => void;
  threshold?: number | number[];
  rootMargin?: string;
  enabled?: boolean;
}

interface UseIntersectionObserverReturn {
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

export const useIntersectionObserver = ({
  target,
  onIntersect,
  threshold = 0,
  rootMargin = '0px',
  enabled = true,
}: UseIntersectionObserverProps): UseIntersectionObserverReturn => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!enabled || !target.current) {
      return;
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const [observerEntry] = entries;
      setIsIntersecting(observerEntry.isIntersecting);
      setEntry(observerEntry);

      if (observerEntry.isIntersecting && onIntersect) {
        onIntersect();
      }
    };

    // オブザーバーの作成
    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    const currentTarget = target.current;
    observerRef.current.observe(currentTarget);

    // クリーンアップ
    return () => {
      if (observerRef.current && currentTarget) {
        observerRef.current.unobserve(currentTarget);
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [target, threshold, rootMargin, enabled, onIntersect]);

  return {
    isIntersecting,
    entry,
  };
};