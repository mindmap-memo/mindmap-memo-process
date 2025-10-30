import React from 'react';
import { Page, MemoBlock, ImportanceLevel, CategoryBlock } from '../../types';
import Resizer from '../Resizer';
import styles from '../../scss/components/LeftPanel.module.scss';
import { useLeftPanelState, SearchCategory } from './hooks/useLeftPanelState';
import { usePageHandlers } from './hooks/usePageHandlers';
import { useSearch } from './hooks/useSearch';
import { useSearchHandlers } from './hooks/useSearchHandlers';
import { useSearchRendering } from './hooks/useSearchRendering';
import { Header } from './Header';
import { SearchFilters } from './SearchFilters';
import { SearchResults } from './SearchResults';
import { PageList } from './PageList';

interface LeftPanelProps {
  pages: Page[];
  currentPageId: string;
  onPageSelect: (pageId: string) => void;
  onAddPage: () => void;
  onPageNameChange: (pageId: string, newName: string) => void;
  onDeletePage: (pageId: string) => void;
  width: number;
  onResize: (deltaX: number) => void;
  onSearch?: (query: string, category: SearchCategory, results: MemoBlock[]) => void;
  onDeleteMemo?: (memoId: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onNavigateToMemo?: (memoId: string, pageId?: string) => void;
  onNavigateToCategory?: (categoryId: string, pageId?: string) => void;
  onStartTutorial?: () => void;
  userEmail?: string;
  onLogout?: () => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  pages,
  currentPageId,
  onPageSelect,
  onAddPage,
  onPageNameChange,
  onDeletePage,
  width,
  onResize,
  onSearch,
  onDeleteMemo,
  onDeleteCategory,
  onNavigateToMemo,
  onNavigateToCategory,
  onStartTutorial,
  userEmail,
  onLogout
}) => {
  // 상태 관리
  const {
    editingPageId,
    setEditingPageId,
    editingName,
    setEditingName,
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
    searchImportanceFilters,
    setSearchImportanceFilters,
    searchShowGeneralContent,
    setSearchShowGeneralContent
  } = useLeftPanelState();

  // 페이지 핸들러
  const {
    handleDoubleClick,
    handleEditClick,
    handleDeleteClick,
    handleNameSubmit,
    handleKeyPress
  } = usePageHandlers({
    editingPageId,
    setEditingPageId,
    editingName,
    setEditingName,
    onPageNameChange,
    onDeletePage
  });

  // 검색 로직
  useSearch({
    pages,
    currentPageId,
    searchQuery,
    searchCategory,
    searchImportanceFilters,
    searchShowGeneralContent,
    isSearchFocused,
    setSearchResults,
    setSearchCategoryResults
  });

  // 검색 핸들러
  const { handleSearch, handleCategoryChange, clearSearch } = useSearchHandlers({
    setSearchQuery,
    setSearchCategory,
    setSearchResults,
    setSearchCategoryResults,
    setIsSearchMode,
    setIsSearchFocused
  });

  // 검색 결과 렌더링
  const { renderSearchResultContent } = useSearchRendering({
    searchQuery,
    searchImportanceFilters,
    searchShowGeneralContent
  });

  // 필터 핸들러들
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

  return (
    <div
      data-tutorial="left-panel"
      className={styles.leftPanel}
      style={{ width: `${width}px` }}>
      <Header
        userEmail={userEmail}
        searchQuery={searchQuery}
        showSearchFilters={showSearchFilters}
        onLogout={onLogout}
        onStartTutorial={onStartTutorial}
        onSearch={handleSearch}
        onSearchFocus={() => {
          setIsSearchFocused(true);
          setIsSearchMode(true);
        }}
        onSearchBlur={() => {
          setTimeout(() => {
            setIsSearchFocused(false);
            setIsSearchMode(false);
          }, 200);
        }}
        onClearSearch={clearSearch}
        onToggleFilters={() => setShowSearchFilters(!showSearchFilters)}
      />

      <SearchFilters
        showSearchFilters={showSearchFilters}
        searchCategory={searchCategory}
        searchImportanceFilters={searchImportanceFilters}
        searchShowGeneralContent={searchShowGeneralContent}
        onCategoryChange={handleCategoryChange}
        onToggleImportanceFilter={handleToggleImportanceFilter}
        onSelectAllImportance={handleSelectAllImportance}
        onClearAllImportance={handleClearAllImportance}
        onToggleGeneralContent={setSearchShowGeneralContent}
      />

      {isSearchMode && (
        <SearchResults
          searchResults={searchResults}
          searchCategoryResults={searchCategoryResults}
          pages={pages}
          onPageSelect={onPageSelect}
          onNavigateToMemo={onNavigateToMemo}
          onNavigateToCategory={onNavigateToCategory}
          onDeleteMemo={onDeleteMemo}
          onDeleteCategory={onDeleteCategory}
          renderSearchResultContent={renderSearchResultContent}
        />
      )}

      <PageList
        pages={pages}
        currentPageId={currentPageId}
        editingPageId={editingPageId}
        editingName={editingName}
        onPageSelect={onPageSelect}
        onAddPage={onAddPage}
        onDoubleClick={handleDoubleClick}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
        onNameChange={setEditingName}
        onNameSubmit={handleNameSubmit}
        onKeyPress={handleKeyPress}
      />

      <Resizer direction="left" onResize={onResize} />
    </div>
  );
};

export default LeftPanel;
