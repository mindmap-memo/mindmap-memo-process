import React from 'react';
import { MemoBlock, CategoryBlock, Page, ImportanceLevel } from '../../../types';
import { SearchCategory } from './useLeftPanelState';
import {
  flexibleMatch,
  getFilteredTextFromBlock,
  searchBlockMetadata,
  getAllMemosFromCategory,
  calculateImportanceCount
} from '../utils/searchUtils';

interface UseSearchProps {
  pages: Page[];
  currentPageId: string;
  searchQuery: string;
  searchCategory: SearchCategory;
  searchImportanceFilters: Set<ImportanceLevel>;
  searchShowGeneralContent: boolean;
  isSearchFocused: boolean;
  setSearchResults: (results: MemoBlock[]) => void;
  setSearchCategoryResults: (results: CategoryBlock[]) => void;
}

export const useSearch = ({
  pages,
  currentPageId,
  searchQuery,
  searchCategory,
  searchImportanceFilters,
  searchShowGeneralContent,
  isSearchFocused,
  setSearchResults,
  setSearchCategoryResults
}: UseSearchProps) => {

  // 검색 로직
  const searchMemos = React.useCallback((query: string, category: SearchCategory): MemoBlock[] => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return [];

    // 현재 페이지의 모든 메모 (카테고리 children 포함)
    const directMemos = currentPage.memos || [];
    const categoryMemos: MemoBlock[] = [];

    // 모든 카테고리의 children 메모 가져오기
    currentPage.categories?.forEach(cat => {
      const childMemos = getAllMemosFromCategory(cat.id, currentPage);
      categoryMemos.push(...childMemos);
    });

    // 중복 제거
    const allMemoIds = new Set([...directMemos.map(m => m.id), ...categoryMemos.map(m => m.id)]);
    const currentPageMemos: MemoBlock[] = Array.from(allMemoIds).map(id => {
      return directMemos.find(m => m.id === id) || categoryMemos.find(m => m.id === id)!;
    });

    // 검색어가 없으면 중요도 필터만 적용하여 현재 페이지의 모든 메모 반환
    if (!query.trim()) {
      const filteredMemos = currentPageMemos.filter(memo => {
        // blocks가 없거나 비어있으면 항상 표시
        if (!memo.blocks || memo.blocks.length === 0) {
          return true;
        }

        // 어떤 블록이라도 중요도 필터를 통과하면 메모 표시
        return memo.blocks.some(block => {
          // 텍스트 블록: 중요도 필터 적용
          if (block.type === 'text') {
            const filteredContent = getFilteredTextFromBlock(block, searchImportanceFilters, searchShowGeneralContent);
            return filteredContent && filteredContent.length > 0;
          }

          // 파일/이미지/북마크 블록: 중요도 필터 확인
          if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
            const blockWithImportance = block as any;
            const hasImportance = blockWithImportance.importance;
            // 중요도가 없거나 필터에 포함된 중요도면 표시
            return !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);
          }

          // 다른 블록 타입은 항상 표시
          return true;
        });
      });

      // 중요도 개수로 정렬 (필터에 체크된 중요도 개수 → 전체 중요도 개수 순)
      return filteredMemos.sort((a, b) => {
        const aCount = calculateImportanceCount(a, searchImportanceFilters);
        const bCount = calculateImportanceCount(b, searchImportanceFilters);

        // 1순위: 필터에 체크된 중요도 개수 (내림차순)
        if (bCount.filtered !== aCount.filtered) {
          return bCount.filtered - aCount.filtered;
        }

        // 2순위: 전체 중요도 개수 (내림차순)
        return bCount.total - aCount.total;
      });
    }

    // 검색어가 있으면 텍스트 매칭 + 중요도 필터 적용
    const matchedMemos = currentPageMemos.filter(memo => {
      let matchesQuery = false;

      switch (category) {
        case 'title':
          matchesQuery = flexibleMatch(memo.title, query);
          break;
        case 'tags':
          matchesQuery = memo.tags?.some(tag => flexibleMatch(tag, query)) || false;
          break;
        case 'content':
          // 기본 content 검색
          if (memo.content && flexibleMatch(memo.content, query)) {
            matchesQuery = true;
          }
          // blocks 내용도 검색 (중요도 필터링 적용)
          if (!matchesQuery && memo.blocks) {
            matchesQuery = memo.blocks.some(block => {
              if (block.type === 'text') {
                const filteredContent = getFilteredTextFromBlock(block, searchImportanceFilters, searchShowGeneralContent);
                return filteredContent && flexibleMatch(filteredContent, query);
              }
              // 파일/이미지/북마크: 검색어 매칭 + 중요도 필터 확인
              if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
                const blockWithImportance = block as any;
                const hasImportance = blockWithImportance.importance;
                const passesImportanceFilter = !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);
                const passesSearchQuery = searchBlockMetadata(block, query);
                return passesImportanceFilter && passesSearchQuery;
              }
              // 기타 블록: 메타데이터 검색만
              return searchBlockMetadata(block, query);
            });
          }
          break;
        case 'memos':
          // 메모만 검색 (제목, 태그, 내용 모두)
          if (flexibleMatch(memo.title, query)) {
            matchesQuery = true;
          }
          if (!matchesQuery && memo.tags?.some(tag => flexibleMatch(tag, query))) {
            matchesQuery = true;
          }
          if (!matchesQuery && memo.content && flexibleMatch(memo.content, query)) {
            matchesQuery = true;
          }
          if (!matchesQuery && memo.blocks) {
            matchesQuery = memo.blocks.some(block => {
              if (block.type === 'text') {
                const filteredContent = getFilteredTextFromBlock(block, searchImportanceFilters, searchShowGeneralContent);
                return filteredContent && flexibleMatch(filteredContent, query);
              }
              // 파일/이미지/북마크: 검색어 매칭 + 중요도 필터 확인
              if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
                const blockWithImportance = block as any;
                const hasImportance = blockWithImportance.importance;
                const passesImportanceFilter = !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);
                const passesSearchQuery = searchBlockMetadata(block, query);
                return passesImportanceFilter && passesSearchQuery;
              }
              // 기타 블록: 메타데이터 검색만
              return searchBlockMetadata(block, query);
            });
          }
          break;
        case 'all':
        default:
          // 제목 검색
          if (flexibleMatch(memo.title, query)) {
            matchesQuery = true;
          }
          // 태그 검색
          if (!matchesQuery && memo.tags?.some(tag => flexibleMatch(tag, query))) {
            matchesQuery = true;
          }
          // 내용 검색
          if (!matchesQuery && memo.content && flexibleMatch(memo.content, query)) {
            matchesQuery = true;
          }
          // blocks 내용 검색 (중요도 필터링 적용)
          if (!matchesQuery && memo.blocks) {
            matchesQuery = memo.blocks.some(block => {
              if (block.type === 'text') {
                const filteredContent = getFilteredTextFromBlock(block, searchImportanceFilters, searchShowGeneralContent);
                return filteredContent && flexibleMatch(filteredContent, query);
              }
              // 파일/이미지/북마크: 검색어 매칭 + 중요도 필터 확인
              if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
                const blockWithImportance = block as any;
                const hasImportance = blockWithImportance.importance;
                const passesImportanceFilter = !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);
                const passesSearchQuery = searchBlockMetadata(block, query);
                return passesImportanceFilter && passesSearchQuery;
              }
              // 기타 블록: 메타데이터 검색만
              return searchBlockMetadata(block, query);
            });
          }
          break;
      }

      return matchesQuery;
    });

    // 중요도 개수로 정렬 (필터에 체크된 중요도 개수 → 전체 중요도 개수 순)
    return matchedMemos.sort((a, b) => {
      const aCount = calculateImportanceCount(a, searchImportanceFilters);
      const bCount = calculateImportanceCount(b, searchImportanceFilters);

      // 1순위: 필터에 체크된 중요도 개수 (내림차순)
      if (bCount.filtered !== aCount.filtered) {
        return bCount.filtered - aCount.filtered;
      }

      // 2순위: 전체 중요도 개수 (내림차순)
      return bCount.total - aCount.total;
    });
  }, [pages, currentPageId, searchImportanceFilters, searchShowGeneralContent]);

  // 카테고리 검색 로직 (중요도 필터 예외)
  const searchCategories = React.useCallback((query: string): CategoryBlock[] => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) return [];

    if (!query.trim()) {
      // 검색어가 없으면 모든 카테고리 반환
      return currentPage.categories;
    }

    // 검색어가 있으면 제목이나 태그가 일치하는 카테고리 반환
    return currentPage.categories.filter(category => {
      if (flexibleMatch(category.title, query)) return true;
      if (category.tags?.some(tag => flexibleMatch(tag, query))) return true;
      return false;
    });
  }, [pages, currentPageId]);

  // 검색창 활성화 상태, 필터 상태, 현재 페이지가 변경될 때마다 검색 결과 업데이트
  React.useEffect(() => {
    if (isSearchFocused) {
      // 카테고리만 검색하는 경우
      if (searchCategory === 'categories') {
        setSearchResults([]);
        setSearchCategoryResults(searchCategories(searchQuery));
      }
      // 메모만 검색하는 경우
      else if (searchCategory === 'memos') {
        setSearchResults(searchMemos(searchQuery, searchCategory));
        setSearchCategoryResults([]);
      }
      // 전체 검색 (메모 + 카테고리)
      else if (searchCategory === 'all') {
        setSearchResults(searchMemos(searchQuery, searchCategory));
        setSearchCategoryResults(searchCategories(searchQuery));
      }
      // 기타 (제목, 태그, 내용 - 메모만)
      else {
        setSearchResults(searchMemos(searchQuery, searchCategory));
        setSearchCategoryResults([]);
      }
    }
  }, [isSearchFocused, searchQuery, searchCategory, searchImportanceFilters, searchShowGeneralContent, currentPageId, searchMemos, searchCategories, setSearchResults, setSearchCategoryResults]);

  return {
    searchMemos,
    searchCategories
  };
};
