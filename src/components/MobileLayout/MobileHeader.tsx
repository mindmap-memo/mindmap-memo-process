import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '../../scss/components/MobileLayout/MobileHeader.module.scss';

interface MobileHeaderProps {
  currentPageId: string;
  pages: any[];
  onPageChange: (pageId: string) => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentPageId,
  pages,
  onPageChange,
}) => {
  const currentPageIndex = pages.findIndex(p => p.id === currentPageId);
  const currentPage = pages[currentPageIndex];

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      onPageChange(pages[currentPageIndex - 1].id);
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      onPageChange(pages[currentPageIndex + 1].id);
    }
  };

  return (
    <div className={styles.mobileHeader}>
      <button
        className={styles.navButton}
        onClick={handlePrevPage}
        disabled={currentPageIndex === 0}
      >
        <ChevronLeft size={20} />
      </button>

      <div className={styles.pageInfo}>
        <span className={styles.pageName}>{currentPage?.name || 'Page'}</span>
        <span className={styles.pageCount}>
          {currentPageIndex + 1} / {pages.length}
        </span>
      </div>

      <button
        className={styles.navButton}
        onClick={handleNextPage}
        disabled={currentPageIndex === pages.length - 1}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};
