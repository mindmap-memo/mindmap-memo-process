import React from 'react';
import { Page, MemoBlock, CategoryBlock } from '../../types';

interface SearchResultsProps {
  searchResults: MemoBlock[];
  searchCategoryResults: CategoryBlock[];
  pages: Page[];
  onPageSelect: (pageId: string) => void;
  onNavigateToMemo?: (memoId: string, pageId?: string) => void;
  onNavigateToCategory?: (categoryId: string, pageId?: string) => void;
  onDeleteMemo?: (memoId: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
  renderSearchResultContent: (memo: MemoBlock) => React.ReactNode;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  searchCategoryResults,
  pages,
  onPageSelect,
  onNavigateToMemo,
  onNavigateToCategory,
  onDeleteMemo,
  onDeleteCategory,
  renderSearchResultContent
}) => {
  return (
    <div style={{ marginBottom: '24px', flex: '0 0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, flex: 1, fontSize: '18px', fontWeight: '600', color: '#374151' }}>
          검색 결과 ({searchResults.length + searchCategoryResults.length}개)
        </h3>
      </div>
      <div style={{
        maxHeight: '400px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {/* 메모 결과 */}
        {searchResults.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            {searchCategoryResults.length > 0 && (
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#6b7280' }}>
                메모 ({searchResults.length}개)
              </h4>
            )}
            {searchResults.map(memo => {
              const parentPage = pages?.find(p => p.memos?.some(m => m.id === memo.id));
              return (
                <div
                  key={memo.id}
                  style={{
                    padding: '12px 16px',
                    paddingRight: '40px',
                    marginBottom: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '13px',
                    position: 'relative'
                  }}
                  onClick={() => {
                    if (parentPage) {
                      onPageSelect(parentPage.id);
                      if (onNavigateToMemo) {
                        onNavigateToMemo(memo.id, parentPage.id);
                      }
                    }
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                    {memo.title || '제목 없음'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                    📄 {parentPage?.name || '페이지 없음'}
                  </div>
                  {memo.tags && memo.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      {memo.tags.map(tag => (
                        <span key={tag} style={{
                          padding: '2px 6px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          borderRadius: '3px',
                          fontSize: '10px'
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ color: '#475569', fontSize: '11px', lineHeight: '1.3' }}>
                    {(() => {
                      const content = renderSearchResultContent(memo);
                      if (Array.isArray(content) && content.length === 0) {
                        return '내용 없음';
                      }
                      return content;
                    })()}
                  </div>

                  {onDeleteMemo && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`"${memo.title || '제목 없음'}" 메모를 정말 삭제하시겠습니까?`)) {
                          onDeleteMemo(memo.id);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#fef2f2';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#64748b';
                      }}
                      title="메모 삭제"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 카테고리 결과 */}
        {searchCategoryResults.length > 0 && (
          <div>
            {searchResults.length > 0 && (
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#6b7280' }}>
                카테고리 ({searchCategoryResults.length}개)
              </h4>
            )}
            {searchCategoryResults.map(category => {
              const parentPage = pages?.find(p => p.categories?.some(c => c.id === category.id));
              return (
                <div
                  key={category.id}
                  style={{
                    padding: '12px 16px',
                    paddingRight: '40px',
                    marginBottom: '8px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '13px',
                    position: 'relative'
                  }}
                  onClick={() => {
                    if (parentPage) {
                      onPageSelect(parentPage.id);
                      if (onNavigateToCategory) {
                        onNavigateToCategory(category.id, parentPage.id);
                      }
                    }
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#fde68a';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef3c7';
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#78350f', marginBottom: '4px' }}>
                    📁 {category.title || '제목 없음'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>
                    📄 {parentPage?.name || '페이지 없음'}
                  </div>
                  {category.tags && category.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {category.tags.map(tag => (
                        <span key={tag} style={{
                          padding: '2px 6px',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          borderRadius: '3px',
                          fontSize: '10px'
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {onDeleteCategory && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`"${category.title || '제목 없음'}" 카테고리를 정말 삭제하시겠습니까?`)) {
                          onDeleteCategory(category.id);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        color: '#92400e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#fef2f2';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#92400e';
                      }}
                      title="카테고리 삭제"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 결과 없음 */}
        {searchResults.length === 0 && searchCategoryResults.length === 0 && (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};
