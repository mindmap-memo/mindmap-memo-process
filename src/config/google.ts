// Google API 설정
export const GOOGLE_CONFIG = {
  // Google Cloud Console에서 생성한 클라이언트 ID를 여기에 입력하세요
  CLIENT_ID: '525328519694-eldc5cdl08rv8lglfph1cgh3ign4prdd.apps.googleusercontent.com', // 웹 애플리케이션 타입으로 다시 생성 필요
  
  // Google Sheets API 문서 URL
  DISCOVERY_DOCS: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  
  // 필요한 권한 (읽기 전용)
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets.readonly'
};

export interface SheetData {
  values: string[][];
  range: string;
}

export interface SheetInfo {
  spreadsheetId: string;
  title: string;
  url: string;
}