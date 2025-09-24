import React from 'react';
import { Page, MemoBlock } from '../types';
import Resizer from './Resizer';

type SearchCategory = 'all' | 'title' | 'tags' | 'content';

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
  onSearch
}) => {
  const [editingPageId, setEditingPageId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [searchCategory, setSearchCategory] = React.useState<SearchCategory>('all');
  const [searchResults, setSearchResults] = React.useState<MemoBlock[]>([]);
  const [isSearchMode, setIsSearchMode] = React.useState<boolean>(false);

  const handleDoubleClick = (page: Page) => {
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const handleEditClick = (page: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const handleDeleteClick = (page: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`"${page.name}" 페이지를 정말 삭제하시겠습니까?`)) {
      onDeletePage(page.id);
    }
  };

  const handleNameSubmit = () => {
    if (editingPageId && editingName.trim()) {
      onPageNameChange(editingPageId, editingName.trim());
    }
    setEditingPageId(null);
    setEditingName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingPageId(null);
      setEditingName('');
    }
  };

  // 텍스트를 공백 제거한 상태로 정규화
  const normalizeText = (text: string): string => {
    return text.toLowerCase().replace(/\s+/g, '');
  };

  // 유연한 검색 함수 (공백 무시)
  const flexibleMatch = (text: string, query: string): boolean => {
    const normalizedText = normalizeText(text);
    const normalizedQuery = normalizeText(query);

    // 공백 제거한 상태에서 포함 여부 확인
    if (normalizedText.includes(normalizedQuery)) {
      return true;
    }

    // 추가적으로 단어별로 분리해서 모든 단어가 포함되는지 확인
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    if (queryWords.length > 1) {
      return queryWords.every(word => text.toLowerCase().includes(word));
    }

    return false;
  };

  // 검색 로직
  const searchMemos = (query: string, category: SearchCategory): MemoBlock[] => {
    if (!query.trim()) {
      return [];
    }

    const allMemos: MemoBlock[] = pages.flatMap(page => page.memos || []);

    return allMemos.filter(memo => {
      switch (category) {
        case 'title':
          return flexibleMatch(memo.title, query);
        case 'tags':
          return memo.tags?.some(tag => flexibleMatch(tag, query)) || false;
        case 'content':
          // 기본 content 검색
          if (memo.content && flexibleMatch(memo.content, query)) {
            return true;
          }
          // blocks 내용도 검색
          return memo.blocks?.some(block => {
            if (block.type === 'text' && block.content) {
              return flexibleMatch(block.content, query);
            }
            return false;
          }) || false;
        case 'all':
        default:
          // 제목 검색
          if (flexibleMatch(memo.title, query)) return true;
          // 태그 검색
          if (memo.tags?.some(tag => flexibleMatch(tag, query))) return true;
          // 내용 검색
          if (memo.content && flexibleMatch(memo.content, query)) return true;
          // blocks 내용 검색
          return memo.blocks?.some(block => {
            if (block.type === 'text' && block.content) {
              return flexibleMatch(block.content, query);
            }
            return false;
          }) || false;
      }
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = searchMemos(query, searchCategory);
      setSearchResults(results);
      setIsSearchMode(true);
      if (onSearch) {
        onSearch(query, searchCategory, results);
      }
    } else {
      setSearchResults([]);
      setIsSearchMode(false);
    }
  };

  const handleCategoryChange = (category: SearchCategory) => {
    setSearchCategory(category);
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchMode(false);
  };

  return (
    <div style={{
      width: `${width}px`,
      backgroundColor: '#ffffff',
      color: '#1f2937',
      padding: '24px',
      borderRight: '1px solid #e5e7eb',
      position: 'relative'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>마인드맵</h2>

        {/* 검색 UI */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px',
            gap: '8px'
          }}>
            <input
              type="text"
              placeholder="메모 검색..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: '4px',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* 검색 카테고리 선택 */}
          <div style={{
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap'
          }}>
            {['all', 'title', 'tags', 'content'].map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category as SearchCategory)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: searchCategory === category ? '#3b82f6' : '#f3f4f6',
                  color: searchCategory === category ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {category === 'all' ? '전체' :
                 category === 'title' ? '제목' :
                 category === 'tags' ? '태그' : '내용'}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* 검색 결과 섹션 */}
      {isSearchMode && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, flex: 1, fontSize: '18px', fontWeight: '600', color: '#374151' }}>
              검색 결과 ({searchResults.length}개)
            </h3>
          </div>
          <div>
            {searchResults.length > 0 ? (
              searchResults.map(memo => {
                const parentPage = pages.find(p => p.memos?.some(m => m.id === memo.id));
                return (
                  <div
                    key={memo.id}
                    onClick={() => {
                      if (parentPage) {
                        onPageSelect(parentPage.id);
                      }
                    }}
                    style={{
                      padding: '12px 16px',
                      marginBottom: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '13px'
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
                      {memo.content || '내용 없음'}
                    </div>
                  </div>
                );
              })
            ) : (
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
      )}

      {/* 페이지 섹션 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, flex: 1, fontSize: '18px', fontWeight: '600', color: '#374151' }}>
            페이지
          </h3>
          <button
            onClick={onAddPage}
            style={{
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              border: 'none',
              borderRadius: '6px',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            +
          </button>
        </div>
        <div>
          {pages.map(page => (
          <div
            key={page.id}
            onClick={() => onPageSelect(page.id)}
            onDoubleClick={() => handleDoubleClick(page)}
            style={{
              padding: '12px 16px',
              marginBottom: '8px',
              backgroundColor: currentPageId === page.id ? '#f3f4f6' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '8px',
              minHeight: '20px'
            }}
            onMouseOver={(e) => {
              if (currentPageId !== page.id) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseOut={(e) => {
              if (currentPageId !== page.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div style={{ 
              flex: 1, 
              minWidth: 0,
              marginRight: '8px'
            }}>
              {editingPageId === page.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={handleKeyPress}
                  autoFocus
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#374151',
                    width: '100%',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
              ) : (
                <span style={{ 
                  display: 'block',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                  lineHeight: '1.4',
                  fontSize: '14px'
                }}>
                  {page.name}
                </span>
              )}
            </div>
            
            {editingPageId !== page.id && (
              <div style={{ 
                display: 'flex', 
                gap: '4px',
                flexShrink: 0,
                paddingTop: '2px'
              }}>
                {/* 편집 아이콘 */}
                <button
                  onClick={(e) => handleEditClick(page, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                  title="페이지 이름 편집"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4z"/>
                  </svg>
                </button>
                
                {/* 삭제 아이콘 */}
                <button
                  onClick={(e) => handleDeleteClick(page, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    color: '#6b7280',
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
                    e.currentTarget.style.color = '#6b7280';
                  }}
                  title="페이지 삭제"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))
          }
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>프로세스</h3>
        <button
          style={{
            width: '100%',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#7c3aed';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#8b5cf6';
          }}
        >
          + 프로세스 생성
        </button>
      </div>
      <Resizer direction="left" onResize={onResize} />
    </div>
  );
};

export default LeftPanel;