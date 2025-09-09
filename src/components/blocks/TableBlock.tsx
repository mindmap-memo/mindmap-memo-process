import React, { useState } from 'react';
import { TableBlock } from '../../types';

interface TableBlockProps {
  block: TableBlock;
  isEditing?: boolean;
  onUpdate?: (block: TableBlock) => void;
}

const TableBlockComponent: React.FC<TableBlockProps> = ({ 
  block, 
  isEditing = false, 
  onUpdate 
}) => {
  const [headers, setHeaders] = useState(block.headers);
  const [rows, setRows] = useState(block.rows);

  const handleUpdateHeader = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);
    updateBlock(newHeaders, rows);
  };

  const handleUpdateCell = (rowIndex: number, cellIndex: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex][cellIndex] = value;
    setRows(newRows);
    updateBlock(headers, newRows);
  };

  const updateBlock = (newHeaders: string[], newRows: string[][]) => {
    if (onUpdate) {
      onUpdate({ ...block, headers: newHeaders, rows: newRows });
    }
  };

  const addColumn = () => {
    const newHeaders = [...headers, `컬럼 ${headers.length + 1}`];
    const newRows = rows.map(row => [...row, '']);
    setHeaders(newHeaders);
    setRows(newRows);
    updateBlock(newHeaders, newRows);
  };

  const addRow = () => {
    const newRow = new Array(headers.length).fill('');
    const newRows = [...rows, newRow];
    setRows(newRows);
    updateBlock(headers, newRows);
  };

  const deleteColumn = (index: number) => {
    if (headers.length <= 1) return;
    const newHeaders = headers.filter((_, i) => i !== index);
    const newRows = rows.map(row => row.filter((_, i) => i !== index));
    setHeaders(newHeaders);
    setRows(newRows);
    updateBlock(newHeaders, newRows);
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
    updateBlock(headers, newRows);
  };

  // 초기 테이블이 없는 경우 기본 구조 생성
  if (headers.length === 0 || rows.length === 0) {
    const initialHeaders = ['컬럼 1', '컬럼 2', '컬럼 3'];
    const initialRows = [['', '', ''], ['', '', '']];
    
    if (isEditing) {
      setHeaders(initialHeaders);
      setRows(initialRows);
      updateBlock(initialHeaders, initialRows);
    }
  }

  return (
    <div style={{ 
      marginBottom: '8px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        fontSize: '14px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            {headers.map((header, index) => (
              <th key={index} style={{
                border: '1px solid #e0e0e0',
                padding: '8px',
                textAlign: 'left',
                fontWeight: '600',
                position: 'relative'
              }}>
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => handleUpdateHeader(index, e.target.value)}
                      style={{
                        flex: 1,
                        border: 'none',
                        backgroundColor: 'transparent',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}
                    />
                    {headers.length > 1 && (
                      <button
                        onClick={() => deleteColumn(index)}
                        style={{
                          padding: '2px 4px',
                          backgroundColor: '#e53e3e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          fontSize: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ) : (
                  header
                )}
              </th>
            ))}
            {isEditing && (
              <th style={{
                border: '1px solid #e0e0e0',
                padding: '8px',
                width: '40px'
              }}>
                <button
                  onClick={addColumn}
                  style={{
                    padding: '2px 6px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  +
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{
                  border: '1px solid #e0e0e0',
                  padding: '8px'
                }}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleUpdateCell(rowIndex, cellIndex, e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    cell
                  )}
                </td>
              ))}
              {isEditing && (
                <td style={{
                  border: '1px solid #e0e0e0',
                  padding: '8px',
                  textAlign: 'center'
                }}>
                  {rows.length > 1 && (
                    <button
                      onClick={() => deleteRow(rowIndex)}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: '#e53e3e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {isEditing && (
            <tr>
              <td 
                colSpan={headers.length + 1} 
                style={{
                  border: '1px solid #e0e0e0',
                  padding: '8px',
                  textAlign: 'center'
                }}
              >
                <button
                  onClick={addRow}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  + 행 추가
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TableBlockComponent;