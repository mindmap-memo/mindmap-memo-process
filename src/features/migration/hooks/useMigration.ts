import { useState, useEffect, useCallback } from 'react';
import {
  hasLegacyData,
  isMigrationCompleted,
  loadLegacyData,
  setMigrationCompleted,
  backupLegacyData,
  clearLegacyData,
} from '../utils/migrationUtils';

export type MigrationStatus = 'idle' | 'pending' | 'migrating' | 'success' | 'error';

interface MigrationResult {
  pages: number;
  memos: number;
  categories: number;
  quickNavItems: number;
}

export const useMigration = (isAuthenticated: boolean) => {
  const [status, setStatus] = useState<MigrationStatus>('idle');
  const [needsMigration, setNeedsMigration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);

  // 마이그레이션 필요 여부 확인
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMigration = () => {
      const hasLegacy = hasLegacyData();
      const isCompleted = isMigrationCompleted();

      // 구버전 데이터가 있고, 아직 마이그레이션이 완료되지 않았으면
      if (hasLegacy && !isCompleted) {
        setNeedsMigration(true);
        setStatus('pending');
        console.log('🔍 [useMigration] 마이그레이션 필요 감지:', { hasLegacy, isCompleted, isAuthenticated });
      } else {
        setNeedsMigration(false);
        setStatus('idle');
        console.log('🔍 [useMigration] 마이그레이션 불필요:', { hasLegacy, isCompleted, isAuthenticated });
      }
    };

    // 초기 체크
    checkMigration();

    // localStorage 변경 감지 (다른 탭이나 프로그래매틱 변경)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mindmap-memo-pages' || e.key === null) {
        // mindmap-memo-pages 또는 전체 localStorage가 변경되면 재체크
        setTimeout(checkMigration, 100); // 약간의 지연을 줘서 데이터 저장이 완료되도록
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 같은 탭 내에서의 변경을 감지하기 위한 커스텀 이벤트 리스너
    const handleCustomStorageChange = () => {
      setTimeout(checkMigration, 100);
    };

    window.addEventListener('localStorageUpdated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdated', handleCustomStorageChange);
    };
  }, [isAuthenticated]); // isAuthenticated 변경 시 다시 체크

  // 마이그레이션 실행
  const migrate = useCallback(async () => {
    if (!isAuthenticated) {
      setError('로그인이 필요합니다.');
      return false;
    }

    try {
      setStatus('migrating');
      setError(null);

      // 1. 구버전 데이터 로드
      const legacyData = loadLegacyData();
      if (!legacyData || legacyData.length === 0) {
        setError('마이그레이션할 데이터가 없습니다.');
        setStatus('error');
        return false;
      }

      // 2. 데이터 백업 (선택적)
      backupLegacyData();

      // 3. 서버로 데이터 전송
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pages: legacyData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '마이그레이션 실패');
      }

      const data = await response.json();

      // 4. 마이그레이션 완료 플래그 설정
      setMigrationCompleted();

      // 5. 결과 저장
      setResult(data.results);
      setStatus('success');
      setNeedsMigration(false);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(errorMessage);
      setStatus('error');
      console.error('Migration error:', err);
      return false;
    }
  }, [isAuthenticated]);

  // 마이그레이션 건너뛰기
  const skipMigration = useCallback(() => {
    setMigrationCompleted();
    setNeedsMigration(false);
    setStatus('idle');
  }, []);

  // 구버전 데이터 삭제 (마이그레이션 완료 후)
  const deleteLegacyData = useCallback(() => {
    if (status === 'success') {
      clearLegacyData();
    }
  }, [status]);

  return {
    status,
    needsMigration,
    error,
    result,
    migrate,
    skipMigration,
    deleteLegacyData,
  };
};
