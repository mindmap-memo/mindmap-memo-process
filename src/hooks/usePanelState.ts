import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/defaultData';
import { loadFromStorage, saveToStorage } from '../utils/storageUtils';

/**
 * usePanelState
 *
 * 좌우 패널의 상태를 관리하는 커스텀 훅입니다.
 *
 * **관리하는 상태:**
 * - 패널 열림/닫힘 상태
 * - 패널 너비
 * - 우측 패널 전체화면 모드
 *
 * **localStorage 연동:**
 * - useEffect에서 클라이언트 사이드에서만 localStorage 로드 (Hydration 에러 방지)
 * - 패널 상태 변경 시 자동 저장
 *
 * **기본값:**
 * - 좌측 패널: 열림, 250px
 * - 우측 패널: 열림, 600px
 * - 전체화면: 비활성화
 *
 * @returns 패널 상태 및 setter 함수들
 *
 * @example
 * ```tsx
 * const {
 *   leftPanelOpen,
 *   setLeftPanelOpen,
 *   leftPanelWidth,
 *   setLeftPanelWidth,
 *   rightPanelOpen,
 *   setRightPanelOpen,
 *   rightPanelWidth,
 *   setRightPanelWidth,
 *   isRightPanelFullscreen,
 *   setIsRightPanelFullscreen
 * } = usePanelState();
 *
 * // 패널 토글
 * setLeftPanelOpen(!leftPanelOpen);
 *
 * // 패널 너비 조정
 * setLeftPanelWidth(leftPanelWidth + deltaX);
 * ```
 */
export const usePanelState = () => {
  // ===== 좌측 패널 (기본값으로 초기화) =====
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(250);

  // ===== 우측 패널 (기본값으로 초기화) =====
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(600);

  // 클라이언트 사이드에서만 localStorage 로드 (Hydration 에러 방지)
  useEffect(() => {
    const savedSettings = loadFromStorage(STORAGE_KEYS.PANEL_SETTINGS, {
      leftPanelOpen: true,
      rightPanelOpen: true,
      leftPanelWidth: 250,
      rightPanelWidth: 600
    });

    setLeftPanelOpen(savedSettings.leftPanelOpen);
    setLeftPanelWidth(savedSettings.leftPanelWidth);
    setRightPanelOpen(savedSettings.rightPanelOpen);
    setRightPanelWidth(savedSettings.rightPanelWidth);
  }, []);

  // ===== 우측 패널 전체화면 모드 =====
  const [isRightPanelFullscreen, setIsRightPanelFullscreen] = useState<boolean>(false);

  // 패널 설정 변경 시 localStorage에 자동 저장
  useEffect(() => {
    const settings = {
      leftPanelOpen,
      rightPanelOpen,
      leftPanelWidth,
      rightPanelWidth
    };
    saveToStorage(STORAGE_KEYS.PANEL_SETTINGS, settings);
  }, [leftPanelOpen, rightPanelOpen, leftPanelWidth, rightPanelWidth]);

  return {
    // 좌측 패널
    leftPanelOpen,
    setLeftPanelOpen,
    leftPanelWidth,
    setLeftPanelWidth,

    // 우측 패널
    rightPanelOpen,
    setRightPanelOpen,
    rightPanelWidth,
    setRightPanelWidth,

    // 전체화면 모드
    isRightPanelFullscreen,
    setIsRightPanelFullscreen
  };
};
