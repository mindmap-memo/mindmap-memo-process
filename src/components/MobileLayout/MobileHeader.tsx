import React from 'react';
import { ArrowLeft, Undo, Redo, Search } from 'lucide-react';
import styles from '../../scss/components/MobileLayout/MobileHeader.module.scss';

interface MobileHeaderProps {
  onBackToPages: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onBackToPages,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
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
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* 오른쪽: 실행 취소/다시 실행 */}
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
    </div>
  );
};
