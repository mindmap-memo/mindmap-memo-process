import React, { useState } from 'react';
import { ChecklistBlock, ImportanceLevel } from '../../types';
import { getImportanceStyle } from '../../utils/importanceStyles';

interface ChecklistBlockProps {
  block: ChecklistBlock;
  isEditing?: boolean;
  onUpdate?: (block: ChecklistBlock) => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
}

const ChecklistBlockComponent: React.FC<ChecklistBlockProps> = ({
  block,
  isEditing = false,
  onUpdate,
  activeImportanceFilters,
  showGeneralContent
}) => {
  const [items, setItems] = useState(block.items);

  // 중요도 스타일 가져오기
  const importanceStyle = getImportanceStyle(block.importance);

  const handleToggleCheck = (itemId: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setItems(updatedItems);
    if (onUpdate) {
      onUpdate({ ...block, items: updatedItems });
    }
  };

  const handleUpdateItem = (itemId: string, newText: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, text: newText } : item
    );
    setItems(updatedItems);
    if (onUpdate) {
      onUpdate({ ...block, items: updatedItems });
    }
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    setItems(updatedItems);
    if (onUpdate) {
      onUpdate({ ...block, items: updatedItems });
    }
  };

  const handleAddItem = () => {
    const newItem = {
      id: Date.now().toString(),
      text: '',
      checked: false
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    if (onUpdate) {
      onUpdate({ ...block, items: updatedItems });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
    if (e.key === 'Backspace' && (e.target as HTMLInputElement).value === '') {
      e.preventDefault();
      handleDeleteItem(itemId);
    }
  };

  return (
    <div style={{
      marginBottom: '8px',
      padding: importanceStyle.backgroundColor ? '8px' : '0',
      borderRadius: '4px',
      ...importanceStyle
    }}>
      {items.length === 0 && isEditing ? (
        <div style={{
          padding: '8px',
          border: '1px dashed #ddd',
          borderRadius: '4px',
          textAlign: 'center',
          color: '#666',
          cursor: 'pointer'
        }}
        onClick={handleAddItem}
        >
          + 체크리스트 항목 추가
        </div>
      ) : (
        <div>
          {items.map((item, index) => (
            <div key={item.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 0',
              borderBottom: index < items.length - 1 ? '1px solid #f0f0f0' : 'none'
            }}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => handleToggleCheck(item.id)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              />
              {isEditing ? (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '4px' }}>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleUpdateItem(item.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, item.id)}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      textDecoration: item.checked ? 'line-through' : 'none',
                      opacity: item.checked ? 0.6 : 1
                    }}
                    placeholder="할 일을 입력하세요..."
                  />
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    style={{
                      padding: '2px 6px',
                      border: '1px solid #ff4444',
                      backgroundColor: '#ff4444',
                      color: 'white',
                      borderRadius: '3px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <span style={{
                  flex: 1,
                  fontSize: '14px',
                  textDecoration: item.checked ? 'line-through' : 'none',
                  opacity: item.checked ? 0.6 : 1,
                  color: item.checked ? '#666' : '#000'
                }}>
                  {item.text}
                </span>
              )}
            </div>
          ))}
          
          {isEditing && items.length > 0 && (
            <div style={{
              marginTop: '8px',
              padding: '4px 0',
              textAlign: 'center'
            }}>
              <button
                onClick={handleAddItem}
                style={{
                  padding: '4px 8px',
                  border: '1px dashed #ddd',
                  backgroundColor: 'transparent',
                  color: '#666',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                + 항목 추가
              </button>
            </div>
          )}
        </div>
      )}
      
      {items.length === 0 && !isEditing && (
        <div style={{
          padding: '8px',
          color: '#666',
          fontStyle: 'italic',
          fontSize: '14px'
        }}>
          체크리스트가 비어있습니다
        </div>
      )}
    </div>
  );
};

export default ChecklistBlockComponent;