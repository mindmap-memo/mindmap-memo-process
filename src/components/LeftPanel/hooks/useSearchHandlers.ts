import { MemoBlock, CategoryBlock } from '../../../types';
import { SearchCategory } from './useLeftPanelState';
import { useAnalyticsTrackers } from '../../../features/analytics/hooks/useAnalyticsTrackers';

interface UseSearchHandlersProps {
  setSearchQuery: (query: string) => void;
  setSearchCategory: (category: SearchCategory) => void;
  setSearchResults: (results: MemoBlock[]) => void;
  setSearchCategoryResults: (results: CategoryBlock[]) => void;
  setIsSearchMode: (mode: boolean) => void;
  setIsSearchFocused: (focused: boolean) => void;
}

export const useSearchHandlers = ({
  setSearchQuery,
  setSearchCategory,
  setSearchResults,
  setSearchCategoryResults,
  setIsSearchMode,
  setIsSearchFocused
}: UseSearchHandlersProps) => {
  const analytics = useAnalyticsTrackers();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // 검색 모드는 포커스 상태에 따라 결정되므로 여기서는 변경하지 않음

    // Track search event (only if query is not empty)
    if (query.trim()) {
      analytics.trackSearch(query);
    }
  };

  const handleCategoryChange = (category: SearchCategory) => {
    setSearchCategory(category);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchCategoryResults([]);
    setIsSearchMode(false);
    setIsSearchFocused(false);
  };

  return {
    handleSearch,
    handleCategoryChange,
    clearSearch
  };
};
