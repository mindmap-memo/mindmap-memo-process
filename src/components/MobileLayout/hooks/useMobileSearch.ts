import { useEffect, useCallback, useMemo } from 'react';
import { Page, MemoBlock, CategoryBlock, ImportanceLevel } from '../../../types';
import { SearchCategory } from '../../LeftPanel/hooks/useLeftPanelState';
import {
  flexibleMatch,
  getFilteredTextFromBlock,
  searchBlockMetadata,
  getAllMemosFromCategory,
  calculateImportanceCount
} from '../../LeftPanel/utils/searchUtils';

interface UseMobileSearchProps {
  pages: Page[];
  currentPageId: string;
  searchQuery: string;
  searchCategory: SearchCategory;
  searchImportanceFilters: Set<ImportanceLevel>;
  searchShowGeneralContent: boolean;
  setSearchResults: (results: MemoBlock[]) => void;
  setSearchCategoryResults: (results: CategoryBlock[]) => void;
}

export const useMobileSearch = ({
  pages,
  currentPageId,
  searchQuery,
  searchCategory,
  searchImportanceFilters,
  searchShowGeneralContent,
  setSearchResults,
  setSearchCategoryResults
}: UseMobileSearchProps) => {

  // Set을 정렬된 문자열로 변환하여 안정적인 의존성 생성
  const importanceFiltersKey = useMemo(() =>
    Array.from(searchImportanceFilters).sort().join(','),
    [searchImportanceFilters]
  );

  // 메모 검색 로직 (LeftPanel의 useSearch와 동일)
  const searchMemos = useCallback((query: string, category: SearchCategory): MemoBlock[] => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return [];

    const directMemos = currentPage.memos || [];
    const categoryMemos: MemoBlock[] = [];

    currentPage.categories?.forEach(cat => {
      const childMemos = getAllMemosFromCategory(cat.id, currentPage);
      categoryMemos.push(...childMemos);
    });

    const allMemoIds = new Set([...directMemos.map(m => m.id), ...categoryMemos.map(m => m.id)]);
    const currentPageMemos: MemoBlock[] = Array.from(allMemoIds).map(id => {
      return directMemos.find(m => m.id === id) || categoryMemos.find(m => m.id === id)!;
    });

    if (!query.trim()) {
      const filteredMemos = currentPageMemos.filter(memo => {
        if (!memo.blocks || memo.blocks.length === 0) {
          return true;
        }

        return memo.blocks.some(block => {
          if (block.type === 'text') {
            const filteredContent = getFilteredTextFromBlock(block, searchImportanceFilters, searchShowGeneralContent);
            return filteredContent && filteredContent.length > 0;
          }

          if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
            const blockWithImportance = block as any;
            const hasImportance = blockWithImportance.importance;
            return !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);
          }

          return true;
        });
      });

      return filteredMemos.sort((a, b) => {
        const aCount = calculateImportanceCount(a, searchImportanceFilters);
        const bCount = calculateImportanceCount(b, searchImportanceFilters);

        if (bCount.filtered !== aCount.filtered) {
          return bCount.filtered - aCount.filtered;
        }

        return bCount.total - aCount.total;
      });
    }

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
          // 내용 검색은 blocks가 있으면 필터링된 내용만 검색
          if (memo.blocks && memo.blocks.length > 0) {
            matchesQuery = memo.blocks.some(block => {
              if (block.type === 'text') {
                const filteredContent = getFilteredTextFromBlock(block, searchImportanceFilters, searchShowGeneralContent);
                return filteredContent && flexibleMatch(filteredContent, query);
              }
              if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
                const blockWithImportance = block as any;
                const hasImportance = blockWithImportance.importance;
                const passesImportanceFilter = !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);
                const passesSearchQuery = searchBlockMetadata(block, query);
                return passesImportanceFilter && passesSearchQuery;
              }
              return searchBlockMetadata(block, query);
            });
          } else if (memo.content && searchShowGeneralContent) {
            // blocks가 없으면 일반 content 검색 (일반 내용 필터가 켜져 있을 때만)
            matchesQuery = flexibleMatch(memo.content, query);
          }
          break;
        case 'memos':
          // 제목 검색
          if (flexibleMatch(memo.title, query)) {
            matchesQuery = true;
          }
          // 태그 검색
          if (!matchesQuery && memo.tags?.some(tag => flexibleMatch(tag, query))) {
            matchesQuery = true;
          }
          // 내용 검색 (필터링된 내용만)
          if (!matchesQuery) {
            if (memo.blocks && memo.blocks.length > 0) {
              matchesQuery = memo.blocks.some(block => {
                if (block.type === 'text') {
                  const filteredContent = getFilteredTextFromBlock(block, searchImportanceFilters, searchShowGeneralContent);
                  return filteredContent && flexibleMatch(filteredContent, query);
                }
                if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
                  const blockWithImportance = block as any;
                  const hasImportance = blockWithImportance.importance;
                  const passesImportanceFilter = !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);
                  const passesSearchQuery = searchBlockMetadata(block, query);
                  return passesImportanceFilter && passesSearchQuery;
                }
                return searchBlockMetadata(block, query);
              });
            } else if (memo.content && searchShowGeneralContent) {
              // blocks가 없으면 일반 content 검색 (일반 내용 필터가 켜져 있을 때만)
              matchesQuery = flexibleMatch(memo.content, query);
            }
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
          // 내용 검색 (필터링된 내용만)
          if (!matchesQuery) {
            if (memo.blocks && memo.blocks.length > 0) {
              matchesQuery = memo.blocks.some(block => {
                if (block.type === 'text') {
                  const filteredContent = getFilteredTextFromBlock(block, searchImportanceFilters, searchShowGeneralContent);
                  return filteredContent && flexibleMatch(filteredContent, query);
                }
                if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
                  const blockWithImportance = block as any;
                  const hasImportance = blockWithImportance.importance;
                  const passesImportanceFilter = !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);
                  const passesSearchQuery = searchBlockMetadata(block, query);
                  return passesImportanceFilter && passesSearchQuery;
                }
                return searchBlockMetadata(block, query);
              });
            } else if (memo.content && searchShowGeneralContent) {
              // blocks가 없으면 일반 content 검색 (일반 내용 필터가 켜져 있을 때만)
              matchesQuery = flexibleMatch(memo.content, query);
            }
          }
          break;
      }

      return matchesQuery;
    });

    return matchedMemos.sort((a, b) => {
      const aCount = calculateImportanceCount(a, searchImportanceFilters);
      const bCount = calculateImportanceCount(b, searchImportanceFilters);

      if (bCount.filtered !== aCount.filtered) {
        return bCount.filtered - aCount.filtered;
      }

      return bCount.total - aCount.total;
    });
  }, [pages, currentPageId, searchImportanceFilters, searchShowGeneralContent]);

  // 카테고리 검색 로직
  const searchCategories = useCallback((query: string): CategoryBlock[] => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) return [];

    if (!query.trim()) {
      return currentPage.categories;
    }

    return currentPage.categories.filter(category => {
      if (flexibleMatch(category.title, query)) return true;
      if (category.tags?.some(tag => flexibleMatch(tag, query))) return true;
      return false;
    });
  }, [pages, currentPageId]);

  // 검색어, 필터, 카테고리가 변경될 때마다 검색 수행
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchCategory, importanceFiltersKey, searchShowGeneralContent, currentPageId]);

  return {
    searchMemos,
    searchCategories
  };
};
