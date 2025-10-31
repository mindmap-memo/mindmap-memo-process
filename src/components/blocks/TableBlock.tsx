import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TableBlock, TableCell, TableColumn, CellType, ImportanceLevel } from '../../types';
import { FormulaEngine } from '../../utils/formulaEngine';
import { globalDataRegistry } from '../../utils/dataRegistry';
import { getImportanceStyle } from '../../utils/importanceStyles';
import CellEditor from '../table/CellEditor';
import ColumnTypeSelector from '../table/ColumnTypeSelector';
import { useCellSelection } from './TableBlock/hooks/useCellSelection';
import { useColumnResize } from './TableBlock/hooks/useColumnResize';
import { useRowSelection } from './TableBlock/hooks/useRowSelection';
import { initializeColumnsFromBlock, initializeCells } from './TableBlock/utils/tableInitializers';

interface TableBlockProps {
  block: TableBlock;
  isEditing?: boolean;
  onUpdate?: (block: TableBlock) => void;
  pageId?: string;
  memoId?: string;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
}

const TableBlockComponent: React.FC<TableBlockProps> = ({
  block,
  isEditing = false,
  onUpdate,
  pageId = '',
  memoId = '',
  activeImportanceFilters,
  showGeneralContent
}) => {
  // 모든 Hooks를 먼저 호출
  const [headers, setHeaders] = useState(block.headers);
  const [rows, setRows] = useState(block.rows);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [cells, setCells] = useState<TableCell[][]>([]);
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [availableDataNames, setAvailableDataNames] = useState<string[]>([]);
  const [showColumnTypeSelector, setShowColumnTypeSelector] = useState(false);
  const [typeSelectorPosition, setTypeSelectorPosition] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // 커스텀 훅 사용
  const cellSelection = useCellSelection();
  const rowSelection = useRowSelection();
  const columnResize = useColumnResize({
    initialWidths: block.columns?.length ? new Array(block.columns.length).fill(150) : [],
    columnCount: columns.length
  });

  const formulaEngine = useMemo(() =>
    new FormulaEngine(globalDataRegistry.getRegistry()),
    []
  );

  // 중요도 스타일 가져오기
  const importanceStyle = getImportanceStyle(block.importance);

  // 전역 마우스 이벤트 처리 (드래그 선택 완료)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (cellSelection.isDragSelecting) {
        cellSelection.finishDragSelection();
      }
    };

    if (cellSelection.isDragSelecting) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [cellSelection.isDragSelecting, cellSelection.finishDragSelection]);

  // Initialize columns and cells from block data
  useEffect(() => {
    const initializedColumns = initializeColumnsFromBlock(block);
    const initializedCells = initializeCells(block, initializedColumns);
    setColumns(initializedColumns);
    setCells(initializedCells);
  }, [block]);

  // Handle clicks outside table to finish editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingCell && tableContainerRef.current) {
        const target = event.target as Node;
        // 테이블 컨테이너 영역을 벗어난 클릭인지 확인
        if (!tableContainerRef.current.contains(target)) {
          finishEditingCell();
        }
      }
    };

    if (editingCell) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingCell]);

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
    event.preventDefault();
    event.stopPropagation();
    
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const selectorWidth = 240; // ColumnTypeSelector 너비
    const selectorHeight = 400; // 대략적인 높이 (검색창 + 옵션들)
    
    // 화면 크기 가져오기
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // x 위치 조정 (오른쪽으로 넘어가지 않게)
    let x = rect.left;
    if (x + selectorWidth > viewportWidth) {
      x = viewportWidth - selectorWidth - 10; // 10px 여백
    }
    
    // y 위치 조정 (아래쪽으로 넘어가지 않게)
    let y = rect.bottom + 5;
    if (y + selectorHeight > viewportHeight) {
      y = rect.top - selectorHeight - 5; // 버튼 위쪽에 표시
      if (y < 0) {
        y = 10; // 위쪽도 안되면 화면 위쪽에
      }
    }
    
    setTypeSelectorPosition({ x, y });
    setEditingColumnIndex(null); // 새 컬럼 추가
    setShowColumnTypeSelector(true);
  };

  const handleHeaderClick = (event: React.MouseEvent, columnIndex: number) => {
    if (isResizing) return; // 리사이즈 중일 때는 헤더 클릭 무시
    
    event.preventDefault();
    event.stopPropagation();
    
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const selectorWidth = 240; // ColumnTypeSelector 너비
    const selectorHeight = 400; // 대략적인 높이 (검색창 + 옵션들)
    
    // 화면 크기 가져오기
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // x 위치 조정 (오른쪽으로 넘어가지 않게)
    let x = rect.left;
    if (x + selectorWidth > viewportWidth) {
      x = viewportWidth - selectorWidth - 10; // 10px 여백
    }
    
    // y 위치 조정 (아래쪽으로 넘어가지 않게)
    let y = rect.bottom + 2;
    if (y + selectorHeight > viewportHeight) {
      y = rect.top - selectorHeight - 2; // 헤더 위쪽에 표시
      if (y < 0) {
        y = 10; // 위쪽도 안되면 화면 위쪽에
      }
    }
    
    setTypeSelectorPosition({ x, y });
    setEditingColumnIndex(columnIndex);
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
        case 'file':
          defaultValue = '';
          break;
        case 'email':
          defaultValue = '';
          break;
        case 'phone':
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
      columnResize.setColumnWidths([...columnResize.columnWidths, 150]); // 새 컬럼 기본 너비 150px
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
          
          // 타입에 따른 값 변환 (빈 값은 그대로 유지)
          const isEmpty = !convertedValue || convertedValue === '' || convertedValue === null || convertedValue === undefined;
          
          if (isEmpty) {
            // 빈 값은 빈 상태로 유지
            switch (columnType) {
              case 'number':
                convertedValue = '';
                break;
              case 'checkbox':
                convertedValue = false;
                break;
              case 'date':
                convertedValue = '';
                break;
              case 'select':
                convertedValue = '';
                break;
              default:
                convertedValue = '';
            }
          } else {
            // 값이 있는 경우에만 타입에 맞게 변환
            switch (columnType) {
              case 'number':
                const numValue = parseFloat(convertedValue);
                convertedValue = isNaN(numValue) ? '' : numValue;
                break;
              case 'checkbox':
                convertedValue = convertedValue === 'true' || convertedValue === true || convertedValue === '1';
                break;
              case 'date':
                // 기존 값이 유효한 날짜인지 확인
                convertedValue = convertedValue?.toString() || '';
                break;
              case 'select':
                convertedValue = convertedValue?.toString() || '';
                break;
              case 'file':
                convertedValue = convertedValue?.toString() || '';
                break;
              case 'email':
                convertedValue = convertedValue?.toString() || '';
                break;
              case 'phone':
                convertedValue = convertedValue?.toString() || '';
                break;
              default:
                convertedValue = convertedValue?.toString() || '';
            }
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

  const handleColumnDelete = () => {
    if (editingColumnIndex !== null && headers.length > 1) {
      deleteColumn(editingColumnIndex);
    }
    setShowColumnTypeSelector(false);
    setEditingColumnIndex(null);
  };


  const handleCopySelectedRows = () => {
    const sortedRows = Array.from(rowSelection.selectedRows).sort((a, b) => a - b);
    const rowsToCopy = sortedRows.map(rowIndex => ({
      row: [...rows[rowIndex]],
      cell: [...cells[rowIndex]]
    }));

    let newRows = [...rows];
    let newCells = [...cells];

    // Insert copied rows after the last selected row
    const insertIndex = Math.max(...sortedRows) + 1;

    rowsToCopy.forEach((rowData, index) => {
      newRows.splice(insertIndex + index, 0, rowData.row);
      newCells.splice(insertIndex + index, 0, rowData.cell);
    });

    setRows(newRows);
    setCells(newCells);
    rowSelection.clearRowSelection();
    rowSelection.setShowRowContextMenu(false);
    updateBlock(headers, newRows, newCells, columns);
  };

  const handleDeleteSelectedRows = () => {
    const sortedRows = Array.from(rowSelection.selectedRows).sort((a, b) => b - a);

    if (rows.length - sortedRows.length < 1) {
      return; // 최소 1개 행은 유지
    }

    let newRows = [...rows];
    let newCells = [...cells];

    sortedRows.forEach(rowIndex => {
      newRows = newRows.filter((_, index) => index !== rowIndex);
      newCells = newCells.filter((_, index) => index !== rowIndex);
    });

    setRows(newRows);
    setCells(newCells);
    rowSelection.clearRowSelection();
    rowSelection.setShowRowContextMenu(false);
    updateBlock(headers, newRows, newCells, columns);
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
        case 'file':
          return '';
        case 'email':
          return '';
        case 'phone':
          return '';
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
    const newColumnWidths = columnResize.columnWidths.filter((_, i) => i !== index);

    setHeaders(newHeaders);
    setColumns(newColumns);
    setRows(newRows);
    setCells(newCells);
    columnResize.setColumnWidths(newColumnWidths);
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
    // 편집 시작 시 선택 상태 해제
    cellSelection.clearSelection();
    setEditingCell({ row: rowIndex, col: cellIndex });
  };

  const finishEditingCell = () => {
    if (editingCell) {
      // 편집이 끝난 셀을 선택 상태로 만들기
      const cellKey = cellSelection.getCellKey(editingCell.row, editingCell.col);
      cellSelection.selectCells(new Set([cellKey]));
      cellSelection.setLastSelectedCell(editingCell);
    }
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

    setHeaders(initialHeaders);
    setColumns(initialColumns);
    setRows(initialRows);
    setCells(initialCells);
    if (onUpdate) {
      onUpdate({
        ...block,
        headers: initialHeaders,
        rows: initialRows,
        cells: initialCells,
        columns: initialColumns
      });
    }
  }

  // 필터링 체크 (렌더링 단계에서 처리)
  const shouldShow = (() => {
    // 편집 모드에서는 항상 표시
    if (isEditing) return true;

    // 중요도가 있는 경우
    if (block.importance) {
      return activeImportanceFilters ? activeImportanceFilters.has(block.importance) : true;
    }

    // 중요도가 없는 경우 (일반 내용)
    return showGeneralContent !== false;
  })();

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      ref={tableContainerRef}
      style={{
        marginBottom: '8px',
        overflow: 'visible',
        position: 'relative',
        paddingLeft: isEditing ? '40px' : '0',
        paddingBottom: isEditing ? '44px' : '0',
        padding: importanceStyle.backgroundColor ? '8px' : undefined,
        borderRadius: '4px',
        ...importanceStyle
      }}
    >

      <div style={{
        position: 'relative'
      }}>
        <div style={{
          overflowX: 'auto',
          border: importanceStyle.borderLeft ? 'none' : '1px solid #e0e0e0',
          borderRadius: '4px',
          backgroundColor: 'white'
        }}>
          <table ref={tableRef} style={{ 
            minWidth: 'max-content',
            borderCollapse: 'collapse',
            fontSize: '14px',
            tableLayout: 'auto'
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
                width: `${columnResize.columnWidths[index] || 150}px`,
                maxWidth: `${columnResize.columnWidths[index] || 150}px`,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              onClick={(e) => e.stopPropagation()}>
                <div 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleHeaderClick(e, index);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleHeaderClick(e, index);
                  }}
                  style={{
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '3px',
                    transition: 'background-color 0.1s',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.backgroundColor = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.backgroundColor = 'transparent';
                  }}
                >
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => handleUpdateHeader(index, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '100%',
                          border: 'none',
                          backgroundColor: 'transparent',
                          fontWeight: '600',
                          fontSize: '14px',
                          marginBottom: '4px'
                        }}
                      />
                      <div style={{
                        fontSize: '11px',
                        color: '#666',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>{typeIcon}</span>
                        <span>{getColumnTypeLabel(column?.type)}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '2px' }}>{header}</div>
                      <div style={{
                        fontSize: '11px',
                        color: '#666',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>{typeIcon}</span>
                        <span>{getColumnTypeLabel(column?.type)}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 리사이즈 핸들 */}
                {index < headers.length - 1 && ( // 마지막 컬럼은 리사이즈 핸들 없음
                  <div
                    onMouseDown={(e) => columnResize.handleResizeStart(e, index)}
                    style={{
                      position: 'absolute',
                      top: '0',
                      right: '-4px',
                      width: '8px',
                      height: '100%',
                      cursor: 'col-resize',
                      backgroundColor: 'transparent',
                      zIndex: 1000,
                      borderRight: columnResize.isResizing && columnResize.resizingColumn === index ? '2px solid #007acc' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 122, 204, 0.1)';
                      (e.currentTarget as HTMLElement).style.borderRight = '2px solid #007acc';
                    }}
                    onMouseLeave={(e) => {
                      if (!columnResize.isResizing) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.borderRight = 'none';
                      }
                    }}
                  />
                )}
              </th>
            );
          })}
          {isEditing && (
            <th style={{
              border: 'none',
              padding: '8px',
              width: '40px'
            }}
            onClick={(e) => e.stopPropagation()}>
              <div
                onClick={addColumn}
                style={{
                  padding: '2px 6px',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontWeight: 'bold'
                }}
              >
                +
              </div>
            </th>
          )}
        </tr>
      </thead>
        <tbody>
          {cells.filter(row => Array.isArray(row)).map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onContextMenu={(e) => rowSelection.handleRowContextMenu(e, rowIndex)}
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{
                  border: (editingCell?.row === rowIndex && editingCell?.col === cellIndex) ? '1px solid #e0e0e0' :
                          cellSelection.isCellSelected(rowIndex, cellIndex) ? '2px solid #007acc' : '1px solid #e0e0e0',
                  padding: '4px',
                  position: 'relative',
                  backgroundColor: (editingCell?.row === rowIndex && editingCell?.col === cellIndex) ? 'white' :
                                   cellSelection.isCellInDragRange(rowIndex, cellIndex) ? '#c7e6ff' :
                                   cellSelection.isCellSelected(rowIndex, cellIndex) ? '#e7f3ff' :
                                   rowSelection.selectedRows.has(rowIndex) ? '#f0f8ff' : 'transparent',
                  width: `${columnResize.columnWidths[cellIndex] || 150}px`,
                  maxWidth: `${columnResize.columnWidths[cellIndex] || 150}px`,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  // 드래그 선택 시작
                  cellSelection.startDragSelection(rowIndex, cellIndex);

                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    // 일반 클릭: 기존 선택 초기화
                    cellSelection.selectCells(new Set([cellSelection.getCellKey(rowIndex, cellIndex)]));
                    cellSelection.setLastSelectedCell({row: rowIndex, col: cellIndex});
                  }
                }}
                onMouseEnter={(e) => {
                  if (cellSelection.isDragSelecting) {
                    cellSelection.updateDragSelection(rowIndex, cellIndex);
                  }
                }}
                onMouseUp={(e) => {
                  if (cellSelection.isDragSelecting && cellSelection.dragStartCell && cellSelection.dragEndCell) {
                    e.stopPropagation();
                    // 드래그 선택 완료
                    const selection = cellSelection.getCellsInRange(
                      cellSelection.dragStartCell.row,
                      cellSelection.dragStartCell.col,
                      cellSelection.dragEndCell.row,
                      cellSelection.dragEndCell.col
                    );

                    if (e.ctrlKey || e.metaKey) {
                      // Ctrl/Cmd 드래그: 기존 선택에 추가
                      const newSelection = new Set([...Array.from(cellSelection.selectedCells), ...Array.from(selection)]);
                      cellSelection.selectCells(newSelection);
                    } else {
                      // 일반 드래그: 새로운 선택
                      cellSelection.selectCells(selection);
                    }

                    cellSelection.setLastSelectedCell(cellSelection.dragEndCell);
                    cellSelection.finishDragSelection();
                  }
                }}
                onClick={(e) => {
                  if (!cellSelection.isDragSelecting) {
                    e.stopPropagation();
                    // 셀 클릭 시 해당 셀을 선택 상태로 설정 (드래그가 아닌 경우에만)
                    if (e.ctrlKey || e.metaKey) {
                      // Ctrl/Cmd 클릭: 다중 선택
                      const cellKey = cellSelection.getCellKey(rowIndex, cellIndex);
                      const newSelection = new Set(cellSelection.selectedCells);
                      if (newSelection.has(cellKey)) {
                        newSelection.delete(cellKey);
                      } else {
                        newSelection.add(cellKey);
                      }
                      cellSelection.selectCells(newSelection);
                      cellSelection.setLastSelectedCell({row: rowIndex, col: cellIndex});
                    } else if (e.shiftKey && cellSelection.lastSelectedCell) {
                      // Shift 클릭: 범위 선택
                      const startRow = Math.min(cellSelection.lastSelectedCell.row, rowIndex);
                      const endRow = Math.max(cellSelection.lastSelectedCell.row, rowIndex);
                      const startCol = Math.min(cellSelection.lastSelectedCell.col, cellIndex);
                      const endCol = Math.max(cellSelection.lastSelectedCell.col, cellIndex);

                      const newSelection = new Set<string>();
                      for (let r = startRow; r <= endRow; r++) {
                        for (let c = startCol; c <= endCol; c++) {
                          newSelection.add(cellSelection.getCellKey(r, c));
                        }
                      }
                      cellSelection.selectCells(newSelection);
                    }
                  }
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
            </tr>
          ))}
        </tbody>
          </table>
        </div>

        {/* Floating checkbox overlay */}
        {isEditing && (
          <div style={{
            position: 'absolute',
            left: '-40px',
            top: '0',
            width: '40px',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            {/* Header area */}
            <div style={{ 
              height: tableRef.current?.querySelector('thead tr')?.getBoundingClientRect().height || 49
            }} />
            
            {/* Row checkboxes */}
            {cells.filter(row => Array.isArray(row)).map((_, rowIndex) => {
              const rowHeight = tableRef.current?.querySelector(`tbody tr:nth-child(${rowIndex + 1})`)?.getBoundingClientRect().height || 35;
              const isRowSelected = rowSelection.selectedRows.has(rowIndex);
              const shouldShowCheckbox = rowSelection.hoveredRow === rowIndex || isRowSelected;

              return (
                <div
                  key={rowIndex}
                  style={{
                    height: `${rowHeight}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={() => {
                    rowSelection.setHoveredRow(rowIndex);
                  }}
                  onMouseLeave={() => {
                    rowSelection.setHoveredRow(null);
                  }}
                >
                  {shouldShowCheckbox && (
                    <input
                      type="checkbox"
                      checked={isRowSelected}
                      onChange={(e) => rowSelection.handleRowSelect(rowIndex, e.target.checked)}
                      style={{
                        cursor: 'pointer'
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Floating add row button */}
        {isEditing && (
          <div
            style={{
              position: 'absolute',
              bottom: '-44px',
              left: '0',
              right: '0',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              zIndex: 10
            }}
            onClick={(e) => {
              e.stopPropagation();
              addRow();
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget as HTMLElement;
              target.style.backgroundColor = '#f8f9fa';
              target.innerHTML = '+ 행 추가';
              target.style.fontWeight = 'normal';
              target.style.color = '#666';
              target.style.border = '1px dashed #ddd';
              target.style.borderRadius = '4px';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget as HTMLElement;
              target.style.backgroundColor = 'transparent';
              target.style.border = 'none';
              target.innerHTML = '';
            }}
          />
        )}
      </div>


      {/* Column Type Selector */}
      {showColumnTypeSelector && (
        <ColumnTypeSelector
          onSelectType={handleColumnTypeSelect}
          onDeleteColumn={editingColumnIndex !== null ? handleColumnDelete : undefined}
          onCancel={() => {
            setShowColumnTypeSelector(false);
          }}
          position={typeSelectorPosition}
          isEditingExistingColumn={editingColumnIndex !== null}
        />
      )}

      {/* Row Context Menu */}
      {rowSelection.showRowContextMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => rowSelection.closeContextMenu()}
          />
          <div
            style={{
              position: 'fixed',
              top: rowSelection.rowContextMenuPosition.y,
              left: rowSelection.rowContextMenuPosition.x,
              backgroundColor: 'white',
              border: '1px solid #e1e5e9',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              zIndex: 1000,
              minWidth: '160px',
              padding: '8px 0',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            <div
              onClick={handleCopySelectedRows}
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
                ||
              </div>
              <span style={{ fontWeight: '500' }}>복제</span>
            </div>
            
            <div
              onClick={handleDeleteSelectedRows}
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
                ×
              </div>
              <span style={{ fontWeight: '500' }}>삭제</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Helper functions
const getColumnTypeIcon = (type?: CellType): string => {
  switch (type) {
    case 'text': return 'T';
    case 'number': return '#';
    case 'date': return '|';
    case 'file': return '[]';
    case 'checkbox': return '☐';
    case 'email': return '@';
    case 'phone': return '☎';
    case 'formula': return 'Σ';
    case 'select': return '⌄';
    default: return 'T';
  }
};

const getColumnTypeLabel = (type?: CellType): string => {
  switch (type) {
    case 'text': return '텍스트';
    case 'number': return '숫자';
    case 'date': return '날짜';
    case 'file': return '파일과 미디어';
    case 'checkbox': return '체크박스';
    case 'email': return '이메일';
    case 'phone': return '전화번호';
    case 'formula': return '수식';
    case 'select': return '선택형';
    default: return '텍스트';
  }
};

export default TableBlockComponent;