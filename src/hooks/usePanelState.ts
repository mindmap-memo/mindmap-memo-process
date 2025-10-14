import { useState } from 'react';
import { STORAGE_KEYS } from '../constants/defaultData';
import { loadFromStorage } from '../utils/storageUtils';

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
 * - 초기 로드 시 저장된 패널 설정 불러오기
 * - App.tsx에서 useEffect로 자동 저장 처리
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
  // localStorage에서 초기 패널 설정 로드
  const initialPanelSettings = loadFromStorage(STORAGE_KEYS.PANEL_SETTINGS, {
    leftPanelOpen: true,
    rightPanelOpen: true,
    leftPanelWidth: 250,
    rightPanelWidth: 600
  });

  // ===== 좌측 패널 =====
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(
    initialPanelSettings.leftPanelOpen
  );
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(
    initialPanelSettings.leftPanelWidth
  );

  // ===== 우측 패널 =====
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(
    initialPanelSettings.rightPanelOpen
  );
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(
    initialPanelSettings.rightPanelWidth
  );

  // ===== 우측 패널 전체화면 모드 =====
  const [isRightPanelFullscreen, setIsRightPanelFullscreen] = useState<boolean>(false);

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
