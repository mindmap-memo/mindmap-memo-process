import { useState } from 'react';
import { ImportanceLevel, MemoBlock, CategoryBlock } from '../../../types';
import { SearchCategory } from '../../LeftPanel/hooks/useLeftPanelState';

export type MobileView = 'pages' | 'canvas' | 'editor';

/**
 * useMobileLayout
 *
 * 모바일 레이아웃의 뷰 전환 및 검색 상태를 관리하는 훅
 */
export const useMobileLayout = () => {
  const [activeView, setActiveView] = useState<MobileView>('canvas');
  const [showEditor, setShowEditor] = useState(false);
  const [showPages, setShowPages] = useState(false);

  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<SearchCategory>('all');
  const [searchImportanceFilters, setSearchImportanceFilters] = useState<Set<ImportanceLevel>>(
    new Set(['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'] as ImportanceLevel[])
  );
  const [searchShowGeneralContent, setSearchShowGeneralContent] = useState(true);
  const [searchResults, setSearchResults] = useState<MemoBlock[]>([]);
  const [searchCategoryResults, setSearchCategoryResults] = useState<CategoryBlock[]>([]);

  // 중요도 필터 핸들러
  const handleToggleImportanceFilter = (level: ImportanceLevel) => {
    const newFilters = new Set(searchImportanceFilters);
    if (newFilters.has(level)) {
      newFilters.delete(level);
    } else {
      newFilters.add(level);
    }
    setSearchImportanceFilters(newFilters);
  };

  const handleSelectAllImportance = () => {
    setSearchImportanceFilters(new Set(['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'] as ImportanceLevel[]));
  };

  const handleClearAllImportance = () => {
    setSearchImportanceFilters(new Set());
  };

  return {
    activeView,
    setActiveView,
    showEditor,
    setShowEditor,
    showPages,
    setShowPages,
    // 검색 관련
    searchQuery,
    setSearchQuery,
    searchCategory,
    setSearchCategory,
    searchImportanceFilters,
    handleToggleImportanceFilter,
    handleSelectAllImportance,
    handleClearAllImportance,
    searchShowGeneralContent,
    setSearchShowGeneralContent,
    searchResults,
    setSearchResults,
    searchCategoryResults,
    setSearchCategoryResults,
  };
};
