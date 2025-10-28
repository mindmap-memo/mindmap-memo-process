'use client';

import React from 'react';
import { MigrationStatus } from '../hooks/useMigration';
import styles from '../../../scss/features/migration/MigrationPrompt.module.scss';

interface MigrationPromptProps {
  status: MigrationStatus;
  error: string | null;
  result: {
    pages: number;
    memos: number;
    categories: number;
    quickNavItems: number;
  } | null;
  onMigrate: () => void;
  onSkip: () => void;
  onDeleteLegacy: () => void;
  onClose: () => void;
}

export const MigrationPrompt: React.FC<MigrationPromptProps> = ({
  status,
  error,
  result,
  onMigrate,
  onSkip,
  onDeleteLegacy,
  onClose,
}) => {
  // 성공 상태
  if (status === 'success') {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2 className={styles.title}>✅ 마이그레이션 완료</h2>
          </div>
          <div className={styles.content}>
            <p className={styles.message}>
              로컬 데이터가 성공적으로 서버로 이전되었습니다!
            </p>
            {result && (
              <div className={styles.results}>
                <p>📄 페이지: {result.pages}개</p>
                <p>📝 메모: {result.memos}개</p>
                <p>📁 카테고리: {result.categories}개</p>
                <p>⭐ 단축 이동: {result.quickNavItems}개</p>
              </div>
            )}
            <div className={styles.info}>
              <p>
                이제 어떤 기기에서든 로그인하여 데이터에 접근할 수 있습니다.
              </p>
              <p className={styles.warning}>
                💡 브라우저의 로컬 데이터는 백업되었습니다. 원하시면 삭제할 수 있습니다.
              </p>
            </div>
          </div>
          <div className={styles.actions}>
            <button onClick={onDeleteLegacy} className={styles.deleteButton}>
              로컬 데이터 삭제
            </button>
            <button
              onClick={() => {
                onClose();
                // 서버 데이터를 로드하기 위해 페이지 새로고침
                window.location.reload();
              }}
              className={styles.primaryButton}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (status === 'error') {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2 className={styles.title}>❌ 마이그레이션 실패</h2>
          </div>
          <div className={styles.content}>
            <p className={styles.errorMessage}>
              {error || '알 수 없는 오류가 발생했습니다.'}
            </p>
            <p className={styles.info}>
              다시 시도하거나 나중에 마이그레이션할 수 있습니다.
              로컬 데이터는 안전하게 보관되어 있습니다.
            </p>
          </div>
          <div className={styles.actions}>
            <button onClick={onSkip} className={styles.secondaryButton}>
              나중에 하기
            </button>
            <button onClick={onMigrate} className={styles.primaryButton}>
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 마이그레이션 중
  if (status === 'migrating') {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2 className={styles.title}>⏳ 데이터 이전 중...</h2>
          </div>
          <div className={styles.content}>
            <div className={styles.spinner}></div>
            <p className={styles.message}>
              로컬 데이터를 서버로 이전하고 있습니다.
              잠시만 기다려주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 마이그레이션 대기 상태
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>🔄 데이터 이전</h2>
        </div>
        <div className={styles.content}>
          <p className={styles.message}>
            브라우저에 저장된 기존 데이터가 발견되었습니다.
          </p>
          <div className={styles.info}>
            <p>
              새로운 버전에서는 데이터가 서버에 안전하게 저장됩니다.
              어떤 기기에서든 로그인하여 데이터에 접근할 수 있습니다.
            </p>
            <p>
              기존 데이터를 서버로 이전하시겠습니까?
            </p>
          </div>
          <div className={styles.features}>
            <div className={styles.feature}>
              <span className={styles.icon}>☁️</span>
              <span>클라우드 동기화</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.icon}>🔐</span>
              <span>안전한 저장</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.icon}>📱</span>
              <span>어디서나 접근</span>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <button onClick={onSkip} className={styles.secondaryButton}>
            나중에 하기
          </button>
          <button onClick={onMigrate} className={styles.primaryButton}>
            데이터 이전하기
          </button>
        </div>
      </div>
    </div>
  );
};
