import React from 'react';
import { MemoBlock, CategoryBlock, ImportanceLevel } from '../../../types';

export type SearchCategory = 'all' | 'title' | 'tags' | 'content' | 'memos' | 'categories';

export const useLeftPanelState = () => {
  // 페이지 편집 상태
  const [editingPageId, setEditingPageId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState<string>('');

  // 검색 상태
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [searchCategory, setSearchCategory] = React.useState<SearchCategory>('all');
  const [searchResults, setSearchResults] = React.useState<MemoBlock[]>([]);
  const [searchCategoryResults, setSearchCategoryResults] = React.useState<CategoryBlock[]>([]);
  const [isSearchMode, setIsSearchMode] = React.useState<boolean>(false);
  const [isSearchFocused, setIsSearchFocused] = React.useState<boolean>(false);
  const [showSearchFilters, setShowSearchFilters] = React.useState<boolean>(false);

  // 검색 필터 상태
  const [searchImportanceFilters, setSearchImportanceFilters] = React.useState<Set<ImportanceLevel>>(
    new Set(['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'] as ImportanceLevel[])
  );
  const [searchShowGeneralContent, setSearchShowGeneralContent] = React.useState<boolean>(true);

  return {
    // 페이지 편집 상태
    editingPageId,
    setEditingPageId,
    editingName,
    setEditingName,

    // 검색 상태
    searchQuery,
    setSearchQuery,
    searchCategory,
    setSearchCategory,
    searchResults,
    setSearchResults,
    searchCategoryResults,
    setSearchCategoryResults,
    isSearchMode,
    setIsSearchMode,
    isSearchFocused,
    setIsSearchFocused,
    showSearchFilters,
    setShowSearchFilters,

    // 검색 필터 상태
    searchImportanceFilters,
    setSearchImportanceFilters,
    searchShowGeneralContent,
    setSearchShowGeneralContent
  };
};
