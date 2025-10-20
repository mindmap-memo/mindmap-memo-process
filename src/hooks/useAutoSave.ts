import { useEffect, useRef } from 'react';
import { Page } from '../types';
import { updateMemo, updateCategory, updatePage } from '../utils/api';

/**
 * useAutoSave
 *
 * 페이지 데이터 변경 시 자동으로 데이터베이스에 저장하는 훅
 *
 * @param pages - 전체 페이지 데이터
 * @param currentPageId - 현재 페이지 ID
 * @param enabled - 자동 저장 활성화 여부 (기본: true)
 */
export const useAutoSave = (
  pages: Page[],
  currentPageId: string,
  enabled: boolean = true
) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const previousPagesRef = useRef<Page[]>(pages);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    // 첫 로드 시에는 저장하지 않음
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      previousPagesRef.current = pages;
      return;
    }

    if (!enabled) return;

    // 이전 타이머 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 50ms 디바운스 후 저장 (거의 실시간)
    saveTimeoutRef.current = setTimeout(async () => {
      const previousPages = previousPagesRef.current;

      // 변경사항 감지 및 저장
      for (const page of pages) {
        const prevPage = previousPages.find(p => p.id === page.id);

        if (!prevPage) {
          // 새 페이지는 이미 API에서 생성됨
          continue;
        }

        // 페이지 이름 변경 감지
        if (prevPage.name !== page.name) {
          try {
            await updatePage(page.id, page.name);
            console.log(`페이지 "${page.name}" 저장됨`);
          } catch (error) {
            console.error('페이지 저장 실패:', error);
          }
        }

        // 삭제된 메모 감지 및 삭제
        const deletedMemoIds = prevPage.memos
          .filter(prevMemo => !page.memos.find(m => m.id === prevMemo.id))
          .map(m => m.id);

        for (const memoId of deletedMemoIds) {
          try {
            const { deleteMemo: deleteMemoApi } = await import('../utils/api');
            await deleteMemoApi(memoId);
            console.log(`메모 "${memoId}" 삭제됨`);
          } catch (error) {
            // 404 에러는 이미 삭제된 것이므로 무시 (다른 곳에서 먼저 삭제된 경우)
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('Memo not found')) {
              // 이미 삭제된 경우이므로 로그만 남기고 계속 진행
            } else {
              console.error('메모 삭제 실패:', error);
            }
          }
        }

        // 메모 변경 감지 및 저장
        for (const memo of page.memos) {
          const prevMemo = prevPage.memos.find(m => m.id === memo.id);

          if (!prevMemo) {
            // 새 메모는 이미 API에서 생성됨
            continue;
          }

          // 메모 데이터 비교 (간단한 JSON 비교)
          const memoChanged = JSON.stringify(prevMemo) !== JSON.stringify(memo);

          if (memoChanged) {
            try {
              await updateMemo(memo.id, {
                title: memo.title,
                position: memo.position,
                size: memo.size,
                displaySize: memo.displaySize,
                blocks: memo.blocks,
                connections: memo.connections,
                tags: memo.tags,
                importance: memo.importance,
                parentId: memo.parentId,
              });
              console.log(`메모 "${memo.title}" 저장됨`);
            } catch (error) {
              console.error('메모 저장 실패:', error);
            }
          }
        }

        // 삭제된 카테고리 감지 및 삭제
        const deletedCategoryIds = (prevPage.categories || [])
          .filter(prevCategory => !(page.categories || []).find(c => c.id === prevCategory.id))
          .map(c => c.id);

        for (const categoryId of deletedCategoryIds) {
          try {
            const { deleteCategory: deleteCategoryApi } = await import('../utils/api');
            await deleteCategoryApi(categoryId);
            console.log(`카테고리 "${categoryId}" 삭제됨`);
          } catch (error) {
            // 404 에러는 이미 삭제된 것이므로 무시 (다른 곳에서 먼저 삭제된 경우)
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('Category not found')) {
              // 이미 삭제된 경우이므로 로그만 남기고 계속 진행
            } else {
              console.error('카테고리 삭제 실패:', error);
            }
          }
        }

        // 카테고리 변경 감지 및 저장
        for (const category of page.categories || []) {
          const prevCategory = prevPage.categories?.find(c => c.id === category.id);

          if (!prevCategory) {
            // 새 카테고리는 이미 API에서 생성됨
            continue;
          }

          // 카테고리 데이터 비교
          const categoryChanged = JSON.stringify(prevCategory) !== JSON.stringify(category);

          if (categoryChanged) {
            try {
              await updateCategory(category.id, {
                title: category.title,
                position: category.position,
                size: category.size,
                parentId: category.parentId,
                isExpanded: category.isExpanded,
              });
              console.log(`카테고리 "${category.title}" 저장됨`);
            } catch (error) {
              console.error('카테고리 저장 실패:', error);
            }
          }
        }
      }

      // 현재 상태를 이전 상태로 업데이트
      previousPagesRef.current = pages;
    }, 300); // 300ms 디바운스

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pages, enabled]);

  // 컴포넌트 언마운트 시 저장 보장
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
};
