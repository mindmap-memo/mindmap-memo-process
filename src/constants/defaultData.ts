import { Page, MemoBlock, MemoDisplaySize, ImportanceLevel, CategoryBlock } from '../types';

// localStorage 키 상수
export const STORAGE_KEYS = {
  PAGES: 'mindmap-memo-pages',
  CURRENT_PAGE_ID: 'mindmap-memo-current-page-id',
  PANEL_SETTINGS: 'mindmap-memo-panel-settings',
  QUICK_NAV_ITEMS: 'mindmap-memo-quick-nav-items'
};

// 기본 데이터 - 빈 페이지로 시작
export const DEFAULT_PAGES: Page[] = (() => {
  // 고유한 페이지 ID 생성 (절대 '1'을 사용하지 않음)
  // 형식: page-[타임스탬프]-[랜덤4자리]
  const pageId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  return [
    {
      id: pageId,
      name: '페이지 1',
      memos: [], // 빈 메모 배열
      categories: [], // 빈 카테고리 배열
      quickNavItems: [] // 빈 즐겨찾기 목록으로 초기화
    }
  ];
})();
