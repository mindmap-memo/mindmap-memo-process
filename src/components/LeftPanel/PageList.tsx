import React from 'react';
import { Page } from '../../types';

interface PageListProps {
  pages: Page[];
  currentPageId: string;
  editingPageId: string | null;
  editingName: string;
  onPageSelect: (pageId: string) => void;
  onAddPage: () => void;
  onDoubleClick: (page: Page) => void;
  onEditClick: (page: Page, e: React.MouseEvent) => void;
  onDeleteClick: (page: Page, e: React.MouseEvent) => void;
  onNameChange: (value: string) => void;
  onNameSubmit: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export const PageList: React.FC<PageListProps> = ({
  pages,
  currentPageId,
  editingPageId,
  editingName,
  onPageSelect,
  onAddPage,
  onDoubleClick,
  onEditClick,
  onDeleteClick,
  onNameChange,
  onNameSubmit,
  onKeyPress
}) => {
  return (
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
          onDoubleClick={() => onDoubleClick(page)}
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
                onChange={(e) => onNameChange(e.target.value)}
                onBlur={onNameSubmit}
                onKeyDown={onKeyPress}
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
                onClick={(e) => onEditClick(page, e)}
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
                onClick={(e) => onDeleteClick(page, e)}
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
  );
};
