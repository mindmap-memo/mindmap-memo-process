/**
 * 마이그레이션 디버깅 유틸리티
 *
 * 브라우저 콘솔에서 사용 가능한 개발자 도구
 * window.migrationDebug로 접근 가능
 */

import { Page } from '../../../types';
import { STORAGE_KEYS } from '../../../constants/defaultData';
import {
  hasLegacyData,
  isMigrationCompleted,
  loadLegacyData,
  setMigrationCompleted,
  MIGRATION_FLAG_KEY
} from './migrationUtils';

export interface MigrationDebugInfo {
  hasLegacyData: boolean;
  isMigrationCompleted: boolean;
  legacyDataSize: number;
  legacyData: Page[] | null;
  backups: string[];
  migrationFlag: string | null;
}

/**
 * 현재 마이그레이션 상태 확인
 */
export const getMigrationStatus = (): MigrationDebugInfo => {
  const hasLegacy = hasLegacyData();
  const isCompleted = isMigrationCompleted();
  const legacyData = loadLegacyData();

  // localStorage에서 백업 목록 찾기
  const backups: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${STORAGE_KEYS.PAGES}_backup_`)) {
      backups.push(key);
    }
  }

  // 데이터 크기 계산
  let dataSize = 0;
  if (hasLegacy) {
    const data = localStorage.getItem(STORAGE_KEYS.PAGES);
    dataSize = data ? new Blob([data]).size : 0;
  }

  return {
    hasLegacyData: hasLegacy,
    isMigrationCompleted: isCompleted,
    legacyDataSize: dataSize,
    legacyData,
    backups,
    migrationFlag: localStorage.getItem(MIGRATION_FLAG_KEY),
  };
};

/**
 * 마이그레이션 상태를 콘솔에 출력
 */
export const printMigrationStatus = (): void => {
  const status = getMigrationStatus();

  console.group('🔍 마이그레이션 상태');
  console.log('구버전 데이터 존재:', status.hasLegacyData ? '✅' : '❌');
  console.log('마이그레이션 완료:', status.isMigrationCompleted ? '✅' : '❌');
  console.log('데이터 크기:', `${(status.legacyDataSize / 1024).toFixed(2)} KB`);

  if (status.legacyData) {
    console.log('페이지 수:', status.legacyData.length);
    const totalMemos = status.legacyData.reduce((sum, p) => sum + (p.memos?.length || 0), 0);
    const totalCategories = status.legacyData.reduce((sum, p) => sum + (p.categories?.length || 0), 0);
    const totalQuickNav = status.legacyData.reduce((sum, p) => sum + (p.quickNavItems?.length || 0), 0);
    console.log('총 메모:', totalMemos);
    console.log('총 카테고리:', totalCategories);
    console.log('총 단축 이동:', totalQuickNav);
  }

  console.log('백업 개수:', status.backups.length);
  if (status.backups.length > 0) {
    console.log('백업 목록:', status.backups);
  }

  console.groupEnd();
};

/**
 * 테스트용 샘플 데이터 생성
 */
export const createTestData = (): void => {
  const testPages: Page[] = [
    {
      id: 'test-page-1',
      name: '테스트 페이지 1',
      memos: [
        {
          id: 'test-memo-1',
          title: '테스트 메모 1',
          content: '테스트 내용',
          blocks: [
            {
              id: 'test-block-1',
              type: 'text',
              content: '이것은 테스트 메모입니다.',
            },
          ],
          tags: ['테스트', '샘플'],
          connections: [],
          position: { x: 100, y: 100 },
          displaySize: 'medium',
        },
        {
          id: 'test-memo-2',
          title: '테스트 메모 2',
          content: '테스트 내용 2',
          blocks: [
            {
              id: 'test-block-2',
              type: 'text',
              content: '두 번째 테스트 메모입니다.',
            },
          ],
          tags: ['중요'],
          connections: ['test-memo-1'],
          position: { x: 300, y: 150 },
          displaySize: 'medium',
          importance: 'important',
        },
      ],
      categories: [
        {
          id: 'test-category-1',
          title: '테스트 카테고리',
          tags: [],
          connections: [],
          position: { x: 500, y: 100 },
          isExpanded: true,
          children: [],
        },
      ],
      quickNavItems: [
        {
          id: 'test-quicknav-1',
          name: '중요 메모',
          targetId: 'test-memo-2',
          targetType: 'memo',
          pageId: 'test-page-1',
        },
      ],
    },
  ];

  localStorage.setItem(STORAGE_KEYS.PAGES, JSON.stringify(testPages));
  console.log('✅ 테스트 데이터가 생성되었습니다.');
  printMigrationStatus();
};

/**
 * 향상된 테스트 데이터 생성 (연결 및 중첩 카테고리 포함)
 * - 종속 안된 메모 1개
 * - 카테고리 2개 (중첩)
 * - 카테고리에 종속된 메모 1개
 * - 메모 간 연결
 */
export const createEnhancedTestData = (): void => {
  // 타임스탬프로 고유 ID 생성
  const timestamp = Date.now();
  const pageId = `test-page-${timestamp}`;
  const memo1Id = `test-memo-1-${timestamp}`;
  const memo4Id = `test-memo-4-${timestamp}`;
  const category2Id = `test-category-2-${timestamp}`;
  const category3Id = `test-category-3-${timestamp}`;
  const block1Id = `test-block-1-${timestamp}`;
  const block4Id = `test-block-4-${timestamp}`;
  const quicknav1Id = `test-quicknav-1-${timestamp}`;
  const quicknav2Id = `test-quicknav-2-${timestamp}`;

  const testPages: Page[] = [
    {
      id: pageId,
      name: '테스트 페이지',
      memos: [
        {
          id: memo1Id,
          title: '테스트',
          content: '',
          blocks: [
            {
              id: block1Id,
              type: 'text',
              content: '테스트',
            },
          ],
          tags: ['테스트'],
          connections: [memo4Id],
          position: { x: 100, y: 100 },
          displaySize: 'medium',
        },
        {
          id: memo4Id,
          title: '테스트',
          content: '',
          blocks: [
            {
              id: block4Id,
              type: 'text',
              content: '테스트',
            },
          ],
          tags: ['테스트'],
          connections: [memo1Id],
          position: { x: 600, y: 400 },
          displaySize: 'medium',
          parentId: category3Id,
        },
      ],
      categories: [
        {
          id: category2Id,
          title: '카테고리 2',
          tags: [],
          connections: [],
          position: { x: 300, y: 200 },
          size: { width: 200, height: 100 },
          children: [category3Id],
          isExpanded: true,
        },
        {
          id: category3Id,
          title: '카테고리 3',
          tags: [],
          connections: [],
          position: { x: 500, y: 300 },
          size: { width: 200, height: 100 },
          children: [memo4Id],
          parentId: category2Id,
          isExpanded: true,
        },
      ],
      quickNavItems: [
        {
          id: quicknav1Id,
          name: '테스트 메모 1',
          targetId: memo1Id,
          targetType: 'memo',
          pageId: pageId,
        },
        {
          id: quicknav2Id,
          name: '카테고리 2',
          targetId: category2Id,
          targetType: 'category',
          pageId: pageId,
        },
      ],
    },
  ];

  localStorage.setItem(STORAGE_KEYS.PAGES, JSON.stringify(testPages));
  console.log('✅ 향상된 테스트 데이터가 생성되었습니다.');
  printMigrationStatus();

  // 커스텀 이벤트 발생시켜서 useMigration에 알림
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('localStorageUpdated'));
  }
};

/**
 * 마이그레이션 완료 플래그 리셋
 */
export const resetMigrationFlag = (): void => {
  localStorage.removeItem(MIGRATION_FLAG_KEY);
  console.log('✅ 마이그레이션 플래그가 리셋되었습니다.');
};

/**
 * 마이그레이션 완료 플래그 강제 설정
 */
export const forceSetMigrationCompleted = (): void => {
  setMigrationCompleted();
  console.log('✅ 마이그레이션 완료 플래그가 설정되었습니다.');
};

/**
 * 모든 localStorage 데이터 출력
 */
export const printAllLocalStorage = (): void => {
  console.group('📦 전체 localStorage 데이터');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      const size = value ? new Blob([value]).size : 0;
      console.log(`${key}:`, `${(size / 1024).toFixed(2)} KB`);
    }
  }
  console.groupEnd();
};

/**
 * localStorage 특정 키 데이터 출력
 */
export const printStorageKey = (key: string): void => {
  const value = localStorage.getItem(key);
  if (value) {
    try {
      const parsed = JSON.parse(value);
      console.log(`📄 ${key}:`, parsed);
    } catch {
      console.log(`📄 ${key}:`, value);
    }
  } else {
    console.log(`❌ ${key}: 데이터가 없습니다.`);
  }
};

/**
 * 백업 데이터 복원
 */
export const restoreFromBackup = (backupKey?: string): void => {
  let targetBackup = backupKey;

  if (!targetBackup) {
    // 가장 최근 백업 찾기
    const backups: Array<{ key: string; timestamp: string }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${STORAGE_KEYS.PAGES}_backup_`)) {
        const timestamp = key.replace(`${STORAGE_KEYS.PAGES}_backup_`, '');
        backups.push({ key, timestamp });
      }
    }

    if (backups.length === 0) {
      console.error('❌ 백업이 없습니다.');
      return;
    }

    backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    targetBackup = backups[0].key;
    console.log(`ℹ️ 가장 최근 백업 사용: ${targetBackup}`);
  }

  const backupData = localStorage.getItem(targetBackup);
  if (!backupData) {
    console.error(`❌ 백업을 찾을 수 없습니다: ${targetBackup}`);
    return;
  }

  localStorage.setItem(STORAGE_KEYS.PAGES, backupData);
  console.log(`✅ 백업에서 복원되었습니다: ${targetBackup}`);
  printMigrationStatus();
};

