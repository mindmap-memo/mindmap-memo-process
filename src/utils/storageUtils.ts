import { STORAGE_KEYS } from '../constants/defaultData';

// localStorage에서 데이터 로드 및 마이그레이션
export const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  // 서버사이드 렌더링에서는 localStorage가 없으므로 기본값 반환
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);

      // 페이지 데이터인 경우 categories 필드 마이그레이션
      if (key === STORAGE_KEYS.PAGES && Array.isArray(parsed)) {
        return parsed.map((page: any) => ({
          ...page,
          categories: (page.categories || []).map((category: any) => ({
            ...category,
            connections: category.connections || [] // connections 필드도 마이그레이션
          }))
        })) as T;
      }

      return parsed;
    }
  } catch (error) {
    console.error(`localStorage 로드 오류 (${key}):`, error);
  }
  return defaultValue;
};

// localStorage에 데이터 저장
export const saveToStorage = (key: string, data: any): void => {
  // 서버사이드 렌더링에서는 localStorage가 없으므로 무시
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`localStorage 저장 오류 (${key}):`, error);
  }
};
