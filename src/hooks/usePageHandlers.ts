import { useCallback } from 'react';
import { Page } from '../types';
import { createPage, deletePage as deletePageApi } from '../utils/api';

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
  /**
   * 새 페이지 추가 (DB에 저장)
   */
  const addPage = useCallback(async () => {
    try {
      const newPage = await createPage(`페이지 ${pages.length + 1}`);
      setPages((prev) => [...prev, newPage]);
      setCurrentPageId(newPage.id);
    } catch (error) {
      console.error('페이지 생성 실패:', error);
      alert('페이지 생성에 실패했습니다.');
    }
  }, [pages.length, setPages, setCurrentPageId]);

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
        setPages((prev) => prev.filter((page) => page.id !== pageId));

        if (currentPageId === pageId) {
          const remainingPages = pages.filter((page) => page.id !== pageId);
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
