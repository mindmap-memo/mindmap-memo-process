import { useCallback } from 'react';
import { Page } from '../types';

/**
 * usePageHandlers
 *
 * 페이지 관리 핸들러들을 제공하는 커스텀 훅입니다.
 *
 * **주요 기능:**
 * - 페이지 추가/삭제
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
  /**
   * 새 페이지 추가
   */
  const addPage = useCallback(() => {
    const newPage: Page = {
      id: Date.now().toString(),
      name: `페이지 ${pages.length + 1}`,
      memos: [],
      categories: []
    };
    setPages((prev) => [...prev, newPage]);
    setCurrentPageId(newPage.id);
  }, [pages.length, setPages, setCurrentPageId]);

  /**
   * 페이지 삭제
   */
  const deletePage = useCallback(
    (pageId: string) => {
      if (pages.length === 1) {
        alert('마지막 페이지는 삭제할 수 없습니다.');
        return;
      }

      setPages((prev) => prev.filter((page) => page.id !== pageId));

      if (currentPageId === pageId) {
        const remainingPages = pages.filter((page) => page.id !== pageId);
        if (remainingPages.length > 0) {
          setCurrentPageId(remainingPages[0].id);
        }
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
        prev.map((page) => (page.id === pageId ? { ...page, name: newName } : page))
      );
    },
    [setPages]
  );

  return {
    addPage,
    deletePage,
    updatePageName
  };
};
