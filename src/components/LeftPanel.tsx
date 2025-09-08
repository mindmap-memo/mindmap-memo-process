import React from 'react';
import { Page } from '../types';
import Resizer from './Resizer';

interface LeftPanelProps {
  pages: Page[];
  currentPageId: string;
  onPageSelect: (pageId: string) => void;
  onAddPage: () => void;
  onPageNameChange: (pageId: string, newName: string) => void;
  width: number;
  onResize: (deltaX: number) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ 
  pages, 
  currentPageId, 
  onPageSelect, 
  onAddPage,
  onPageNameChange,
  width,
  onResize
}) => {
  const [editingPageId, setEditingPageId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState<string>('');

  const handleDoubleClick = (page: Page) => {
    setEditingPageId(page.id);
    setEditingName(page.name);
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
      </div>
      
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, flex: 1, fontSize: '18px', fontWeight: '600', color: '#374151' }}>페이지</h3>
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
              fontWeight: '500'
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
              page.name
            )}
          </div>
        ))}
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