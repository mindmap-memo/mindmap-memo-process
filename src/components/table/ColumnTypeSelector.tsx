import React, { useState, useRef, useEffect } from 'react';
import { CellType } from '../../types';

interface ColumnTypeSelectorProps {
  onSelectType: (type: CellType, options?: string[]) => void;
  onDeleteColumn?: () => void;
  onCancel: () => void;
  position?: { x: number; y: number };
  isEditingExistingColumn?: boolean;
}

const ColumnTypeSelector: React.FC<ColumnTypeSelectorProps> = ({
  onSelectType,
  onDeleteColumn,
  onCancel,
  position = { x: 0, y: 0 },
  isEditingExistingColumn = false
}) => {
  const [showSelectOptions, setShowSelectOptions] = useState<CellType | null>(null);
  const [selectOptions, setSelectOptions] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  const columnTypes = [
    { type: 'text' as CellType, label: '텍스트', icon: 'T', description: '' },
    { type: 'number' as CellType, label: '숫자', icon: '#', description: '' },
    { type: 'select' as CellType, label: '선택', icon: '○', description: '' },
    { type: 'checkbox' as CellType, label: '체크박스', icon: '☐', description: '' },
    { type: 'date' as CellType, label: '날짜', icon: '◐', description: '' },
    { type: 'phone' as CellType, label: '전화번호', icon: '☎', description: '' },
    { type: 'email' as CellType, label: '이메일', icon: '@', description: '' },
    { type: 'file' as CellType, label: '파일과 미디어', icon: '📎', description: '' },
    { type: 'formula' as CellType, label: '수식', icon: 'Σ', description: '' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  const handleTypeSelect = (type: CellType) => {
    if (type === 'select') {
      setShowSelectOptions(type);
    } else {
      onSelectType(type);
    }
  };

  const handleSelectOptionsConfirm = () => {
    const options = selectOptions.split(',').map(opt => opt.trim()).filter(opt => opt);
    onSelectType('select', options.length > 0 ? options : ['옵션1', '옵션2', '옵션3']);
  };

  // 메뉴가 화면 밖으로 나가지 않도록 위치 조정
  const menuWidth = 240;
  const menuHeight = 400; // 대략적인 최대 높이
  const padding = 10;

  let x = position.x;
  let y = position.y;

  // 오른쪽 경계 체크
  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - padding;
  }

  // 왼쪽 경계 체크
  if (x < padding) {
    x = padding;
  }

  // 아래쪽 경계 체크
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - padding;
  }

  // 위쪽 경계 체크
  if (y < padding) {
    y = padding;
  }

  return (
    <>
      {/* Click outside overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999
        }}
        onClick={onCancel}
      />

      {/* Main menu */}
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: y,
          left: x,
          backgroundColor: 'white',
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          zIndex: 9999,
          width: '240px',
          padding: '8px 0',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        {showSelectOptions ? (
          // Select options input
          <div style={{ padding: '0 12px' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              color: '#374151'
            }}>
              선택 옵션 설정
            </div>
            <input
              type="text"
              value={selectOptions}
              onChange={(e) => setSelectOptions(e.target.value)}
              placeholder="옵션1, 옵션2, 옵션3"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <button
                onClick={handleSelectOptionsConfirm}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                확인
              </button>
              <button
                onClick={() => setShowSelectOptions(null)}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          // Type selection menu
          <>
            {/* Search input */}
            <div style={{ padding: '0 12px 8px 12px' }}>
              <input
                type="text"
                placeholder="유형 검색"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#f9fafb',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            {/* Column type options */}
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {columnTypes.map(({ type, label, icon }) => (
                <div
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    color: '#6b7280'
                  }}>
                    {icon}
                  </div>
                  <span style={{ fontWeight: '500' }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Delete column option (only for existing columns) */}
            {isEditingExistingColumn && onDeleteColumn && (
              <>
                <div style={{
                  height: '1px',
                  backgroundColor: '#e5e7eb',
                  margin: '8px 0'
                }} />
                <div
                  onClick={onDeleteColumn}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#dc2626',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}>
                    🗑
                  </div>
                  <span style={{ fontWeight: '500' }}>열 삭제</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default ColumnTypeSelector;