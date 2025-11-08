import React from 'react';
import { ArrowLeft, Undo, Redo, Search, Filter, X } from 'lucide-react';
import { ImportanceLevel } from '../../types';
import { SearchCategory } from '../LeftPanel/hooks/useLeftPanelState';
import styles from '../../scss/components/MobileLayout/MobileHeader.module.scss';

interface MobileHeaderProps {
  onBackToPages: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // 검색 관련 props
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchCategory?: SearchCategory;
  onSearchCategoryChange?: (category: SearchCategory) => void;
  searchImportanceFilters?: Set<ImportanceLevel>;
  onToggleImportanceFilter?: (level: ImportanceLevel) => void;
  onSelectAllImportance?: () => void;
  onClearAllImportance?: () => void;
  searchShowGeneralContent?: boolean;
  onToggleGeneralContent?: (checked: boolean) => void;
  showFilters?: boolean;
  onToggleFilters?: (show: boolean) => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onBackToPages,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  searchQuery = '',
  onSearchChange,
  searchCategory = 'all',
  onSearchCategoryChange,
  searchImportanceFilters = new Set(),
  onToggleImportanceFilter,
  onSelectAllImportance,
  onClearAllImportance,
  searchShowGeneralContent = true,
  onToggleGeneralContent,
  showFilters = false,
  onToggleFilters,
}) => {
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);

  // 검색창이 있으면 검색 모드
  const isSearchMode = isSearchFocused || searchQuery.length > 0;

  return (
    <>
      <div className={styles.mobileHeader}>
        {/* 왼쪽: 뒤로가기 버튼 */}
        <button
          className={styles.backButton}
          onClick={onBackToPages}
          aria-label="페이지 선택으로 돌아가기"
        >
          <ArrowLeft size={24} />
        </button>

        {/* 중앙: 검색창 */}
        <div className={styles.searchContainer}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={styles.searchInput}
          />
          {isSearchMode && (
            <button
              className={styles.clearButton}
              onMouseDown={(e) => {
                e.preventDefault(); // blur 방지
                onSearchChange?.('');
                setIsSearchFocused(false);
              }}
              aria-label="검색 취소"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 오른쪽: 검색 활성화 시 필터 버튼, 아니면 undo/redo */}
        {isSearchMode ? (
          <button
            className={`${styles.filterButton} ${showFilters ? styles.active : ''}`}
            onMouseDown={(e) => {
              e.preventDefault(); // 검색창 blur 방지
              onToggleFilters?.(!showFilters);
            }}
            aria-label="검색 필터"
          >
            <Filter size={20} />
          </button>
        ) : (
          <div className={styles.undoRedoGroup}>
            <button
              className={`${styles.undoRedoButton} ${!canUndo ? styles.disabled : ''}`}
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="실행 취소"
            >
              <Undo size={20} />
            </button>
            <button
              className={`${styles.undoRedoButton} ${!canRedo ? styles.disabled : ''}`}
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="다시 실행"
            >
              <Redo size={20} />
            </button>
          </div>
        )}
      </div>

      {/* 검색 필터 드롭다운 */}
      {showFilters && isSearchMode && (
        <div className={styles.searchFiltersDropdown}>
          {/* 검색 범위 */}
          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>검색 범위</span>
            <div className={styles.filterButtons}>
              {(['all', 'memos', 'categories', 'title', 'tags', 'content'] as SearchCategory[]).map((category) => (
                <button
                  key={category}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSearchCategoryChange?.(category);
                  }}
                  className={searchCategory === category ? styles.active : ''}
                >
                  {category === 'all' ? '전체' :
                   category === 'memos' ? '메모' :
                   category === 'categories' ? '카테고리' :
                   category === 'title' ? '제목' :
                   category === 'tags' ? '태그' : '내용'}
                </button>
              ))}
            </div>
          </div>

          {/* 중요도 필터 */}
          {(searchCategory === 'content' || searchCategory === 'all' || searchCategory === 'memos') && (
            <div className={styles.filterSection}>
              <span className={styles.filterLabel}>중요도 필터</span>

              {/* 중요도 레벨 버튼 (일반 내용 포함) */}
              <div className={styles.filterButtons}>
                {/* 일반 내용 버튼 */}
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onToggleGeneralContent?.(!searchShowGeneralContent);
                  }}
                  className={styles.importanceButton}
                  style={{
                    backgroundColor: searchShowGeneralContent ? '#f3f4f6' : 'transparent',
                    border: `1px solid ${searchShowGeneralContent ? '#9ca3af' : '#e5e7eb'}`,
                    color: searchShowGeneralContent ? '#111827' : '#6b7280'
                  }}
                >
                  일반 내용
                </button>

                {/* 중요도 레벨 버튼 */}
                {([
                  { level: 'critical', label: '매우중요', color: '#ffcdd2' },
                  { level: 'important', label: '중요', color: '#ffcc80' },
                  { level: 'opinion', label: '의견', color: '#e1bee7' },
                  { level: 'reference', label: '참고', color: '#81d4fa' },
                  { level: 'question', label: '질문', color: '#fff59d' },
                  { level: 'idea', label: '아이디어', color: '#c8e6c9' },
                  { level: 'data', label: '데이터', color: '#bdbdbd' }
                ] as Array<{level: ImportanceLevel, label: string, color: string}>).map(({level, label, color}) => (
                  <button
                    key={level}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onToggleImportanceFilter?.(level);
                    }}
                    className={styles.importanceButton}
                    style={{
                      backgroundColor: searchImportanceFilters.has(level) ? color : 'transparent',
                      border: `1px solid ${searchImportanceFilters.has(level) ? color : '#e5e7eb'}`,
                      color: searchImportanceFilters.has(level) ? '#000' : '#6b7280'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 전체 선택/해제 버튼 */}
              <div className={styles.bulkActions}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectAllImportance?.();
                  }}
                  className={styles.bulkButton}
                >
                  전체 선택
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onClearAllImportance?.();
                  }}
                  className={styles.bulkButton}
                >
                  전체 해제
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
