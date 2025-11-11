import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Page, QuickNavItem } from '../types';
import { useMediaQuery } from '../hooks/useMediaQuery';
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
  onUpdateQuickNavItem: (itemId: string, newName: string) => void;
  onDeleteQuickNavItem: (itemId: string) => void;
  hideButton?: boolean; // 모바일에서는 버튼 숨김
}

/**
 * QuickNavPanel
 *
 * 즐겨찾기 기능을 위한 패널 컴포넌트
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
  onUpdateQuickNavItem,
  onDeleteQuickNavItem,
  hideButton = false
}) => {
  // quickNavItems가 undefined일 경우를 대비한 안전 장치
  const safeQuickNavItems = quickNavItems || [];

  // 태블릿 가로모드 감지 (테스트용: pointer 조건 제거)
  const isTabletLandscape = useMediaQuery('(min-width: 769px) and (max-width: 1366px) and (orientation: landscape)');

  // 태블릿 가로모드에서는 항상 우측 패널이 있다고 가정 (너비 300px)
  const effectiveRightPanelOpen = isTabletLandscape ? true : rightPanelOpen;
  const effectiveRightPanelWidth = isTabletLandscape ? 300 : rightPanelWidth;

  // 즐겨찾기 아이템의 실시간 제목을 가져오는 함수
  const getItemTitle = (item: QuickNavItem): string => {
    const targetPage = pages?.find(p => p.id === item.pageId);
    if (!targetPage) return item.name; // 페이지를 찾을 수 없으면 저장된 이름 반환

    if (item.targetType === 'memo') {
      const memo = targetPage.memos.find(m => m.id === item.targetId);
      return memo?.title || '제목 없는 메모';
    } else if (item.targetType === 'category') {
      const category = targetPage.categories?.find(c => c.id === item.targetId);
      return category?.title || '제목 없는 카테고리';
    }
    return item.name;
  };

  return (
    <>
      {/* 즐겨찾기 버튼 - PC 버전에서만 표시 */}
      {!hideButton && (
        <button
          data-tutorial="quick-nav-btn"
          onClick={onTogglePanel}
          className={styles['quick-nav-button']}
          style={{
            right: effectiveRightPanelOpen ? `${effectiveRightPanelWidth + 20}px` : '20px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L9.5 5.5L13 6L10.5 8.5L11 12L8 10L5 12L5.5 8.5L3 6L6.5 5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>즐겨찾기</span>
          {safeQuickNavItems.length > 0 && (
            <span className={styles['quick-nav-badge']}>
              {safeQuickNavItems.length}
            </span>
          )}
        </button>
      )}

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
              // 태블릿 가로모드가 아닐 때만 right 값 적용 (태블릿 가로모드는 CSS가 처리)
              ...(isTabletLandscape ? {} : {
                right: effectiveRightPanelOpen ? `${effectiveRightPanelWidth + 20}px` : '20px'
              })
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모바일 닫기 버튼 */}
            <button
              className={styles['quick-nav-mobile-close']}
              onClick={onTogglePanel}
              aria-label="닫기"
            >
              <X size={24} />
            </button>

            {safeQuickNavItems.length === 0 ? (
              <div className={styles['quick-nav-empty']}>
                등록된 즐겨찾기가 없습니다
              </div>
            ) : (
              <>
                {/* 메모 즐겨찾기 */}
                {safeQuickNavItems.filter(item => item.targetType === 'memo').length > 0 && (
                  <div className={styles['quick-nav-section']}>
                    {safeQuickNavItems
                      .filter(item => item.targetType === 'memo')
                      .map(item => {
                        const targetPage = pages?.find(p => p.id === item.pageId);
                        const isCurrentPage = item.pageId === currentPageId;
                        const itemTitle = getItemTitle(item); // 실시간 제목 가져오기

                        return (
                          <div
                            key={item.id}
                            className={`${styles['quick-nav-item']} ${styles.memo}`}
                          >
                            <div
                              onClick={() => {
                                onExecuteQuickNav(item);
                                onTogglePanel();
                              }}
                              className={styles['quick-nav-item-name']}
                              title={itemTitle}
                            >
                              {itemTitle}
                              {!isCurrentPage && targetPage && (
                                <span className={styles['quick-nav-item-page']}>
                                  {targetPage.name}
                                </span>
                              )}
                            </div>
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (window.confirm(`"${itemTitle}" 즐겨찾기를 삭제하시겠습니까?`)) {
                                  onDeleteQuickNavItem(item.id);
                                }
                              }}
                              onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (window.confirm(`"${itemTitle}" 즐겨찾기를 삭제하시겠습니까?`)) {
                                  onDeleteQuickNavItem(item.id);
                                }
                              }}
                              className={`${styles['quick-nav-delete-button']} ${styles.memo}`}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* 카테고리 즐겨찾기 */}
                {safeQuickNavItems.filter(item => item.targetType === 'category').length > 0 && (
                  <div className={styles['quick-nav-section']}>
                    {safeQuickNavItems
                      .filter(item => item.targetType === 'category')
                      .map(item => {
                        const targetPage = pages?.find(p => p.id === item.pageId);
                        const isCurrentPage = item.pageId === currentPageId;
                        const itemTitle = getItemTitle(item); // 실시간 제목 가져오기

                        return (
                          <div
                            key={item.id}
                            className={`${styles['quick-nav-item']} ${styles.category}`}
                          >
                            <div
                              onClick={() => {
                                onExecuteQuickNav(item);
                                onTogglePanel();
                              }}
                              className={styles['quick-nav-item-name']}
                              title={itemTitle}
                            >
                              {itemTitle}
                              {!isCurrentPage && targetPage && (
                                <span className={styles['quick-nav-item-page']}>
                                  {targetPage.name}
                                </span>
                              )}
                            </div>
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (window.confirm(`"${itemTitle}" 즐겨찾기를 삭제하시겠습니까?`)) {
                                  onDeleteQuickNavItem(item.id);
                                }
                              }}
                              onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (window.confirm(`"${itemTitle}" 즐겨찾기를 삭제하시겠습니까?`)) {
                                  onDeleteQuickNavItem(item.id);
                                }
                              }}
                              className={`${styles['quick-nav-delete-button']} ${styles.category}`}
                            >
                              ×
                            </button>
                          </div>
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