/**
 * 모든 백업 삭제
 */
export const clearAllBackups = (): void => {
  const backups: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${STORAGE_KEYS.PAGES}_backup_`)) {
      backups.push(key);
    }
  }

  backups.forEach(key => localStorage.removeItem(key));
  console.log(`✅ ${backups.length}개의 백업이 삭제되었습니다.`);
};

/**
 * 전체 초기화 (주의!)
 */
export const resetAllMigrationData = (): void => {
  if (!confirm('⚠️ 모든 마이그레이션 관련 데이터를 삭제하시겠습니까? (백업 포함)')) {
    return;
  }

  // 메인 데이터 삭제
  localStorage.removeItem(STORAGE_KEYS.PAGES);

  // 마이그레이션 플래그 삭제
  localStorage.removeItem(MIGRATION_FLAG_KEY);

  // 모든 백업 삭제
  const backups: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${STORAGE_KEYS.PAGES}_backup_`)) {
      backups.push(key);
    }
  }
  backups.forEach(key => localStorage.removeItem(key));

  console.log('✅ 모든 마이그레이션 데이터가 삭제되었습니다.');
};

// 전역 객체에 디버그 함수 등록
if (typeof window !== 'undefined') {
  (window as any).migrationDebug = {
    status: getMigrationStatus,
    print: printMigrationStatus,
    createTestData,
    createEnhancedTestData,
    resetFlag: resetMigrationFlag,
    setCompleted: forceSetMigrationCompleted,
    printAll: printAllLocalStorage,
    printKey: printStorageKey,
    restore: restoreFromBackup,
    clearBackups: clearAllBackups,
    resetAll: resetAllMigrationData,
  };

  console.log('🔧 마이그레이션 디버그 도구가 로드되었습니다. window.migrationDebug 사용');
}
