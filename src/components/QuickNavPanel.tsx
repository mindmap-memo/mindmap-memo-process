import React, { useState } from 'react';
import { X } from 'lucide-react';
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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const handleStartEdit = (item: QuickNavItem) => {
    console.log('[QuickNavPanel] 편집 시작:', { id: item.id, name: item.name, item });
    setEditingItemId(item.id);
    setEditingName(item.name);
  };

  const handleSaveEdit = (itemId: string) => {
    if (editingName.trim()) {
      onUpdateQuickNavItem(itemId, editingName.trim());
    }
    setEditingItemId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingName('');
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
            right: rightPanelOpen ? `${rightPanelWidth + 20}px` : '20px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L9.5 5.5L13 6L10.5 8.5L11 12L8 10L5 12L5.5 8.5L3 6L6.5 5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>즐겨찾기</span>
          {quickNavItems.length > 0 && (
            <span className={styles['quick-nav-badge']}>
              {quickNavItems.length}
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
              right: rightPanelOpen ? `${rightPanelWidth + 20}px` : '20px'
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

            {quickNavItems.length === 0 ? (
              <div className={styles['quick-nav-empty']}>
                등록된 즐겨찾기가 없습니다
              </div>
            ) : (
              <>
                {/* 메모 즐겨찾기 */}
                {quickNavItems.filter(item => item.targetType === 'memo').length > 0 && (
                  <div className={styles['quick-nav-section']}>
                    {quickNavItems
                      .filter(item => item.targetType === 'memo')
                      .map(item => {
                        console.log('[QuickNavPanel] 렌더링:', { id: item.id, name: item.name });
                        const targetPage = pages?.find(p => p.id === item.pageId);
                        const isCurrentPage = item.pageId === currentPageId;
                        const isEditing = editingItemId === item.id;

                        return (
                          <div
                            key={item.id}
                            className={`${styles['quick-nav-item']} ${styles.memo} ${isEditing ? styles.editing : ''}`}
                          >
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveEdit(item.id);
                                    } else if (e.key === 'Escape') {
                                      handleCancelEdit();
                                    }
                                  }}
                                  className={styles['quick-nav-edit-input']}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className={`${styles['quick-nav-edit-button']} ${styles.memo}`}
                                  title="저장"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className={`${styles['quick-nav-delete-button']} ${styles.memo}`}
                                  title="취소"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <div
                                  onClick={() => {
                                    onExecuteQuickNav(item);
                                    onTogglePanel();
                                  }}
                                  className={styles['quick-nav-item-name']}
                                  title={item.name}
                                >
                                  {item.name}
                                  {!isCurrentPage && targetPage && (
                                    <span className={styles['quick-nav-item-page']}>
                                      {targetPage.name}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(item);
                                  }}
                                  className={`${styles['quick-nav-edit-button']} ${styles.memo}`}
                                  title="이름 변경"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`"${item.name}" 즐겨찾기를 삭제하시겠습니까?`)) {
                                      onDeleteQuickNavItem(item.id);
                                    }
                                  }}
                                  className={`${styles['quick-nav-delete-button']} ${styles.memo}`}
                                >
                                  ×
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* 카테고리 즐겨찾기 */}
                {quickNavItems.filter(item => item.targetType === 'category').length > 0 && (
                  <div className={styles['quick-nav-section']}>
                    {quickNavItems
                      .filter(item => item.targetType === 'category')
                      .map(item => {
                        const targetPage = pages?.find(p => p.id === item.pageId);
                        const isCurrentPage = item.pageId === currentPageId;
                        const isEditing = editingItemId === item.id;

                        return (
                          <div
                            key={item.id}
                            className={`${styles['quick-nav-item']} ${styles.category} ${isEditing ? styles.editing : ''}`}
                          >
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveEdit(item.id);
                                    } else if (e.key === 'Escape') {
                                      handleCancelEdit();
                                    }
                                  }}
                                  className={styles['quick-nav-edit-input']}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className={`${styles['quick-nav-edit-button']} ${styles.category}`}
                                  title="저장"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className={`${styles['quick-nav-delete-button']} ${styles.category}`}
                                  title="취소"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <div
                                  onClick={() => {
                                    onExecuteQuickNav(item);
                                    onTogglePanel();
                                  }}
                                  className={styles['quick-nav-item-name']}
                                  title={item.name}
                                >
                                  {item.name}
                                  {!isCurrentPage && targetPage && (
                                    <span className={styles['quick-nav-item-page']}>
                                      {targetPage.name}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(item);
                                  }}
                                  className={`${styles['quick-nav-edit-button']} ${styles.category}`}
                                  title="이름 변경"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`"${item.name}" 즐겨찾기를 삭제하시겠습니까?`)) {
                                      onDeleteQuickNavItem(item.id);
                                    }
                                  }}
                                  className={`${styles['quick-nav-delete-button']} ${styles.category}`}
                                >
                                  ×
                                </button>
                              </>
                            )}
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
