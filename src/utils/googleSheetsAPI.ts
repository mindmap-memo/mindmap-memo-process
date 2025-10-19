import { SheetData, SheetInfo } from '../config/google';

// Google API 타입 선언
declare const gapi: any;

// URL에서 Google Sheets ID 추출
export const extractSheetId = (url: string): string | null => {
  const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return matches ? matches[1] : null;
};

// Google Sheets URL을 정리하여 ID만 추출
export const parseSheetUrl = (input: string): string | null => {
  // 이미 ID만 입력된 경우
  if (input.length === 44 && !input.includes('/')) {
    return input;
  }
  
  // URL에서 ID 추출
  return extractSheetId(input);
};

// 구글 시트 정보 가져오기
export const getSheetInfo = async (spreadsheetId: string): Promise<SheetInfo | null> => {
  try {
    const response = await gapi.client.sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });
    
    const spreadsheet = response.result;
    return {
      spreadsheetId: spreadsheet.spreadsheetId!,
      title: spreadsheet.properties?.title || '제목 없음',
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    };
  } catch (error) {
    console.error('시트 정보 가져오기 실패:', error);
    return null;
  }
};

// 구글 시트 데이터 가져오기
export const getSheetData = async (
  spreadsheetId: string, 
  range: string = 'A1:Z1000'
): Promise<SheetData | null> => {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range
    });
    
    return {
      values: response.result.values || [],
      range: response.result.range || range
    };
  } catch (error) {
    console.error('시트 데이터 가져오기 실패:', error);
    throw error;
  }
};

// 우리 테이블과 호환되는 타입 정의  
type DetectedCellType = 'text' | 'number' | 'date' | 'checkbox' | 'email' | 'phone' | 'select';

// 데이터 타입 자동 감지 (확장된 버전)
const detectColumnType = (values: string[]): DetectedCellType => {
  if (values.length === 0) return 'text';
  
  // 샘플 데이터에서 타입 판단 (처음 5개 값)
  const sampleValues = values.slice(0, 5).filter(v => v && v.toString().trim() !== '');
  
  if (sampleValues.length === 0) return 'text';
  
  // 체크박스 확인 (TRUE/FALSE, 예/아니오, Y/N 등)
  const checkboxPattern = /^(true|false|예|아니오|yes|no|y|n|o|x|✓|✗|☑|☐)$/i;
  if (sampleValues.every(v => checkboxPattern.test(v.toString().trim()))) {
    return 'checkbox';
  }
  
  // 이메일 확인
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (sampleValues.every(v => emailPattern.test(v.toString().trim()))) {
    return 'email';
  }
  
  // 전화번호 확인 (한국식, 국제식 패턴 포함)
  const phonePattern = /^(\+\d{1,3}\s?)?(\(?\d{2,4}\)?[\s\-]?)?\d{3,4}[\s\-]?\d{4}$|^01[0-9][\s\-]?\d{3,4}[\s\-]?\d{4}$/;
  if (sampleValues.every(v => phonePattern.test(v.toString().trim()))) {
    return 'phone';
  }
  
  // 날짜 확인 (더 다양한 형식 지원)
  const datePattern = /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$|^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$|^\d{4}\.\d{1,2}\.\d{1,2}$/;
  if (sampleValues.some(v => datePattern.test(v.toString().trim()))) {
    return 'date';
  }
  
  // 숫자 확인 (통화, 퍼센트 포함)
  const numberPattern = /^-?\d*\.?\d+[%₩$]?$|^[₩$]-?\d*\.?\d+$/;
  if (sampleValues.every(v => numberPattern.test(v.toString().trim().replace(/,/g, '')))) {
    return 'number';
  }
  
  // 선택형 데이터 감지 (중복되는 값이 많고 종류가 제한적인 경우)
  const uniqueValues = Array.from(new Set(sampleValues));
  const totalValues = values.filter(v => v && v.toString().trim() !== '').length;
  
  // 전체 데이터의 50% 이상이 중복이고, 고유값이 2-10개 사이인 경우 select로 판단
  if (uniqueValues.length >= 2 && uniqueValues.length <= 10 && 
      totalValues > uniqueValues.length * 2) {
    return 'select';
  }
  
  return 'text';
};

// 시트 데이터를 테이블 블록 형태로 변환
export const convertSheetDataToTable = (sheetData: SheetData) => {
  if (!sheetData.values || sheetData.values.length === 0) {
    return {
      headers: ['데이터 없음'],
      rows: [['시트에 데이터가 없습니다.']],
      columns: [{
        id: 'col1',
        title: '데이터 없음',
        type: 'text' as const,
        width: 150
      }],
      cells: []
    };
  }
  
  const [firstRow, ...restRows] = sheetData.values;
  const headers = firstRow || ['컬럼 1'];
  const rows = restRows.length > 0 ? restRows : [['데이터 없음']];
  
  // 각 열의 데이터를 분석해서 타입 결정
  const columns = headers.map((header, index) => {
    const columnValues = rows.map(row => row[index] || '').filter(v => v);
    const detectedType = detectColumnType(columnValues);
    
    return {
      id: `col-${index}`,
      name: header || `컬럼 ${index + 1}`, // title -> name으로 변경
      type: detectedType,
      width: 150, // 기본 열 너비
      options: detectedType === 'checkbox' ? ['예', '아니오'] : undefined
    };
  });
  
  // 셀 데이터 생성
  const cells = rows.map((row, rowIndex) => 
    headers.map((_, colIndex) => ({
      id: `cell-${rowIndex}-${colIndex}`,
      value: row[colIndex] || '',
      rowIndex,
      colIndex,
      columnId: `col-${colIndex}`
    }))
  ).flat();
  
  return {
    headers,
    rows,
    columns,
    cells
  };
};

