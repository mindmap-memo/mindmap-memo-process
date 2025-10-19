import { useEffect } from 'react';
import { Page } from '../types';
import { STORAGE_KEYS } from '../constants/defaultData';
import { saveToStorage } from '../utils/storageUtils';

/**
 * localStorage 자동 저장을 관리하는 커스텀 훅
 * - 페이지 데이터 자동 저장 (quickNavItems 포함)
 * - 현재 페이지 ID 자동 저장
 * - 패널 설정 자동 저장
 * - 현재 페이지 ID 유효성 검증
 */

interface UseLocalStorageProps {
  pages: Page[];
  setPages: (pages: Page[]) => void;
  currentPageId: string;
  setCurrentPageId: (id: string) => void;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
}

export const useLocalStorage = ({
  pages,
  setPages,
  currentPageId,
  setCurrentPageId,
  leftPanelOpen,
  rightPanelOpen,
  leftPanelWidth,
  rightPanelWidth
}: UseLocalStorageProps) => {
  // 한 번만 실행되는 localStorage 마이그레이션 (임시)
  useEffect(() => {
    const migrationDone = localStorage.getItem('categories-migration-done');
    if (!migrationDone) {
      console.log('🔄 카테고리 마이그레이션을 위해 localStorage 클리어 중...');
      localStorage.clear();
      localStorage.setItem('categories-migration-done', 'true');
      window.location.reload();
    }
  }, []);

  // localStorage 자동 저장 - 페이지 데이터
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PAGES, pages);
  }, [pages]);

  // localStorage 자동 저장 - 현재 페이지 ID
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CURRENT_PAGE_ID, currentPageId);
  }, [currentPageId]);

  // localStorage 자동 저장 - 패널 설정
  useEffect(() => {
    const settings = {
      leftPanelOpen,
      rightPanelOpen,
      leftPanelWidth,
      rightPanelWidth
    };
    saveToStorage(STORAGE_KEYS.PANEL_SETTINGS, settings);
  }, [leftPanelOpen, rightPanelOpen, leftPanelWidth, rightPanelWidth]);

  // 현재 페이지 ID가 유효한지 확인하고 수정
  useEffect(() => {
    if (pages.length > 0 && !pages.find(page => page.id === currentPageId)) {
      setCurrentPageId(pages[0].id);
    }
  }, [pages, currentPageId, setCurrentPageId]);
};
