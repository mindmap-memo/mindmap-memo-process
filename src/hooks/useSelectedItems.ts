import { useMemo } from 'react';
import { Page, MemoBlock, CategoryBlock } from '../types';

/**
 * useSelectedItems
 *
 * 현재 페이지와 선택된 항목들의 파생 상태를 관리하는 커스텀 훅입니다.
 *
 * **제공하는 파생 상태:**
 * - currentPage: 현재 활성화된 페이지
 * - selectedMemo: 단일 선택된 메모 (단일 선택 우선, 다중 선택 시 첫 번째 항목)
 * - selectedMemos: 다중 선택된 메모 배열
 * - selectedCategory: 단일 선택된 카테고리
 * - selectedCategories: 다중 선택된 카테고리 배열
 * - allSelectedCategoryIds: 단일 + 다중 선택 카테고리 ID 배열 (중복 제거)
 *
 * @param props - pages, currentPageId, selectedMemoId, selectedMemoIds, selectedCategoryId, selectedCategoryIds
 */

interface UseSelectedItemsProps {
  pages: Page[];
  currentPageId: string;
  selectedMemoId: string | null;
  selectedMemoIds: string[];
  selectedCategoryId: string | null;
  selectedCategoryIds: string[];
}

interface UseSelectedItemsReturn {
  currentPage: Page | undefined;
  selectedMemo: MemoBlock | undefined;
  selectedMemos: MemoBlock[];
  selectedCategory: CategoryBlock | undefined;
  selectedCategories: CategoryBlock[];
  allSelectedCategoryIds: string[];
}

export const useSelectedItems = ({
  pages,
  currentPageId,
  selectedMemoId,
  selectedMemoIds,
  selectedCategoryId,
  selectedCategoryIds
}: UseSelectedItemsProps): UseSelectedItemsReturn => {
  // ===== 현재 페이지 =====
  const currentPage = useMemo(
    () => pages.find(page => page.id === currentPageId),
    [pages, currentPageId]
  );

  // ===== 선택된 메모 =====
  const selectedMemo = useMemo(() => {
    if (!currentPage) return undefined;
    return currentPage.memos.find(memo => memo.id === selectedMemoId) ||
           (selectedMemoIds.length === 1 ? currentPage.memos.find(memo => memo.id === selectedMemoIds[0]) : undefined);
  }, [currentPage?.memos, selectedMemoId, selectedMemoIds]);

  const selectedMemos = useMemo(() => {
    if (!currentPage) return [];
    return currentPage.memos.filter(memo => selectedMemoIds.includes(memo.id));
  }, [currentPage, selectedMemoIds]);

  // ===== 선택된 카테고리 =====
  const selectedCategory = useMemo(() => {
    if (!currentPage) return undefined;
    return currentPage.categories?.find(category => category.id === selectedCategoryId) ||
           (selectedCategoryIds.length === 1 ? currentPage.categories?.find(category => category.id === selectedCategoryIds[0]) : undefined);
  }, [currentPage, selectedCategoryId, selectedCategoryIds]);

  // 단일 선택과 다중 선택을 합쳐서 중복 제거
  const allSelectedCategoryIds = useMemo(() => {
    return selectedCategoryId
      ? [selectedCategoryId, ...selectedCategoryIds.filter(id => id !== selectedCategoryId)]
      : selectedCategoryIds;
  }, [selectedCategoryId, selectedCategoryIds]);

  const selectedCategories = useMemo(() => {
    if (!currentPage) return [];
    return currentPage.categories?.filter(category => allSelectedCategoryIds.includes(category.id)) || [];
  }, [currentPage, allSelectedCategoryIds]);

  return {
    currentPage,
    selectedMemo,
    selectedMemos,
    selectedCategory,
    selectedCategories,
    allSelectedCategoryIds
  };
};
