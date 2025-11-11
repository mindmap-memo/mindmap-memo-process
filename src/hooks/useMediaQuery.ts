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
  // 초기값을 즉시 계산하여 설정 (hydration mismatch 및 초기 렌더링 오류 방지)
  const getInitialMatches = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getInitialMatches);

  useEffect(() => {
    // SSR 방어
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);

    // 초기 값 설정 (상태와 실제 값이 다를 경우를 위해)
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

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
  }, [query, matches]);

  return matches;
};
