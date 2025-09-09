import React, { useState, useRef, useEffect } from 'react';
import { CellType } from '../../types';

interface ColumnTypeSelectorProps {
  onSelectType: (type: CellType, options?: string[]) => void;
  onCancel: () => void;
  position?: { x: number; y: number };
}

const ColumnTypeSelector: React.FC<ColumnTypeSelectorProps> = ({
  onSelectType,
  onCancel,
  position = { x: 0, y: 0 }
}) => {
  const [showSelectOptions, setShowSelectOptions] = useState<CellType | null>(null);
  const [selectOptions, setSelectOptions] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  const columnTypes = [
    { type: 'text' as CellType, label: '텍스트', icon: '📝' },
    { type: 'number' as CellType, label: '숫자', icon: '🔢' },
    { type: 'date' as CellType, label: '날짜', icon: '📅' },
    { type: 'checkbox' as CellType, label: '체크박스', icon: '☑️' },
    { type: 'select' as CellType, label: '선택형', icon: '📋' },
    { type: 'formula' as CellType, label: '수식', icon: '🧮' }
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
          position: 'absolute',
          top: position.y,
          left: position.x,
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          minWidth: '160px',
          padding: '6px'
        }}
      >
        {showSelectOptions ? (
          // Select options input
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#333'
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
                padding: '6px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                marginBottom: '8px'
              }}
              autoFocus
            />
            <div style={{
              display: 'flex',
              gap: '4px'
            }}>
              <button
                onClick={handleSelectOptionsConfirm}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                확인
              </button>
              <button
                onClick={() => setShowSelectOptions(null)}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
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
            <div style={{
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '6px',
              color: '#333'
            }}>
              열 타입 선택
            </div>
            {columnTypes.map(({ type, label, icon }) => (
              <div
                key={type}
                onClick={() => handleTypeSelect(type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '13px',
                  transition: 'background-color 0.1s'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ fontSize: '14px' }}>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
};

export default ColumnTypeSelector;