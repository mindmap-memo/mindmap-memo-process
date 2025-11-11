import { useCallback } from 'react';
import { QuickNavItem, Page } from '../types';
import { calculateCategoryArea } from '../utils/categoryAreaUtils';
import { createQuickNavItem, updateQuickNavItem as updateQuickNavItemApi, deleteQuickNavItem as deleteQuickNavItemApi } from '../utils/api';
import { useAnalyticsTrackers } from '../features/analytics/hooks/useAnalyticsTrackers';

/**
 * useQuickNavHandlers
 *
 * 즐겨찾기(Quick Navigation) 기능을 관리하는 커스텀 훅입니다.
 *
 * **주요 기능:**
 * - 메모/카테고리에 대한 즐겨찾기 항목 추가
 * - 즐겨찾기 항목 삭제
 * - 즐겨찾기 실행 (페이지 전환 + 화면 이동)
 * - 중복 체크
 *
 * **구현 세부사항:**
 * - 같은 페이지의 같은 타겟에 대한 중복 등록 방지
 * - 페이지 전환이 필요한 경우 딜레이 후 이동 (상태 업데이트 대기)
 * - 메모는 화면 중앙에 표시
 * - 카테고리는 영역 전체가 보이도록 자동 스케일 조정
 *
 * @param props - 페이지 데이터, 현재 페이지 ID, 즐겨찾기 목록, 캔버스 상태 등
 * @returns 즐겨찾기 관련 핸들러 함수들
 *
 * @example
 * ```tsx
 * const {
 *   addQuickNavItem,
 *   deleteQuickNavItem,
 *   executeQuickNav,
 *   isQuickNavExists
 * } = useQuickNavHandlers({
 *   pages,
 *   currentPageId,
 *   quickNavItems,
 *   setQuickNavItems,
 *   setCurrentPageId,
 *   setCanvasOffset,
 *   setCanvasScale
 * });
 *
 * // 즐겨찾기 추가
 * addQuickNavItem('중요 메모', memoId, 'memo');
 *
 * // 즐겨찾기 실행
 * executeQuickNav(quickNavItem);
 * ```
 */

interface UseQuickNavHandlersProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  quickNavItems: QuickNavItem[];
  setCurrentPageId: React.Dispatch<React.SetStateAction<string>>;
  setCanvasOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setCanvasScale: React.Dispatch<React.SetStateAction<number>>;
}

