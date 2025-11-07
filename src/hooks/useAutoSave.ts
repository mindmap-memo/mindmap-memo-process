import { useEffect, useRef } from 'react';
import { Page } from '../types';
import { updateMemo, updateCategory, updatePage } from '../utils/api';
import { AUTO_SAVE_DEBOUNCE } from '../utils/constants';

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

    // 300ms 디바운스 후 저장
    saveTimeoutRef.current = setTimeout(async () => {
      const previousPages = previousPagesRef.current;

      // 변경사항 감지 및 저장
      for (const page of pages) {
        const prevPage = previousPages.find(p => p.id === page.id);

        if (!prevPage) continue;

        // 페이지 이름 변경 감지
        if (prevPage.name !== page.name) {
          try {
            await updatePage(page.id, page.name);
          } catch (error) {
            console.error('페이지 저장 실패:', error);
          }
        }

        // 메모 변경 감지 및 저장
        for (const memo of page.memos) {
          const prevMemo = prevPage.memos.find(m => m.id === memo.id);

          if (!prevMemo) continue;

          // 메모 데이터 비교
          if (JSON.stringify(prevMemo) !== JSON.stringify(memo)) {
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
            } catch (error) {
              console.error('메모 저장 실패:', error);
            }
          }
        }

        // 카테고리 변경 감지 및 저장
        for (const category of page.categories || []) {
          const prevCategory = prevPage.categories?.find(c => c.id === category.id);

          if (!prevCategory) continue;

          // 카테고리 데이터 비교
          if (JSON.stringify(prevCategory) !== JSON.stringify(category)) {
            try {
              await updateCategory(category.id, {
                title: category.title,
                position: category.position,
                size: category.size,
                connections: category.connections,
                tags: category.tags,
                children: category.children,
                parentId: category.parentId,
                isExpanded: category.isExpanded,
              });
            } catch (error) {
              console.error('카테고리 저장 실패:', error);
            }
          }
        }
      }

      // 현재 상태를 이전 상태로 업데이트
      previousPagesRef.current = pages;
    }, AUTO_SAVE_DEBOUNCE);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pages, enabled]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
};
