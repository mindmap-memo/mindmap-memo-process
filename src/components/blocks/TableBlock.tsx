import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [lastSelectedCell, setLastSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [showRowContextMenu, setShowRowContextMenu] = useState(false);
  const [rowContextMenuPosition, setRowContextMenuPosition] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<{row: number, col: number} | null>(null);
  const [dragEndCell, setDragEndCell] = useState<{row: number, col: number} | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const formulaEngine = useMemo(() => 
    new FormulaEngine(globalDataRegistry.getRegistry()), 
    []
  );

  // 전역 마우스 이벤트 처리 (드래그 선택 완료)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragSelecting) {
        setIsDragSelecting(false);
        setDragStartCell(null);
        setDragEndCell(null);
      }
    };

    if (isDragSelecting) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragSelecting]);

  // Initialize columns from block data
  const initializeColumnsFromBlock = useCallback((tableBlock: TableBlock): TableColumn[] => {
    const { headers, columns: existingColumns } = tableBlock;
    
    console.log('TableBlock - initializeColumnsFromBlock:', {
      headers,
      existingColumns,
      existingColumnsLength: existingColumns?.length
    });
    
    if (existingColumns && existingColumns.length > 0) {
      console.log('Using existing columns:', existingColumns);
      // Google Sheets에서 온 columns 데이터를 TableColumn 형태로 변환
      return existingColumns.map((col, index) => ({
        id: col.id || `col-${index}`,
        name: col.name || (col as any).title || headers[index] || `컬럼 ${index + 1}`,
        type: col.type || 'text' as CellType,
        options: col.options
      }));
    }
    
    // Create default columns from headers (all text type)
    const defaultColumns = headers.map((header, index) => ({
      id: `col-${index}`,
      name: header,
      type: 'text' as CellType
    }));
    
    console.log('Created default columns:', defaultColumns);
    return defaultColumns;
  }, []);

  // Helper functions for cell selection
  const getCellKey = (row: number, col: number) => `${row}-${col}`;
  
  const isCellSelected = (row: number, col: number) => {
    return selectedCells.has(getCellKey(row, col));
  };

  // Calculate cells in drag selection range
  const getCellsInRange = (startRow: number, startCol: number, endRow: number, endCol: number): Set<string> => {
    const cells = new Set<string>();
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        cells.add(getCellKey(row, col));
      }
    }
    
    return cells;
  };

  // Check if cell is in current drag selection
  const isCellInDragRange = (row: number, col: number) => {
    if (!isDragSelecting || !dragStartCell || !dragEndCell) return false;
    
    const minRow = Math.min(dragStartCell.row, dragEndCell.row);
    const maxRow = Math.max(dragStartCell.row, dragEndCell.row);
    const minCol = Math.min(dragStartCell.col, dragEndCell.col);
    const maxCol = Math.max(dragStartCell.col, dragEndCell.col);
    
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  // Initialize cells from block data
  function initializeCells(tableBlock: TableBlock): TableCell[][] {
    const { headers, rows, cells: existingCells, columns: blockColumns } = tableBlock;
    
    if (existingCells && existingCells.length > 0) {
      return existingCells;
    }
    
    const cols = blockColumns || initializeColumnsFromBlock(tableBlock);
    
    // Convert legacy string-based rows to cell objects with column types
    // Add safety check to ensure rows is an array and each row is also an array
    if (!Array.isArray(rows)) {
      console.warn('TableBlock - rows is not an array:', rows);
      return [];
    }
    
    return rows
      .filter(row => Array.isArray(row)) // Filter out non-array elements
      .map(row => 
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

  // 컬럼 너비 초기화
  useEffect(() => {
    if (headers.length > 0 && columnWidths.length === 0) {
      setColumnWidths(new Array(headers.length).fill(150)); // 기본 150px
    }
  }, [headers.length, columnWidths.length]);

  // 리사이즈 중
  const handleResizeMove = useRef<((e: MouseEvent) => void) | null>(null);
  const handleResizeEnd = useRef<(() => void) | null>(null);

  // 리사이즈 시작
  const handleResizeStart = (e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Starting resize for column:', columnIndex);
    
    const startX = e.clientX;
    const startWidth = columnWidths[columnIndex] || 150;
    
    setIsResizing(true);
    setResizingColumn(columnIndex);
    
    handleResizeMove.current = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(20, startWidth + deltaX); // 최소 20px
      
      setColumnWidths(prevWidths => {
        const newColumnWidths = [...prevWidths];
        newColumnWidths[columnIndex] = newWidth;
        return newColumnWidths;
      });
    };
    
    handleResizeEnd.current = () => {
      console.log('Ending resize');
      document.removeEventListener('mousemove', handleResizeMove.current!);
      document.removeEventListener('mouseup', handleResizeEnd.current!);
      setIsResizing(false);
      setResizingColumn(null);
    };
    
    document.addEventListener('mousemove', handleResizeMove.current);
    document.addEventListener('mouseup', handleResizeEnd.current);
  };

  // 컴포넌트 언마운트 시 이벤트 리스너 정리
  useEffect(() => {
    return () => {
      if (handleResizeMove.current) {
        document.removeEventListener('mousemove', handleResizeMove.current);
      }
      if (handleResizeEnd.current) {
        document.removeEventListener('mouseup', handleResizeEnd.current);
      }
    };
  }, []);

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
      setColumnWidths([...columnWidths, 150]); // 새 컬럼 기본 너비 150px
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

  const handleRowSelect = (rowIndex: number, checked: boolean) => {
    const newSelectedRows = new Set(selectedRows);
    if (checked) {
      newSelectedRows.add(rowIndex);
    } else {
      newSelectedRows.delete(rowIndex);
    }
    setSelectedRows(newSelectedRows);
  };

  const handleRowContextMenu = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedRows.has(rowIndex)) {
      setSelectedRows(new Set([rowIndex]));
    }
    
    setRowContextMenuPosition({
      x: e.clientX,
      y: e.clientY
    });
    setShowRowContextMenu(true);
  };

  const handleCopySelectedRows = () => {
    const sortedRows = Array.from(selectedRows).sort((a, b) => a - b);
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
    setSelectedRows(new Set());
    setShowRowContextMenu(false);
    updateBlock(headers, newRows, newCells, columns);
  };

  const handleDeleteSelectedRows = () => {
    const sortedRows = Array.from(selectedRows).sort((a, b) => b - a);
    
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
    setSelectedRows(new Set());
    setShowRowContextMenu(false);
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
    const newColumnWidths = columnWidths.filter((_, i) => i !== index);

    setHeaders(newHeaders);
    setColumns(newColumns);
    setRows(newRows);
    setCells(newCells);
    setColumnWidths(newColumnWidths);
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
    setSelectedCells(new Set());
    setLastSelectedCell(null);
    setEditingCell({ row: rowIndex, col: cellIndex });
  };

  const finishEditingCell = () => {
    if (editingCell) {
      // 편집이 끝난 셀을 선택 상태로 만들기
      const cellKey = getCellKey(editingCell.row, editingCell.col);
      setSelectedCells(new Set([cellKey]));
      setLastSelectedCell(editingCell);
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

  return (
    <div 
      ref={tableContainerRef}
      style={{ 
        marginBottom: '8px',
        overflow: 'visible',
        position: 'relative',
        paddingLeft: isEditing ? '40px' : '0',
        paddingBottom: isEditing ? '44px' : '0'
      }}
    >

      <div style={{
        position: 'relative'
      }}>
        <div style={{
          overflowX: 'auto',
          border: '1px solid #e0e0e0',
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
                width: `${columnWidths[index] || 150}px`,
                maxWidth: `${columnWidths[index] || 150}px`,
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
                    onMouseDown={(e) => {
                      console.log('Resize handle clicked for column:', index); // 디버깅용
                      handleResizeStart(e, index);
                    }}
                    style={{
                      position: 'absolute',
                      top: '0',
                      right: '-4px',
                      width: '8px',
                      height: '100%',
                      cursor: 'col-resize',
                      backgroundColor: 'transparent',
                      zIndex: 1000,
                      borderRight: isResizing && resizingColumn === index ? '2px solid #007acc' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 122, 204, 0.1)';
                      (e.currentTarget as HTMLElement).style.borderRight = '2px solid #007acc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isResizing) {
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
              onContextMenu={(e) => handleRowContextMenu(e, rowIndex)}
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{
                  border: (editingCell?.row === rowIndex && editingCell?.col === cellIndex) ? '1px solid #e0e0e0' :
                          isCellSelected(rowIndex, cellIndex) ? '2px solid #007acc' : '1px solid #e0e0e0',
                  padding: '4px',
                  position: 'relative',
                  backgroundColor: (editingCell?.row === rowIndex && editingCell?.col === cellIndex) ? 'white' :
                                   isCellInDragRange(rowIndex, cellIndex) ? '#c7e6ff' :
                                   isCellSelected(rowIndex, cellIndex) ? '#e7f3ff' : 
                                   selectedRows.has(rowIndex) ? '#f0f8ff' : 'transparent',
                  width: `${columnWidths[cellIndex] || 150}px`,
                  maxWidth: `${columnWidths[cellIndex] || 150}px`,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  // 드래그 선택 시작
                  setIsDragSelecting(true);
                  setDragStartCell({row: rowIndex, col: cellIndex});
                  setDragEndCell({row: rowIndex, col: cellIndex});
                  
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    // 일반 클릭: 기존 선택 초기화
                    setSelectedCells(new Set([getCellKey(rowIndex, cellIndex)]));
                    setLastSelectedCell({row: rowIndex, col: cellIndex});
                  }
                }}
                onMouseEnter={(e) => {
                  if (isDragSelecting && dragStartCell) {
                    setDragEndCell({row: rowIndex, col: cellIndex});
                  }
                }}
                onMouseUp={(e) => {
                  if (isDragSelecting && dragStartCell && dragEndCell) {
                    e.stopPropagation();
                    // 드래그 선택 완료
                    const selection = getCellsInRange(
                      dragStartCell.row, 
                      dragStartCell.col, 
                      dragEndCell.row, 
                      dragEndCell.col
                    );
                    
                    if (e.ctrlKey || e.metaKey) {
                      // Ctrl/Cmd 드래그: 기존 선택에 추가
                      const newSelection = new Set([...Array.from(selectedCells), ...Array.from(selection)]);
                      setSelectedCells(newSelection);
                    } else {
                      // 일반 드래그: 새로운 선택
                      setSelectedCells(selection);
                    }
                    
                    setLastSelectedCell(dragEndCell);
                    setIsDragSelecting(false);
                    setDragStartCell(null);
                    setDragEndCell(null);
                  }
                }}
                onClick={(e) => {
                  if (!isDragSelecting) {
                    e.stopPropagation();
                    // 셀 클릭 시 해당 셀을 선택 상태로 설정 (드래그가 아닌 경우에만)
                    if (e.ctrlKey || e.metaKey) {
                      // Ctrl/Cmd 클릭: 다중 선택
                      const cellKey = getCellKey(rowIndex, cellIndex);
                      const newSelection = new Set(selectedCells);
                      if (newSelection.has(cellKey)) {
                        newSelection.delete(cellKey);
                      } else {
                        newSelection.add(cellKey);
                      }
                      setSelectedCells(newSelection);
                      setLastSelectedCell({row: rowIndex, col: cellIndex});
                    } else if (e.shiftKey && lastSelectedCell) {
                      // Shift 클릭: 범위 선택
                      const startRow = Math.min(lastSelectedCell.row, rowIndex);
                      const endRow = Math.max(lastSelectedCell.row, rowIndex);
                      const startCol = Math.min(lastSelectedCell.col, cellIndex);
                      const endCol = Math.max(lastSelectedCell.col, cellIndex);
                      
                      const newSelection = new Set<string>();
                      for (let r = startRow; r <= endRow; r++) {
                        for (let c = startCol; c <= endCol; c++) {
                          newSelection.add(getCellKey(r, c));
                        }
                      }
                      setSelectedCells(newSelection);
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
              const isRowSelected = selectedRows.has(rowIndex);
              const shouldShowCheckbox = hoveredRow === rowIndex || isRowSelected;
              
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
                    setHoveredRow(rowIndex);
                  }}
                  onMouseLeave={() => {
                    setHoveredRow(null);
                  }}
                >
                  {shouldShowCheckbox && (
                    <input
                      type="checkbox"
                      checked={isRowSelected}
                      onChange={(e) => handleRowSelect(rowIndex, e.target.checked)}
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
      {showRowContextMenu && (
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
            onClick={() => setShowRowContextMenu(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: rowContextMenuPosition.y,
              left: rowContextMenuPosition.x,
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