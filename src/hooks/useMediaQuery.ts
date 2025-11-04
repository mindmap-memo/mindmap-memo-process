import { useState, useEffect } from 'react';

/**
 * useMediaQuery
 *
 * CSS 미디어 쿼리를 React 컴포넌트에서 사용할 수 있게 해주는 훅
 *
 * @param query - CSS 미디어 쿼리 문자열 (예: '(max-width: 768px)')
 * @returns 미디어 쿼리 일치 여부 (boolean)
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // SSR 방어
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);

    // 초기 값 설정
    setMatches(media.matches);

    // 미디어 쿼리 변경 감지
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // 이벤트 리스너 등록
    media.addEventListener('change', listener);

    // 클린업
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
};
