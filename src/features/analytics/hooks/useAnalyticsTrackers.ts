import { useCallback } from 'react';
import { useAnalytics } from './useAnalytics';

/**
 * useAnalyticsTrackers
 *
 * 각 이벤트별 추적 함수를 제공하는 래퍼 훅
 * App.tsx에서 간편하게 사용할 수 있도록 함
 */
export const useAnalyticsTrackers = () => {
  const { trackEvent } = useAnalytics();

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

  const trackMemoTitleEdited = useCallback(() => {
    trackEvent('memo_title_edited');
  }, [trackEvent]);

  const trackMemoContentEdited = useCallback(() => {
    trackEvent('memo_content_edited');
  }, [trackEvent]);

  const trackFileAttached = useCallback((fileType: string) => {
    trackEvent('file_attached', { fileType });
  }, [trackEvent]);

  const trackCategoryTitleEdited = useCallback(() => {
    trackEvent('category_title_edited');
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