// 시트 접근 권한 확인
export const checkSheetAccess = async (spreadsheetId: string): Promise<boolean> => {
  try {
    await gapi.client.sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });
    return true;
  } catch (error: any) {
    console.error('시트 접근 권한 없음:', error);
    
    // 구체적인 에러 메시지 제공
    if (error.status === 403) {
      throw new Error('시트에 접근할 권한이 없습니다. 시트가 공개되어 있거나 공유되어 있는지 확인해주세요.');
    } else if (error.status === 404) {
      throw new Error('시트를 찾을 수 없습니다. URL이 올바른지 확인해주세요.');
    } else {
      throw new Error('시트에 접근할 수 없습니다. 네트워크 연결을 확인해주세요.');
    }
  }
};

// 로그인 상태 확인 (새로운 GIS 시스템 호환)
export const isUserSignedIn = (): boolean => {
  // 전역 상태에서 로그인 상태 확인
  // GoogleAuth 컴포넌트에서 관리하는 상태를 활용
  return (window as any).googleAuthState?.isSignedIn || false;
};

// 현재 로그인된 사용자 정보 (새로운 GIS 시스템 호환)
export const getCurrentUser = () => {
  // 전역 상태에서 사용자 정보 확인
  return (window as any).googleAuthState?.userProfile || null;
};

// Google API에 액세스 토큰 설정
export const setAccessToken = (token: string) => {
  if (window.gapi && gapi.client) {
    gapi.client.setToken({
      access_token: token
    });
  }
};

// 열 번호를 Excel 스타일 열 이름으로 변환 (1->A, 26->Z, 27->AA)
const numberToColumnName = (num: number): string => {
  let result = '';
  while (num > 0) {
    num--; // 1-based to 0-based
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
};

// 클립보드에서 범위 정보 감지 (사용자가 Ctrl+C로 범위 복사 시)
export const detectRangeFromClipboard = async (): Promise<{range: string, data: string} | null> => {
  try {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return null;
    }

    const clipboardText = await navigator.clipboard.readText();
    
    if (!clipboardText || clipboardText.trim() === '') {
      return null;
    }
    
    // 구글 시트에서 복사한 데이터 감지 (탭으로 구분)
    if (clipboardText.includes('\t')) {
      
      // 데이터 크기로 범위 추정
      const lines = clipboardText.split('\n').filter(line => line.trim());
      const maxCols = Math.max(...lines.map(line => line.split('\t').length));
      
      if (lines.length > 0 && maxCols > 0) {
        const endCol = numberToColumnName(maxCols);
        const endRow = lines.length;
        const estimatedRange = `A1:${endCol}${endRow}`;
        return { range: estimatedRange, data: clipboardText };
      }
    }
    
    // 단일 셀 또는 줄바꿈으로 구분된 데이터 감지
    if (clipboardText.includes('\n')) {
      const lines = clipboardText.split('\n').filter(line => line.trim());
      if (lines.length > 1) {
        const maxCols = Math.max(...lines.map(line => 
          line.includes(',') ? line.split(',').length : 1
        ));
        const endCol = numberToColumnName(maxCols);
        const endRow = lines.length;
        const estimatedRange = `A1:${endCol}${endRow}`;
        return { range: estimatedRange, data: clipboardText };
      }
    }
    
    // 단일 값인 경우 A1 범위로 처리
    if (clipboardText.trim().length > 0) {
      return { range: 'A1:A1', data: clipboardText };
    }
    
    return null;
  } catch (error) {
    console.error('클립보드 범위 감지 실패:', error);
    return null;
  }
};

// 현재 선택된 범위 가져오기 (클립보드 기반)
export const getCurrentSelection = async (spreadsheetId: string): Promise<{range: string, data: string} | null> => {
  try {
    // 클립보드 방식으로 범위 감지
    const clipboardResult = await detectRangeFromClipboard();
    if (clipboardResult) {
      return clipboardResult;
    }

    return null; // 클립보드에서 감지할 수 없음
  } catch (error) {
    console.error('선택 범위 가져오기 실패:', error);
    return null;
  }
};

// 범위 감지를 위한 폴링 함수
export const startRangeDetection = async (
  spreadsheetId: string,
  onRangeDetected: (range: string, data?: string) => void,
  intervalMs: number = 1500
): Promise<() => void> => {
  let isActive = true;
  let lastDetectedData = ''; // 중복 감지 방지
  
  const pollSelection = async () => {
    if (!isActive) return;
    
    try {
      const currentResult = await getCurrentSelection(spreadsheetId);
      if (currentResult && currentResult.data !== lastDetectedData) {
        lastDetectedData = currentResult.data;
        onRangeDetected(currentResult.range, currentResult.data);
      }
    } catch (error) {
      console.error('범위 감지 중 오류:', error);
    }
    
    if (isActive) {
      setTimeout(pollSelection, intervalMs);
    }
  };
  
  // 폴링 시작
  pollSelection();
  
  // 정지 함수 반환
  return () => {
    isActive = false;
  };
};

// 전역 Google Auth 상태 관리
export const updateGoogleAuthState = (state: {
  isSignedIn: boolean;
  accessToken?: string | null;
  userProfile?: any;
}) => {
  (window as any).googleAuthState = state;
  
  // gapi client에 토큰 설정
  if (state.accessToken && window.gapi) {
    setAccessToken(state.accessToken);
  }
};