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
      backgroundColor: 'white',
      color: '#374151',
      padding: '20px',
      borderRight: '1px solid #e5e7eb',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, flex: 1 }}>페이지</h3>
        <button
          onClick={onAddPage}
          style={{
            backgroundColor: 'white',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.color = '#6b7280';
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
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: currentPageId === page.id ? '#f3f4f6' : 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
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
      <Resizer direction="left" onResize={onResize} />
    </div>
  );
};

export default LeftPanel;