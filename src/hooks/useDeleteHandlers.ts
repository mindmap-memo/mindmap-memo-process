import { useCallback } from 'react';
import { Page, QuickNavItem, CanvasActionType } from '../types';
import { deleteMemo, deleteCategory as deleteCategoryAPI, deleteQuickNavItem } from '../utils/api';

interface UseDeleteHandlersProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  selectedMemoId: string | null;
  setSelectedMemoId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedMemoIds: string[];
  setSelectedMemoIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCategoryId: string | null;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  deleteMemoBlock: () => void;
  deleteCategory: (categoryId: string) => void;
  saveCanvasState: (actionType: CanvasActionType, description: string) => void;
}

export const useDeleteHandlers = ({
  pages,
  setPages,
  currentPageId,
  selectedMemoId,
  setSelectedMemoId,
  selectedMemoIds,
  setSelectedMemoIds,
  selectedCategoryId,
  setSelectedCategoryId,
  selectedCategoryIds,
  setSelectedCategoryIds,
  deleteMemoBlock,
  deleteCategory,
  saveCanvasState
}: UseDeleteHandlersProps) => {

  // 통합 삭제 함수 - 현재 선택된 아이템(메모 또는 카테고리) 삭제
  const deleteSelectedItem = useCallback(() => {
    // 다중 선택된 항목들 삭제
    if (selectedMemoIds.length > 0 || selectedCategoryIds.length > 0) {
      const memoCount = selectedMemoIds.length;
      const categoryCount = selectedCategoryIds.length;

      // 서버에서 선택된 메모들 삭제
      selectedMemoIds.forEach(memoId => {
        deleteMemo(memoId).catch(error => {
          console.error('메모 삭제 API 실패:', memoId, error);
        });
      });

      // 서버에서 선택된 카테고리들 삭제
      selectedCategoryIds.forEach(categoryId => {
        deleteCategoryAPI(categoryId).catch(error => {
          console.error('카테고리 삭제 API 실패:', categoryId, error);
        });
      });

      setPages(prev => prev.map(page => {
        if (page.id !== currentPageId) return page;

        // 삭제할 메모/카테고리와 연결된 단축 이동 항목 찾기
        const allDeletedIds = [...selectedMemoIds, ...selectedCategoryIds];
        const quickNavItemsToDelete = (page.quickNavItems || []).filter(item => allDeletedIds.includes(item.targetId));

        // 서버에서 단축 이동 항목 삭제 (백그라운드에서 비동기 실행)
        quickNavItemsToDelete.forEach(item => {
          deleteQuickNavItem(item.id).catch(error => {
            console.warn('단축 이동 항목 삭제 실패 (UI는 정상 동작):', error);
          });
        });

        return {
          ...page,
          memos: page.memos.filter(memo => !selectedMemoIds.includes(memo.id)),
          categories: (page.categories || []).filter(cat => !selectedCategoryIds.includes(cat.id)),
          // 단축 이동 목록에서 삭제된 메모/카테고리 제거 (페이지별)
          quickNavItems: (page.quickNavItems || []).filter(item =>
            !selectedMemoIds.includes(item.targetId) && !selectedCategoryIds.includes(item.targetId)
          )
        };
      }));

      // 선택 상태 초기화
      setSelectedMemoIds([]);
      setSelectedCategoryIds([]);

      // 단일 선택도 초기화
      if (selectedMemoIds.includes(selectedMemoId || '')) {
        setSelectedMemoId(null);
      }
      if (selectedCategoryIds.includes(selectedCategoryId || '')) {
        setSelectedCategoryId(null);
      }

      // 실행 취소를 위한 상태 저장
      const description = `다중 삭제: 메모 ${memoCount}개, 카테고리 ${categoryCount}개`;
      setTimeout(() => saveCanvasState('bulk_delete', description), 0);
    }
    // 단일 선택 삭제
    else if (selectedMemoId) {
      deleteMemoBlock();
    } else if (selectedCategoryId) {
      deleteCategory(selectedCategoryId);
      setSelectedCategoryId(null);
    }
  }, [
    selectedMemoIds,
    selectedCategoryIds,
    selectedMemoId,
    selectedCategoryId,
    currentPageId,
    setPages,
    setSelectedMemoIds,
    setSelectedCategoryIds,
    setSelectedMemoId,
    setSelectedCategoryId,
    saveCanvasState,
    deleteMemoBlock,
    deleteCategory
  ]);

  return {
    deleteSelectedItem
  };
};
