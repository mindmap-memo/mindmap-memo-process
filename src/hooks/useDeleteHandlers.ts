import { useCallback } from 'react';
import { Page, QuickNavItem, CanvasActionType } from '../types';

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
  quickNavItems: QuickNavItem[];
  setQuickNavItems: React.Dispatch<React.SetStateAction<QuickNavItem[]>>;
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
  quickNavItems,
  setQuickNavItems,
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

      setPages(prev => prev.map(page => {
        if (page.id !== currentPageId) return page;

        return {
          ...page,
          memos: page.memos.filter(memo => !selectedMemoIds.includes(memo.id)),
          categories: (page.categories || []).filter(cat => !selectedCategoryIds.includes(cat.id))
        };
      }));

      // 단축 이동 목록에서 삭제된 메모/카테고리 제거
      setQuickNavItems(prev => prev.filter(item =>
        !selectedMemoIds.includes(item.targetId) && !selectedCategoryIds.includes(item.targetId)
      ));

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
    setQuickNavItems,
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