export const useQuickNavHandlers = ({
  pages,
  setPages,
  currentPageId,
  quickNavItems,
  setCurrentPageId,
  setCanvasOffset,
  setCanvasScale
}: UseQuickNavHandlersProps) => {
  const analytics = useAnalyticsTrackers();
  /**
   * 메모로 네비게이션
   * 캔버스 뷰를 메모 중심으로 이동하고 초기 줌 레벨로 설정
   */
  const handleNavigateToMemo = useCallback(
    (memoId: string, pageId?: string) => {
      console.log('[handleNavigateToMemo] Called with:', { memoId, pageId, currentPageId });
      const targetPageId = pageId || currentPageId;
      console.log('[handleNavigateToMemo] Target page ID:', targetPageId);
      const targetPage = pages?.find((p) => p.id === targetPageId);
      if (!targetPage) {
        console.error('[handleNavigateToMemo] Target page not found!');
        return;
      }
      console.log('[handleNavigateToMemo] Found target page:', targetPage.name);

      const memo = targetPage.memos.find((m) => m.id === memoId);
      if (!memo) {
        console.error('[handleNavigateToMemo] Memo not found in target page! Removing from quick nav.');
        // 메모가 삭제되었으면 즐겨찾기 목록에서도 제거
        const itemToDelete = (quickNavItems || []).find(item => item.targetType === 'memo' && item.targetId === memoId);
        if (itemToDelete) {
          deleteQuickNavItem(itemToDelete.id);
        }
        return;
      }
      console.log('[handleNavigateToMemo] Found memo:', memo.title, 'at position:', memo.position);

      // Canvas 컨테이너의 실제 크기 가져오기
      const canvasElement = document.getElementById('main-canvas');
      if (!canvasElement) {
        console.error('[handleNavigateToMemo] Canvas element not found!');
        return;
      }
      const rect = canvasElement.getBoundingClientRect();
      const availableWidth = rect.width;
      const availableHeight = rect.height;
      console.log('[handleNavigateToMemo] Canvas size:', { width: availableWidth, height: availableHeight });

      // 메모 크기
      const memoWidth = memo.size?.width || 200;
      const memoHeight = memo.size?.height || 150;
      console.log('[handleNavigateToMemo] Memo size:', { width: memoWidth, height: memoHeight });

      // 메모 중심 좌표
      const memoCenterX = memo.position.x + memoWidth / 2;
      const memoCenterY = memo.position.y + memoHeight / 2;
      console.log('[handleNavigateToMemo] Memo center (world coords):', { x: memoCenterX, y: memoCenterY });

      // scale을 1로 리셋할 것이므로 scale 1 기준으로 offset 계산
      const targetScale = 1;
      const newOffsetX = availableWidth / 2 - memoCenterX * targetScale;
      const newOffsetY = availableHeight / 2 - memoCenterY * targetScale;

      console.log('[handleNavigateToMemo] Target scale:', targetScale);
      console.log('[handleNavigateToMemo] Calculated offset:', { newOffsetX, newOffsetY });

      setCanvasOffset({ x: newOffsetX, y: newOffsetY });
      setCanvasScale(targetScale); // 초기 줌 레벨로 리셋
      console.log('[handleNavigateToMemo] Navigation complete');
    },
    [pages, currentPageId, setCanvasOffset, setCanvasScale]
  );

  /**
   * 카테고리로 네비게이션
   * 캔버스 뷰를 카테고리 중심으로 이동
   * 영역이 있고 확장된 경우 전체 영역이 보이도록 스케일 조정
   */
  const handleNavigateToCategory = useCallback(
    (categoryId: string, pageId?: string) => {
      console.log('[handleNavigateToCategory] Called with:', { categoryId, pageId, currentPageId });
      const targetPageId = pageId || currentPageId;
      console.log('[handleNavigateToCategory] Target page ID:', targetPageId);
      const targetPage = pages?.find((p) => p.id === targetPageId);
      if (!targetPage) {
        console.error('[handleNavigateToCategory] Target page not found!');
        return;
      }
      console.log('[handleNavigateToCategory] Found target page:', targetPage.name);

      const category = targetPage.categories?.find((c) => c.id === categoryId);
      if (!category) {
        console.error('[handleNavigateToCategory] Category not found in target page! Removing from quick nav.');
        // 카테고리가 삭제되었으면 즐겨찾기 목록에서도 제거
        const itemToDelete = (quickNavItems || []).find(item => item.targetType === 'category' && item.targetId === categoryId);
        if (itemToDelete) {
          deleteQuickNavItem(itemToDelete.id);
        }
        return;
      }
      console.log('[handleNavigateToCategory] Found category:', category.title, 'at position:', category.position);

      // Canvas 컨테이너의 실제 크기 가져오기
      const canvasElement = document.getElementById('main-canvas');
      if (!canvasElement) {
        console.error('[handleNavigateToCategory] Canvas element not found!');
        return;
      }
      const rect = canvasElement.getBoundingClientRect();
      const availableWidth = rect.width;
      const availableHeight = rect.height;

      // 카테고리 영역 계산 (자식이 있는 경우)
      const categoryArea = calculateCategoryArea(category, targetPage);

      if (categoryArea && category.isExpanded) {
        // 영역이 있고 확장된 상태면 전체 영역이 화면에 보이도록 조정
        const areaWidth = categoryArea.width;
        const areaHeight = categoryArea.height;
        const areaCenterX = categoryArea.x + areaWidth / 2;
        const areaCenterY = categoryArea.y + areaHeight / 2;

        // 영역이 화면에 맞도록 스케일 계산 (여백 20% 추가)
        const margin = 0.2;
        const scaleX = availableWidth / (areaWidth * (1 + margin));
        const scaleY = availableHeight / (areaHeight * (1 + margin));
        const optimalScale = Math.min(scaleX, scaleY, 1); // 최대 1배 (확대 안함)

        // 화면 중앙에 영역이 오도록 offset 계산
        const newOffsetX = availableWidth / 2 - areaCenterX * optimalScale;
        const newOffsetY = availableHeight / 2 - areaCenterY * optimalScale;

        setCanvasOffset({ x: newOffsetX, y: newOffsetY });
        setCanvasScale(optimalScale);
      } else {
        // 영역이 없거나 축소된 상태면 카테고리 블록만 중앙에 표시
        const categoryWidth = category.size?.width || 200;
        const categoryHeight = category.size?.height || 80;
        const categoryCenterX = category.position.x + categoryWidth / 2;
        const categoryCenterY = category.position.y + categoryHeight / 2;

        const targetScale = 1;
        setCanvasOffset({
          x: availableWidth / 2 - categoryCenterX * targetScale,
          y: availableHeight / 2 - categoryCenterY * targetScale
        });
        setCanvasScale(targetScale);
      }
    },
    [pages, currentPageId, setCanvasOffset, setCanvasScale]
  );

  /**
   * 즐겨찾기 항목 추가 (낙관적 업데이트)
   * 중복 체크 수행
   */
  const addQuickNavItem = useCallback(
    async (name: string, targetId: string, targetType: 'memo' | 'category') => {
      // 중복 체크: 같은 페이지의 같은 타겟에 대한 즐겨찾기가 이미 있는지 확인
      const isDuplicate = (quickNavItems || []).some(
        (item) => item.targetId === targetId && item.targetType === targetType && item.pageId === currentPageId
      );

      if (isDuplicate) {
        alert('이미 즐겨찾기가 설정되어 있습니다.');
        return;
      }

      // 임시 ID로 즉시 UI에 반영 (낙관적 업데이트)
      const tempId = `temp-${Date.now()}`;
      const optimisticItem: QuickNavItem = {
        id: tempId,
        name,
        targetId,
        targetType,
        pageId: currentPageId
      };

      // 즉시 UI 업데이트
      setPages((prevPages) =>
        prevPages?.map((page) => {
          if (page.id === currentPageId) {
            return {
              ...page,
              quickNavItems: [...(page.quickNavItems || []), optimisticItem]
            };
          }
          return page;
        })
      );

      // 백그라운드에서 DB에 저장
      try {
        const newItem = await createQuickNavItem({
          itemId: targetId,
          type: targetType,
          pageId: currentPageId,
          title: name
        });

        // 실제 ID로 교체
        setPages((prevPages) =>
          prevPages.map((page) => {
            if (page.id === currentPageId) {
              return {
                ...page,
                quickNavItems: (page.quickNavItems || []).map((item) =>
                  item.id === tempId ? newItem : item
                )
              };
            }
            return page;
          })
        );

        // Track analytics
        analytics.trackQuickNavCreated(targetType);
      } catch (error) {
        console.error('즐겨찾기 추가 실패:', error);
        // 실패 시 롤백
        setPages((prevPages) =>
          prevPages.map((page) => {
            if (page.id === currentPageId) {
              return {
                ...page,
                quickNavItems: (page.quickNavItems || []).filter((item) => item.id !== tempId)
              };
            }
            return page;
          })
        );
        alert('즐겨찾기 추가에 실패했습니다.');
      }
    },
    [quickNavItems, currentPageId, setPages]
  );

  /**
   * 즐겨찾기 중복 확인
   */
  const isQuickNavExists = useCallback(
    (targetId: string, targetType: 'memo' | 'category'): boolean => {
      return (quickNavItems || []).some(
        (item) => item.targetId === targetId && item.targetType === targetType && item.pageId === currentPageId
      );
    },
    [quickNavItems, currentPageId]
  );

  /**
   * 즐겨찾기 항목 이름 변경 (낙관적 업데이트)
   */
  const updateQuickNavItem = useCallback(
    async (itemId: string, newName: string) => {
      // 즉시 UI 업데이트 (낙관적 업데이트)
      setPages((prevPages) =>
        prevPages?.map((page) => {
          if (page.id === currentPageId) {
            return {
              ...page,
              quickNavItems: (page.quickNavItems || []).map((item) =>
                item.id === itemId ? { ...item, name: newName } : item
              )
            };
          }
          return page;
        })
      );

      // 백그라운드에서 DB 업데이트
      updateQuickNavItemApi(itemId, newName).catch(error => {
        console.error('즐겨찾기 이름 변경 실패:', error);
        alert('이름 변경에 실패했습니다.');
      });
    },
    [currentPageId, setPages]
  );

  /**
   * 즐겨찾기 항목 삭제 (낙관적 업데이트)
   */
  const deleteQuickNavItem = useCallback(
    async (itemId: string) => {
      // 삭제 전 백업 (롤백용)
      let deletedItem: QuickNavItem | undefined;

      // 즉시 UI에서 제거 (낙관적 업데이트)
      setPages((prevPages) =>
        prevPages?.map((page) => {
          if (page.id === currentPageId) {
            deletedItem = (page.quickNavItems || []).find((item) => item.id === itemId);
            return {
              ...page,
              quickNavItems: (page.quickNavItems || []).filter((item) => item.id !== itemId)
            };
          }
          return page;
        })
      );

      // 백그라운드에서 DB에서 삭제
      try {
        await deleteQuickNavItemApi(itemId);
      } catch (error) {
        console.error('즐겨찾기 삭제 실패:', error);
        // 실패 시 롤백
        if (deletedItem) {
          setPages((prevPages) =>
            prevPages.map((page) => {
              if (page.id === currentPageId) {
                return {
                  ...page,
                  quickNavItems: [...(page.quickNavItems || []), deletedItem!]
                };
              }
              return page;
            })
          );
        }
        alert('즐겨찾기 삭제에 실패했습니다.');
      }
    },
    [currentPageId, setPages]
  );

  /**
   * 즐겨찾기 실행
   * 페이지가 다르면 페이지 전환 후 이동
   * 같은 페이지면 바로 이동
   */
  const executeQuickNav = useCallback(
    (item: QuickNavItem) => {
      console.log('🔵 [executeQuickNav] 시작:', {
        itemName: item.name,
        targetId: item.targetId,
        targetType: item.targetType,
        itemPageId: item.pageId,
        currentPageId: currentPageId
      });

      // Track analytics
      analytics.trackQuickNavUsed(item.targetType);

      // 페이지가 다르면 페이지 전환
      if (item.pageId !== currentPageId) {
        console.log('📄 [executeQuickNav] 페이지 전환 필요:', item.pageId);
        setCurrentPageId(item.pageId);
        // 페이지 전환 후 약간의 딜레이를 두고 이동 (상태 업데이트 대기)
        setTimeout(() => {
          console.log('⏰ [executeQuickNav] setTimeout 실행 (페이지 전환 후)');
          if (item.targetType === 'memo') {
            console.log('📝 [executeQuickNav] handleNavigateToMemo 호출');
            handleNavigateToMemo(item.targetId);
          } else {
            console.log('📁 [executeQuickNav] handleNavigateToCategory 호출');
            handleNavigateToCategory(item.targetId);
          }
        }, 100);
      } else {
        // 같은 페이지면 바로 이동
        console.log('✨ [executeQuickNav] 같은 페이지, 바로 이동');
        if (item.targetType === 'memo') {
          console.log('📝 [executeQuickNav] handleNavigateToMemo 호출');
          handleNavigateToMemo(item.targetId);
        } else {
          console.log('📁 [executeQuickNav] handleNavigateToCategory 호출');
          handleNavigateToCategory(item.targetId);
        }
      }
    },
    [currentPageId, setCurrentPageId, handleNavigateToMemo, handleNavigateToCategory, analytics]
  );

  return {
    handleNavigateToMemo,
    handleNavigateToCategory,
    addQuickNavItem,
    updateQuickNavItem,
    deleteQuickNavItem,
    executeQuickNav,
    isQuickNavExists
  };
};
