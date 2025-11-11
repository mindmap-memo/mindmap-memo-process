import { useCallback } from 'react';
import { Page } from '../types';
import { createPage, deletePage as deletePageApi } from '../utils/api';
import { useAnalyticsTrackers } from '../features/analytics/hooks/useAnalyticsTrackers';

/**
 * usePageHandlers
 *
 * 페이지 관리 핸들러들을 제공하는 커스텀 훅입니다.
 *
 * **주요 기능:**
 * - 페이지 추가/삭제 (DB 동기화)
 * - 페이지 이름 변경
 *
 * @param props - 페이지 상태 및 setter
 * @returns 페이지 관련 핸들러 함수들
 */

interface UsePageHandlersProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  setCurrentPageId: React.Dispatch<React.SetStateAction<string>>;
}

export const usePageHandlers = ({
  pages,
  setPages,
  currentPageId,
  setCurrentPageId
}: UsePageHandlersProps) => {
  const analytics = useAnalyticsTrackers();

  /**
   * 페이지 선택 (analytics 추적 포함)
   */
  const selectPage = useCallback(
    (pageId: string) => {
      if (pageId !== currentPageId) {
        analytics.trackPageSwitched(currentPageId, pageId);
        setCurrentPageId(pageId);
      }
    },
    [currentPageId, setCurrentPageId, analytics]
  );

  /**
   * 새 페이지 추가 (DB에 저장)
   */
  const addPage = useCallback(async () => {
    try {
      const newId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newName = `페이지 ${pages.length + 1}`;

      // Create page in database
      await createPage(newId, newName);

      // Add to local state
      const newPage = {
        id: newId,
        name: newName,
        memos: [],
        categories: [],
        quickNavItems: []
      };
      setPages((prev) => [...prev, newPage]);
      setCurrentPageId(newPage.id);

      // Track analytics
      analytics.trackPageCreated();
    } catch (error) {
      console.error('페이지 생성 실패:', error);
      alert('페이지 생성에 실패했습니다.');
    }
  }, [pages.length, setPages, setCurrentPageId, analytics]);

  /**
   * 페이지 삭제 (DB에서 삭제)
   */
  const deletePage = useCallback(
    async (pageId: string) => {
      if (pages.length === 1) {
        alert('마지막 페이지는 삭제할 수 없습니다.');
        return;
      }

      try {
        await deletePageApi(pageId);
        setPages((prev) => prev?.filter((page) => page.id !== pageId));

        if (currentPageId === pageId) {
          const remainingPages = pages?.filter((page) => page.id !== pageId);
          if (remainingPages.length > 0) {
            setCurrentPageId(remainingPages[0].id);
          }
        }
      } catch (error) {
        console.error('페이지 삭제 실패:', error);
        alert('페이지 삭제에 실패했습니다.');
      }
    },
    [pages, currentPageId, setPages, setCurrentPageId]
  );

  /**
   * 페이지 이름 변경
   */
  const updatePageName = useCallback(
    (pageId: string, newName: string) => {
      setPages((prev) =>
        prev?.map((page) => (page.id === pageId ? { ...page, name: newName } : page))
      );
    },
    [setPages]
  );

  return {
    selectPage,
    addPage,
    deletePage,
    updatePageName
  };
};
