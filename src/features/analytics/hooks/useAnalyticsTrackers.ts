import { useCallback, useRef } from 'react';
import { useAnalytics } from './useAnalytics';

/**
 * useAnalyticsTrackers
 *
 * 각 이벤트별 추적 함수를 제공하는 래퍼 훅
 * App.tsx에서 간편하게 사용할 수 있도록 함
 *
 * **디바운싱 처리:**
 * - 제목/내용 수정 이벤트는 2초 디바운싱 적용
 * - 마지막 입력 후 2초 동안 추가 입력이 없을 때만 이벤트 기록
 */
export const useAnalyticsTrackers = () => {
  const { trackEvent } = useAnalytics();

  // 디바운스 타이머 ref
  const memoTitleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const memoContentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const categoryTitleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const trackMemoCreated = useCallback(() => {
    trackEvent('memo_created');
  }, [trackEvent]);

  const trackConnectionCreated = useCallback(() => {
    trackEvent('connection_created');
  }, [trackEvent]);

  const trackCategoryCreated = useCallback(() => {
    trackEvent('category_created');
  }, [trackEvent]);

  const trackPageCreated = useCallback(() => {
    trackEvent('page_created');
  }, [trackEvent]);

  const trackSearch = useCallback((query: string) => {
    trackEvent('search_performed', { query });
  }, [trackEvent]);

  const trackImportanceAssigned = useCallback((importance: string) => {
    trackEvent('importance_assigned', { importance });
  }, [trackEvent]);

  const trackImportanceFilterUsed = useCallback((filters: string[]) => {
    trackEvent('importance_filter_used', { filters });
  }, [trackEvent]);

  const trackQuickNavCreated = useCallback((type: 'memo' | 'category') => {
    trackEvent('quick_nav_created', { type });
  }, [trackEvent]);

  const trackQuickNavUsed = useCallback((type: 'memo' | 'category') => {
    trackEvent('quick_nav_used', { type });
  }, [trackEvent]);

  const trackTagCreated = useCallback((tag: string) => {
    trackEvent('tag_created', { tag });
  }, [trackEvent]);

  const trackTutorialStarted = useCallback(() => {
    trackEvent('tutorial_started');
  }, [trackEvent]);

  const trackTutorialCompleted = useCallback(() => {
    trackEvent('tutorial_completed');
  }, [trackEvent]);

  const trackTutorialStep = useCallback((step: number) => {
    trackEvent('tutorial_step', { step });
  }, [trackEvent]);

  const trackTutorialAbandoned = useCallback((step: number) => {
    trackEvent('tutorial_abandoned', { step });
  }, [trackEvent]);

  // 디바운싱 처리: 2초 동안 추가 입력이 없을 때만 이벤트 기록
  const trackMemoTitleEdited = useCallback(() => {
    if (memoTitleTimerRef.current) {
      clearTimeout(memoTitleTimerRef.current);
    }
    memoTitleTimerRef.current = setTimeout(() => {
      trackEvent('memo_title_edited');
    }, 2000);
  }, [trackEvent]);

  // 디바운싱 처리: 2초 동안 추가 입력이 없을 때만 이벤트 기록
  const trackMemoContentEdited = useCallback(() => {
    if (memoContentTimerRef.current) {
      clearTimeout(memoContentTimerRef.current);
    }
    memoContentTimerRef.current = setTimeout(() => {
      trackEvent('memo_content_edited');
    }, 2000);
  }, [trackEvent]);

  const trackFileAttached = useCallback((fileType: string) => {
    trackEvent('file_attached', { fileType });
  }, [trackEvent]);

  // 디바운싱 처리: 2초 동안 추가 입력이 없을 때만 이벤트 기록
  const trackCategoryTitleEdited = useCallback(() => {
    if (categoryTitleTimerRef.current) {
      clearTimeout(categoryTitleTimerRef.current);
    }
    categoryTitleTimerRef.current = setTimeout(() => {
      trackEvent('category_title_edited');
    }, 2000);
  }, [trackEvent]);

  const trackCategoryChildAdded = useCallback((childType: 'memo' | 'category') => {
    trackEvent('category_child_added', { childType });
  }, [trackEvent]);

  const trackPageSwitched = useCallback((fromPageId: string, toPageId: string) => {
    trackEvent('page_switched', { fromPageId, toPageId });
  }, [trackEvent]);

  return {
    trackMemoCreated,
    trackMemoTitleEdited,
    trackMemoContentEdited,
    trackFileAttached,
    trackConnectionCreated,
    trackCategoryCreated,
    trackCategoryTitleEdited,
    trackCategoryChildAdded,
    trackPageCreated,
    trackPageSwitched,
    trackSearch,
    trackImportanceAssigned,
    trackImportanceFilterUsed,
    trackQuickNavCreated,
    trackQuickNavUsed,
    trackTagCreated,
    trackTutorialStarted,
    trackTutorialCompleted,
    trackTutorialStep,
    trackTutorialAbandoned,
  };
};
