import { Page } from '../../../types';
import { STORAGE_KEYS } from '../../../constants/defaultData';

export const MIGRATION_FLAG_KEY = 'mindmap_migration_completed';

/**
 * localStorage에서 구버전 데이터가 있는지 확인
 */
export const hasLegacyData = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const pagesData = localStorage.getItem(STORAGE_KEYS.PAGES);
    return !!pagesData && pagesData !== '[]';
  } catch (error) {
    console.error('Error checking legacy data:', error);
    return false;
  }
};

/**
 * 마이그레이션이 완료되었는지 확인
 */
export const isMigrationCompleted = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

/**
 * 마이그레이션 완료 플래그 설정
 */
export const setMigrationCompleted = (): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch (error) {
    console.error('Error setting migration flag:', error);
  }
};

/**
 * localStorage에서 구버전 데이터 로드
 */
export const loadLegacyData = (): Page[] | null => {
  if (typeof window === 'undefined') return null;

  try {
    const pagesData = localStorage.getItem(STORAGE_KEYS.PAGES);
    if (!pagesData) return null;

    const pages = JSON.parse(pagesData);

    // 데이터 검증 및 정규화
    if (!Array.isArray(pages)) {
      console.error('Invalid legacy data format');
      return null;
    }

    return pages.map((page: any) => ({
      ...page,
      memos: (page.memos || []).map((memo: any) => ({
        ...memo,
        blocks: memo.blocks || [],
        tags: memo.tags || [],
        connections: memo.connections || [],
        position: memo.position || { x: 0, y: 0 },
      })),
      categories: (page.categories || []).map((category: any) => ({
        ...category,
        tags: category.tags || [],
        connections: category.connections || [],
        children: category.children || [],
        isExpanded: category.isExpanded !== false,
      })),
      quickNavItems: page.quickNavItems || [],
    }));
  } catch (error) {
    console.error('Error loading legacy data:', error);
    return null;
  }
};

/**
 * 구버전 데이터를 백업 (선택적)
 */
export const backupLegacyData = (): void => {
  if (typeof window === 'undefined') return;

  try {
    const pagesData = localStorage.getItem(STORAGE_KEYS.PAGES);
    if (pagesData) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      localStorage.setItem(`${STORAGE_KEYS.PAGES}_backup_${timestamp}`, pagesData);
    }
  } catch (error) {
    console.error('Error backing up legacy data:', error);
  }
};

/**
 * 마이그레이션 후 구버전 데이터 삭제 (선택적)
 */
export const clearLegacyData = (): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.PAGES);
    // 다른 구버전 키가 있다면 여기에 추가
  } catch (error) {
    console.error('Error clearing legacy data:', error);
  }
};
