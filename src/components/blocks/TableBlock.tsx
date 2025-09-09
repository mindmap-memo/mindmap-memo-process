import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TableBlock, TableCell, TableColumn, CellType } from '../../types';
import { FormulaEngine } from '../../utils/formulaEngine';
import { globalDataRegistry } from '../../utils/dataRegistry';
import CellEditor from '../table/CellEditor';
import ColumnTypeSelector from '../table/ColumnTypeSelector';

interface TableBlockProps {
  block: TableBlock;
  isEditing?: boolean;
  onUpdate?: (block: TableBlock) => void;
  pageId?: string;
  memoId?: string;
}

const TableBlockComponent: React.FC<TableBlockProps> = ({ 
  block, 
  isEditing = false, 
  onUpdate,
  pageId = '',
  memoId = ''
}) => {
  const [headers, setHeaders] = useState(block.headers);
  const [rows, setRows] = useState(block.rows);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [cells, setCells] = useState<TableCell[][]>([]);
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [availableDataNames, setAvailableDataNames] = useState<string[]>([]);
  const [showColumnTypeSelector, setShowColumnTypeSelector] = useState(false);
  const [typeSelectorPosition, setTypeSelectorPosition] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);

  const formulaEngine = useMemo(() => 
    new FormulaEngine(globalDataRegistry.getRegistry()), 
    []
  );

  // Initialize columns from block data
  const initializeColumnsFromBlock = useCallback((tableBlock: TableBlock): TableColumn[] => {
    const { headers, columns: existingColumns } = tableBlock;
    
    if (existingColumns && existingColumns.length > 0) {
      return existingColumns;
    }
    
    // Create default columns from headers (all text type)
    return headers.map((header, index) => ({
      id: `col-${index}`,
      name: header,
      type: 'text' as CellType
    }));
  }, []);

  // Initialize cells from block data
  function initializeCells(tableBlock: TableBlock): TableCell[][] {
    const { headers, rows, cells: existingCells, columns: blockColumns } = tableBlock;
    
    if (existingCells && existingCells.length > 0) {
      return existingCells;
    }
    
    const cols = blockColumns || initializeColumnsFromBlock(tableBlock);
    
    // Convert legacy string-based rows to cell objects with column types
    return rows.map(row => 
      row.map((cellValue, colIndex) => {
        const column = cols[colIndex];
        const cellType = column?.type || 'text';
        
        let processedValue: any = cellValue;
        
        // Convert value based on column type
        switch (cellType) {
          case 'number':
            processedValue = parseFloat(cellValue) || 0;
            break;
          case 'checkbox':
            processedValue = cellValue === 'true' || cellValue === '1';
            break;
          case 'date':
            processedValue = cellValue || new Date().toISOString().split('T')[0];
            break;
          default:
            processedValue = cellValue;
        }
        
        return {
          value: processedValue,
          type: cellType,
          isKey: false,
          options: column?.options,
          format: column?.format
        };
      })
    );
  }

  // Initialize columns and cells from block data
  useEffect(() => {
    const initializedColumns = initializeColumnsFromBlock(block);
    const initializedCells = initializeCells(block);
    setColumns(initializedColumns);
    setCells(initializedCells);
  }, [initializeColumnsFromBlock]);

  useEffect(() => {
    // Subscribe to data registry updates
    const unsubscribe = globalDataRegistry.subscribe(() => {
      setAvailableDataNames(globalDataRegistry.getAllDataNames());
      // Recalculate formulas when data changes
      recalculateFormulas();
    });

    // Initial load of available data names
    setAvailableDataNames(globalDataRegistry.getAllDataNames());

    return unsubscribe;
  }, []);

  const recalculateFormulas = useCallback(() => {
    setCells(prevCells => {
      const newCells = prevCells.map(row =>
        row.map(cell => {
          if (cell.type === 'formula' && cell.formula) {
            const calculatedValue = formulaEngine.evaluateFormula(cell.formula);
            return { ...cell, value: calculatedValue };
          }
          return cell;
        })
      );
      return newCells;
    });
  }, [formulaEngine]);

  const updateBlock = useCallback((newHeaders: string[], newRows: string[][], newCells: TableCell[][], newColumns: TableColumn[]) => {
    if (onUpdate) {
      onUpdate({ 
        ...block, 
        headers: newHeaders, 
        rows: newRows, 
        cells: newCells,
        columns: newColumns
      });
    }
  }, [block, onUpdate]);

  const handleUpdateHeader = (index: number, value: string) => {
    const newHeaders = [...headers];
    const newColumns = [...columns];
    
    newHeaders[index] = value;
    newColumns[index] = { ...newColumns[index], name: value };
    
    setHeaders(newHeaders);
    setColumns(newColumns);
    updateBlock(newHeaders, rows, cells, newColumns);
  };

  const handleUpdateCell = (rowIndex: number, cellIndex: number, newCell: TableCell) => {
    const newCells = [...cells];
    const newRows = [...rows];

    // Update cell data
    newCells[rowIndex][cellIndex] = { ...newCell };
    
    // Update legacy rows data for compatibility
    newRows[rowIndex][cellIndex] = newCell.value?.toString() || '';

    // Handle data registry updates
    if (newCell.dataName && newCell.isKey) {
      globalDataRegistry.registerData(
        newCell.dataName,
        newCell.value,
        {
          pageId,
          memoId,
          blockId: block.id,
          cellId: `${rowIndex}-${cellIndex}`
        },
        newCell.type
      );
    }

    // Handle formula dependencies
    if (newCell.type === 'formula' && newCell.formula) {
      const dependencies = formulaEngine.getDataDependencies(newCell.formula);
      dependencies.forEach(depName => {
        globalDataRegistry.addDependency(depName, newCell.dataName || `${rowIndex}-${cellIndex}`);
      });

      // Evaluate the formula
      const calculatedValue = formulaEngine.evaluateFormula(newCell.formula);
      newCells[rowIndex][cellIndex] = { ...newCell, value: calculatedValue };
      newRows[rowIndex][cellIndex] = calculatedValue?.toString() || '';
    }

    setCells(newCells);
    setRows(newRows);
    updateBlock(headers, newRows, newCells, columns);
  };

  const addColumn = (event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTypeSelectorPosition({
      x: rect.left,
      y: rect.bottom + 5
    });
    setEditingColumnIndex(null); // 새 컬럼 추가
    setShowColumnTypeSelector(true);
  };

  const handleHeaderClick = (event: React.MouseEvent, columnIndex: number) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTypeSelectorPosition({
      x: rect.left,
      y: rect.bottom + 5
    });
    setEditingColumnIndex(columnIndex); // 기존 컬럼 편집
    setShowColumnTypeSelector(true);
  };

  const handleColumnTypeSelect = (columnType: CellType, options?: string[]) => {
    if (editingColumnIndex === null) {
      // 새 컬럼 추가
      const newColumnId = `col-${columns.length}`;
      const newColumnName = `컬럼 ${columns.length + 1}`;
      
      const newColumn: TableColumn = {
        id: newColumnId,
        name: newColumnName,
        type: columnType,
        options,
      };

      const newHeaders = [...headers, newColumnName];
      const newColumns = [...columns, newColumn];
      
      // Create default value for new column based on type
      let defaultValue: any = '';
      switch (columnType) {
        case 'number':
          defaultValue = 0;
          break;
        case 'checkbox':
          defaultValue = false;
          break;
        case 'date':
          defaultValue = new Date().toISOString().split('T')[0];
          break;
        case 'select':
          defaultValue = options?.[0] || '';
          break;
        case 'formula':
          defaultValue = '';
          break;
        default:
          defaultValue = '';
      }

      const newRows = rows.map(row => [...row, defaultValue?.toString() || '']);
      const newCells = cells.map(row => [...row, {
        value: defaultValue,
        type: columnType,
        isKey: false,
        options,
        format: newColumn.format
      }]);

      setHeaders(newHeaders);
      setColumns(newColumns);
      setRows(newRows);
      setCells(newCells);
      updateBlock(newHeaders, newRows, newCells, newColumns);
    } else {
      // 기존 컬럼 타입 변경
      const newColumns = [...columns];
      newColumns[editingColumnIndex] = {
        ...newColumns[editingColumnIndex],
        type: columnType,
        options
      };

      // 해당 컬럼의 모든 셀 타입 변경 및 값 변환
      const newCells = cells.map(row => {
        const newRow = [...row];
        if (newRow[editingColumnIndex]) {
          let convertedValue = newRow[editingColumnIndex].value;
          
          // 타입에 따른 값 변환
          switch (columnType) {
            case 'number':
              convertedValue = parseFloat(convertedValue) || 0;
              break;
            case 'checkbox':
              convertedValue = convertedValue === 'true' || convertedValue === true || convertedValue === '1';
              break;
            case 'date':
              convertedValue = convertedValue || new Date().toISOString().split('T')[0];
              break;
            case 'select':
              convertedValue = options?.[0] || '';
              break;
            default:
              convertedValue = convertedValue?.toString() || '';
          }

          newRow[editingColumnIndex] = {
            ...newRow[editingColumnIndex],
            type: columnType,
            value: convertedValue,
            options
          };
        }
        return newRow;
      });

      setColumns(newColumns);
      setCells(newCells);
      updateBlock(headers, rows, newCells, newColumns);
    }
    
    setShowColumnTypeSelector(false);
    setEditingColumnIndex(null);
  };

  const addRow = () => {
    const newRow = columns.map(column => {
      switch (column.type) {
        case 'number':
          return '0';
        case 'checkbox':
          return 'false';
        case 'date':
          return new Date().toISOString().split('T')[0];
        case 'select':
          return column.options?.[0] || '';
        default:
          return '';
      }
    });
    
    const newRows = [...rows, newRow];
    const newCellRow = columns.map(column => ({
      value: column.type === 'number' ? 0 : 
             column.type === 'checkbox' ? false :
             column.type === 'date' ? new Date().toISOString().split('T')[0] :
             column.type === 'select' ? (column.options?.[0] || '') : '',
      type: column.type,
      isKey: false,
      options: column.options,
      format: column.format
    }));
    const newCells = [...cells, newCellRow];

    setRows(newRows);
    setCells(newCells);
    updateBlock(headers, newRows, newCells, columns);
  };

  const deleteColumn = (index: number) => {
    if (headers.length <= 1) return;

    const newHeaders = headers.filter((_, i) => i !== index);
    const newColumns = columns.filter((_, i) => i !== index);
    const newRows = rows.map(row => row.filter((_, i) => i !== index));
    const newCells = cells.map(row => row.filter((_, i) => i !== index));

    setHeaders(newHeaders);
    setColumns(newColumns);
    setRows(newRows);
    setCells(newCells);
    updateBlock(newHeaders, newRows, newCells, newColumns);
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) return;

    const newRows = rows.filter((_, i) => i !== index);
    const newCells = cells.filter((_, i) => i !== index);

    setRows(newRows);
    setCells(newCells);
    updateBlock(headers, newRows, newCells, columns);
  };

  const startEditingCell = (rowIndex: number, cellIndex: number) => {
    setEditingCell({ row: rowIndex, col: cellIndex });
  };

  const finishEditingCell = () => {
    setEditingCell(null);
  };

  // Initialize empty table
  if (headers.length === 0 || rows.length === 0) {
    const initialHeaders = ['컬럼 1'];
    const initialColumns: TableColumn[] = [{
      id: 'col-0',
      name: '컬럼 1',
      type: 'text'
    }];
    const initialRows = [[''], ['']];
    const initialCells = initialRows.map(row =>
      row.map(() => ({
        value: '',
        type: 'text' as CellType,
        isKey: false
      }))
    );
    
    if (isEditing) {
      setHeaders(initialHeaders);
      setColumns(initialColumns);
      setRows(initialRows);
      setCells(initialCells);
      updateBlock(initialHeaders, initialRows, initialCells, initialColumns);
    }
  }

  return (
    <div style={{ 
      marginBottom: '8px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      {/* Table type selector */}
      {isEditing && (
        <div style={{
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e0e0e0',
          fontSize: '12px'
        }}>
          <label style={{ marginRight: '12px' }}>
            테이블 타입:
            <select
              value={block.tableType || 'basic'}
              onChange={(e) => {
                if (onUpdate) {
                  onUpdate({ ...block, tableType: e.target.value as any });
                }
              }}
              style={{
                marginLeft: '4px',
                padding: '2px 4px',
                fontSize: '12px'
              }}
            >
              <option value="basic">기본</option>
              <option value="data-collection">데이터 수집</option>
              <option value="approval-matrix">승인 매트릭스</option>
              <option value="timeline">타임라인</option>
              <option value="checklist">체크리스트</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={block.autoSum || false}
              onChange={(e) => {
                if (onUpdate) {
                  onUpdate({ ...block, autoSum: e.target.checked });
                }
              }}
              style={{ marginLeft: '12px', marginRight: '4px' }}
            />
            자동 합계
          </label>
        </div>
      )}

      <div style={{
        overflowX: 'auto',
        maxWidth: '100%'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '14px',
          minWidth: 'max-content'
        }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            {headers.map((header, index) => {
              const column = columns[index];
              const typeIcon = getColumnTypeIcon(column?.type);
              
              return (
                <th key={index} style={{
                  border: '1px solid #e0e0e0',
                  padding: '8px',
                  textAlign: 'left',
                  fontWeight: '600',
                  position: 'relative',
                  minWidth: '120px'
                }}>
                  {isEditing ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
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
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHeaderClick(e, index);
                        }}
                        style={{
                          fontSize: '11px',
                          color: '#666',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          border: '1px solid transparent'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = '#e9ecef';
                          (e.target as HTMLElement).style.border = '1px solid #dee2e6';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = 'transparent';
                          (e.target as HTMLElement).style.border = '1px solid transparent';
                        }}
                      >
                        <span>{typeIcon}</span>
                        <span>{getColumnTypeLabel(column?.type)}</span>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={(e) => handleHeaderClick(e, index)}
                      style={{
                        cursor: 'pointer',
                        padding: '2px',
                        borderRadius: '3px',
                        transition: 'background-color 0.1s'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <div>{header}</div>
                      <div style={{
                        fontSize: '11px',
                        color: '#666',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '2px'
                      }}>
                        <span>{typeIcon}</span>
                        <span>{getColumnTypeLabel(column?.type)}</span>
                      </div>
                    </div>
                  )}
                </th>
              );
            })}
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
          {cells.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{
                  border: '1px solid #e0e0e0',
                  padding: '4px',
                  position: 'relative'
                }}>
                  <CellEditor
                    cell={cell}
                    isEditing={editingCell?.row === rowIndex && editingCell?.col === cellIndex}
                    onUpdate={(updatedCell) => handleUpdateCell(rowIndex, cellIndex, updatedCell)}
                    onStartEdit={() => startEditingCell(rowIndex, cellIndex)}
                    onFinishEdit={finishEditingCell}
                    availableDataNames={availableDataNames}
                  />
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

      {/* Summary row for auto-sum */}
      {block.autoSum && (
        <div style={{
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e0e0e0',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>합계:</span>
          {headers.map((header, colIndex) => {
            const columnSum = cells.reduce((sum, row) => {
              const cellValue = row[colIndex]?.value;
              return sum + (typeof cellValue === 'number' ? cellValue : 0);
            }, 0);
            return (
              <span key={colIndex} style={{ minWidth: '60px', textAlign: 'right' }}>
                {columnSum > 0 ? columnSum.toLocaleString() : '-'}
              </span>
            );
          })}
        </div>
      )}

      {/* Column Type Selector */}
      {showColumnTypeSelector && (
        <ColumnTypeSelector
          onSelectType={handleColumnTypeSelect}
          onCancel={() => setShowColumnTypeSelector(false)}
          position={typeSelectorPosition}
        />
      )}
    </div>
  );
};

// Helper functions
const getColumnTypeIcon = (type?: CellType): string => {
  switch (type) {
    case 'text': return '📝';
    case 'number': return '🔢';
    case 'date': return '📅';
    case 'checkbox': return '☑️';
    case 'select': return '📋';
    case 'formula': return '🧮';
    default: return '📝';
  }
};

const getColumnTypeLabel = (type?: CellType): string => {
  switch (type) {
    case 'text': return '텍스트';
    case 'number': return '숫자';
    case 'date': return '날짜';
    case 'checkbox': return '체크박스';
    case 'select': return '선택형';
    case 'formula': return '수식';
    default: return '텍스트';
  }
};

export default TableBlockComponent;