import { TableBlock, TableCell, TableColumn, CellType } from '../../../../types';

/**
 * tableInitializers
 *
 * 테이블 초기화 관련 유틸리티 함수들
 *
 * **제공하는 기능:**
 * - 컬럼 초기화
 * - 셀 초기화
 * - 타입 변환
 */

/**
 * 블록 데이터로부터 컬럼 초기화
 */
export function initializeColumnsFromBlock(tableBlock: TableBlock): TableColumn[] {
  const { headers, columns: existingColumns } = tableBlock;

  if (existingColumns && existingColumns.length > 0) {
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

  return defaultColumns;
}

/**
 * 블록 데이터로부터 셀 초기화
 */
export function initializeCells(tableBlock: TableBlock, columns: TableColumn[]): TableCell[][] {
  const { rows, cells: existingCells } = tableBlock;

  if (existingCells && existingCells.length > 0) {
    return existingCells;
  }

  const cols = columns.length > 0 ? columns : initializeColumnsFromBlock(tableBlock);

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
