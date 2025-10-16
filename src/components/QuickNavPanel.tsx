import React from 'react';
import { Page, QuickNavItem } from '../types';
import styles from '../scss/App.module.scss';

interface QuickNavPanelProps {
  quickNavItems: QuickNavItem[];
  pages: Page[];
  currentPageId: string;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
  showQuickNavPanel: boolean;
  onTogglePanel: () => void;
  onExecuteQuickNav: (item: QuickNavItem) => void;
  onDeleteQuickNavItem: (itemId: string) => void;
}

/**
 * QuickNavPanel
 *
 * 단축 이동 기능을 위한 패널 컴포넌트
 * 메모와 카테고리에 대한 빠른 이동을 제공합니다.
 */
export const QuickNavPanel: React.FC<QuickNavPanelProps> = ({
  quickNavItems,
  pages,
  currentPageId,
  rightPanelOpen,
  rightPanelWidth,
  showQuickNavPanel,
  onTogglePanel,
  onExecuteQuickNav,
  onDeleteQuickNavItem
}) => {
  return (
    <>
      {/* 단축 이동 버튼 */}
      <button
        data-tutorial="quick-nav-btn"
        onClick={onTogglePanel}
        className={styles['quick-nav-button']}
        style={{
          right: rightPanelOpen ? `${rightPanelWidth + 20}px` : '20px'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2L9.5 5.5L13 6L10.5 8.5L11 12L8 10L5 12L5.5 8.5L3 6L6.5 5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>단축 이동</span>
        {quickNavItems.length > 0 && (
          <span className={styles['quick-nav-badge']}>
            {quickNavItems.length}
          </span>
        )}
      </button>

      {/* 단축 이동 패널 */}
      {showQuickNavPanel && (
        <>
          {/* 배경 클릭 시 닫기 */}
          <div
            className={styles['quick-nav-overlay']}
            onClick={onTogglePanel}
          />

          {/* 패널 */}
          <div
            className={styles['quick-nav-panel']}
            style={{
              right: rightPanelOpen ? `${rightPanelWidth + 20}px` : '20px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {quickNavItems.length === 0 ? (
              <div className={styles['quick-nav-empty']}>
                등록된 단축 이동이 없습니다
              </div>
            ) : (
              <>
                {/* 메모 단축 이동 */}
                {quickNavItems.filter(item => item.targetType === 'memo').length > 0 && (
                  <div className={styles['quick-nav-section']}>
                    {quickNavItems
                      .filter(item => item.targetType === 'memo')
                      .map(item => {
                        const targetPage = pages.find(p => p.id === item.pageId);
                        const isCurrentPage = item.pageId === currentPageId;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onExecuteQuickNav(item);
                              onTogglePanel();
                            }}
                            className={`${styles['quick-nav-item']} ${styles.memo}`}
                            title={item.name}
                          >
                            <span className={styles['quick-nav-item-name']}>
                              {item.name}
                            </span>
                            {!isCurrentPage && targetPage && (
                              <span className={styles['quick-nav-item-page']}>
                                {targetPage.name}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`"${item.name}" 단축 이동을 삭제하시겠습니까?`)) {
                                  onDeleteQuickNavItem(item.id);
                                }
                              }}
                              className={`${styles['quick-nav-delete-button']} ${styles.memo}`}
                            >
                              ×
                            </button>
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* 카테고리 단축 이동 */}
                {quickNavItems.filter(item => item.targetType === 'category').length > 0 && (
                  <div className={styles['quick-nav-section']}>
                    {quickNavItems
                      .filter(item => item.targetType === 'category')
                      .map(item => {
                        const targetPage = pages.find(p => p.id === item.pageId);
                        const isCurrentPage = item.pageId === currentPageId;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onExecuteQuickNav(item);
                              onTogglePanel();
                            }}
                            className={`${styles['quick-nav-item']} ${styles.category}`}
                            title={item.name}
                          >
                            <span className={styles['quick-nav-item-name']}>
                              {item.name}
                            </span>
                            {!isCurrentPage && targetPage && (
                              <span className={styles['quick-nav-item-page']}>
                                {targetPage.name}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`"${item.name}" 단축 이동을 삭제하시겠습니까?`)) {
                                  onDeleteQuickNavItem(item.id);
                                }
                              }}
                              className={`${styles['quick-nav-delete-button']} ${styles.category}`}
                            >
                              ×
                            </button>
                          </button>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </>
  );
};
