import React, { useState, useEffect, useRef } from 'react';
import { TableCell, CellType } from '../../types';
import FormulaHelper from './FormulaHelper';

interface CellEditorProps {
  cell: TableCell;
  isEditing: boolean;
  onUpdate: (cell: TableCell) => void;
  onStartEdit: () => void;
  onFinishEdit: () => void;
  availableDataNames: string[];
}

const CellEditor: React.FC<CellEditorProps> = ({
  cell,
  isEditing,
  onUpdate,
  onStartEdit,
  onFinishEdit,
  availableDataNames
}) => {
  const [localValue, setLocalValue] = useState(cell.value);
  // Removed showTypeSelector - cell types are now controlled by columns
  const [showDataNameInput, setShowDataNameInput] = useState(false);
  const [dataNameInput, setDataNameInput] = useState(cell.dataName || '');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showFormulaHelper, setShowFormulaHelper] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(cell.value);
  }, [cell.value]);

  const handleValueChange = (newValue: any) => {
    setLocalValue(newValue);
    onUpdate({ ...cell, value: newValue });
  };

  // Removed handleTypeChange - cell types are now controlled by columns

  const handleDataNameChange = () => {
    if (dataNameInput.trim()) {
      onUpdate({ 
        ...cell, 
        dataName: dataNameInput.trim(),
        isKey: true 
      });
    } else {
      onUpdate({ 
        ...cell, 
        dataName: undefined,
        isKey: false 
      });
    }
    setShowDataNameInput(false);
  };

  const renderCellContent = () => {
    if (isEditing) {
      return renderEditingCell();
    }
    return renderDisplayCell();
  };

  const renderDisplayCell = () => {
    switch (cell.type) {
      case 'checkbox':
        return (
          <div 
            style={{ 
              textAlign: 'center', 
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onClick={() => handleValueChange(!cell.value)}
          >
            {cell.value ? '✓' : '☐'}
          </div>
        );
      
      case 'number':
        const formattedNumber = formatNumber(cell.value, cell.format);
        return <span>{formattedNumber}</span>;
      
      case 'date':
        const formattedDate = cell.value ? new Date(cell.value).toLocaleDateString('ko-KR') : '';
        return <span>{formattedDate}</span>;
      
      case 'select':
        return <span>{cell.value}</span>;
      
      case 'formula':
        return <span style={{ fontStyle: 'italic', color: '#666' }}>{cell.value}</span>;
      
      default:
        return <span>{cell.value}</span>;
    }
  };

  const renderEditingCell = () => {
    switch (cell.type) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={cell.value || false}
            onChange={(e) => handleValueChange(e.target.checked)}
            style={{ transform: 'scale(1.2)' }}
          />
        );
      
      case 'number':
        return (
          <input
            ref={inputRef}
            type="number"
            value={localValue || ''}
            onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
            onBlur={onFinishEdit}
            onKeyDown={(e) => e.key === 'Enter' && onFinishEdit()}
            style={inputStyle}
            autoFocus
          />
        );
      
      case 'date':
        return (
          <input
            ref={inputRef}
            type="date"
            value={localValue || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            onBlur={onFinishEdit}
            style={inputStyle}
            autoFocus
          />
        );
      
      case 'select':
        return (
          <select
            value={localValue || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            onBlur={onFinishEdit}
            style={{...inputStyle, minWidth: '100px'}}
            autoFocus
          >
            <option value="">선택하세요</option>
            {(cell.options || []).map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'formula':
        return (
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              value={localValue || ''}
              onChange={(e) => {
                handleValueChange(e.target.value);
                setShowAutocomplete(e.target.value.includes('@'));
              }}
              onBlur={onFinishEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onFinishEdit();
                if (e.key === 'F1' || (e.ctrlKey && e.key === ' ')) {
                  e.preventDefault();
                  setShowFormulaHelper(!showFormulaHelper);
                }
              }}
              style={{...inputStyle, fontFamily: 'monospace'}}
              placeholder="=SUM(@데이터1, @데이터2) | F1: 함수 도움말"
              autoFocus
            />
            <button
              style={{
                position: 'absolute',
                right: '2px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                border: 'none',
                backgroundColor: '#007bff',
                color: 'white',
                borderRadius: '3px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.preventDefault();
                setShowFormulaHelper(!showFormulaHelper);
              }}
            >
              ?
            </button>
            {showAutocomplete && renderAutocomplete()}
            {showFormulaHelper && (
              <FormulaHelper 
                onInsertFormula={(formula) => {
                  handleValueChange(formula);
                  setShowFormulaHelper(false);
                }}
              />
            )}
          </div>
        );
      
      default:
        return (
          <input
            ref={inputRef}
            type="text"
            value={localValue || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            onBlur={onFinishEdit}
            onKeyDown={(e) => e.key === 'Enter' && onFinishEdit()}
            style={inputStyle}
            autoFocus
          />
        );
    }
  };

  const renderAutocomplete = () => {
    const input = localValue?.toString() || '';
    const match = input.match(/@([a-zA-Z가-힣_]*)$/);
    
    if (!match) return null;
    
    const searchTerm = match[1];
    const suggestions = availableDataNames.filter(name => 
      name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);

    if (suggestions.length === 0) return null;

    return (
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        maxHeight: '150px',
        overflowY: 'auto'
      }}>
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none',
              backgroundColor: 'white'
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              const newValue = input.replace(/@[a-zA-Z가-힣_]*$/, `@${suggestion}`);
              handleValueChange(newValue);
              setShowAutocomplete(false);
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'white';
            }}
          >
            @{suggestion}
          </div>
        ))}
      </div>
    );
  };

  const formatNumber = (value: any, format?: string): string => {
    if (typeof value !== 'number') return value?.toString() || '';
    
    switch (format) {
      case 'currency':
        return value.toLocaleString() + '원';
      case 'percentage':
        return (value * 100).toFixed(1) + '%';
      default:
        return value.toLocaleString();
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    padding: '0'
  };

  return (
    <div 
      style={{ 
        position: 'relative',
        width: '100%',
        minHeight: '20px',
        cursor: isEditing ? 'text' : 'pointer'
      }}
      onClick={() => !isEditing && onStartEdit()}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowDataNameInput(true);
      }}
    >
      {/* Data name indicator */}
      {cell.dataName && (
        <div style={{
          position: 'absolute',
          top: '-6px',
          left: '0',
          fontSize: '10px',
          backgroundColor: cell.isKey ? '#007bff' : '#6c757d',
          color: 'white',
          padding: '1px 4px',
          borderRadius: '2px',
          zIndex: 1
        }}>
          @{cell.dataName}
        </div>
      )}

      {renderCellContent()}

      {/* Type selector removed - types are now controlled by columns */}

      {/* Data name input popup */}
      {showDataNameInput && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
          padding: '8px',
          minWidth: '150px'
        }}>
          <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>
            데이터명 설정
          </div>
          <input
            type="text"
            value={dataNameInput}
            onChange={(e) => setDataNameInput(e.target.value)}
            placeholder="예: 예산_총액"
            style={{
              width: '100%',
              padding: '4px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '12px',
              marginBottom: '8px'
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{
                flex: 1,
                padding: '4px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer',
                backgroundColor: '#007bff',
                color: 'white'
              }}
              onClick={handleDataNameChange}
            >
              확인
            </button>
            <button
              style={{
                flex: 1,
                padding: '4px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
              onClick={() => setShowDataNameInput(false)}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Click outside handler */}
      {(showDataNameInput || showFormulaHelper) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => {
            setShowDataNameInput(false);
            setShowFormulaHelper(false);
          }}
        />
      )}
    </div>
  );
};

const getTypeLabel = (type: CellType): string => {
  switch (type) {
    case 'text': return '텍스트';
    case 'number': return '숫자';
    case 'date': return '날짜';
    case 'select': return '선택형';
    case 'checkbox': return '체크박스';
    case 'formula': return '수식';
    default: return type;
  }
};

export default CellEditor;