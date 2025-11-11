import React from 'react';
import { SearchCategory } from './hooks/useLeftPanelState';
import styles from '../../scss/components/LeftPanel.module.scss';

interface HeaderProps {
  userEmail?: string;
  searchQuery: string;
  showSearchFilters: boolean;
  onLogout?: () => void;
  onStartTutorial?: () => void;
  onSearch: (query: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onClearSearch: () => void;
  onToggleFilters: () => void;
  fullscreen?: boolean; // 모바일 풀스크린 모드
}

export const Header: React.FC<HeaderProps> = ({
  userEmail,
  searchQuery,
  showSearchFilters,
  onLogout,
  onStartTutorial,
  onSearch,
  onSearchFocus,
  onSearchBlur,
  onClearSearch,
  onToggleFilters,
  fullscreen = false
}) => {
  return (
    <div className={styles.header}>
      <div className={styles.headerTop}>
        <h2 className={styles.title}>마인드맵</h2>
        {onStartTutorial && (
          <button
            onClick={onStartTutorial}
            className={styles.tutorialButton}
            title="튜토리얼 다시 보기"
          >
            ?
          </button>
        )}
      </div>

      {/* 사용자 정보 영역 */}
      {userEmail && (
        <div className={styles.userInfo}>
          <span className={styles.userEmail}>{userEmail}</span>
          {onLogout && (
            <button
              onClick={onLogout}
              className={styles.logoutButton}
              title="로그아웃"
            >
              로그아웃
            </button>
          )}
        </div>
      )}

      {/* 검색 UI - PC에서만 표시 */}
      {!fullscreen && (
        <div className={styles.searchSection}>
        <div className={styles.searchInputRow}>
          <input
            data-tutorial="search"
            type="text"
            placeholder="메모 검색..."
            value={searchQuery}
            onChange={(e) => {
              e.stopPropagation();
              onSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' || e.key === 'Delete') {
                e.stopPropagation();
              }
            }}
            className={styles.searchInput}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
          />

          {searchQuery && (
            <button
              onClick={onClearSearch}
              className={styles.clearSearchButton}
            >
              ✕
            </button>
          )}
        </div>

        {/* 필터 토글 버튼 */}
        <div className={styles.filterToggleRow}>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggleFilters}
            className={`${styles.filterToggleButton} ${showSearchFilters ? styles.active : styles.inactive}`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 2h12l-4 6v4l-4-2v-2L1 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            필터
          </button>
        </div>
        </div>
      )}
    </div>
  );
};
