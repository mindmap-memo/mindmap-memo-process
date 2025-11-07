/**
 * 더블탭 감지 유틸리티
 * 모바일에서 더블탭 제스처를 감지하기 위한 헬퍼 함수들
 */

import { DOUBLE_TAP_DELAY } from './constants';

/**
 * 더블탭 여부 확인 및 타임스탬프 저장
 * @param itemId - 아이템 고유 ID
 * @returns 더블탭이면 true, 첫 번째 탭이면 false
 */
export const detectDoubleTap = (itemId: string): boolean => {
  const currentTime = Date.now();
  const lastTapTime = (window as any)[`lastTapTime_${itemId}`] || 0;
  const timeSinceLastTap = currentTime - lastTapTime;

  // 300ms 이내에 두 번째 탭이 발생하면 더블탭으로 인식
  if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
    // 타임아웃 취소
    const timeoutId = (window as any)[`tapTimeout_${itemId}`];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete (window as any)[`tapTimeout_${itemId}`];
    }

    // 리셋
    delete (window as any)[`lastTapTime_${itemId}`];
    return true;
  } else {
    // 첫 번째 탭 기록
    (window as any)[`lastTapTime_${itemId}`] = currentTime;

    // 300ms 후 리셋
    const timeoutId = (window as any)[`tapTimeout_${itemId}`];
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    (window as any)[`tapTimeout_${itemId}`] = setTimeout(() => {
      delete (window as any)[`lastTapTime_${itemId}`];
    }, DOUBLE_TAP_DELAY);
    return false;
  }
};

/**
 * 특정 아이템의 더블탭 타이머를 초기화
 * @param itemId - 아이템 고유 ID
 */
export const resetDoubleTapTimer = (itemId: string): void => {
  const timeoutId = (window as any)[`tapTimeout_${itemId}`];
  if (timeoutId) {
    clearTimeout(timeoutId);
    delete (window as any)[`tapTimeout_${itemId}`];
  }
  delete (window as any)[`lastTapTime_${itemId}`];
};
