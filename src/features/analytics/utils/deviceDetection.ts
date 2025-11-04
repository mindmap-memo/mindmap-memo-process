/**
 * Device Detection Utility
 * User Agent를 파싱하여 기기 타입을 감지합니다.
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * User Agent 문자열에서 기기 타입을 감지
 * @param userAgent - User Agent 문자열
 * @returns 'mobile' | 'tablet' | 'desktop'
 */
export function detectDeviceType(userAgent: string): DeviceType {
  if (!userAgent) {
    return 'desktop';
  }

  const ua = userAgent.toLowerCase();

  // 태블릿 감지 (모바일보다 먼저 체크해야 함)
  if (
    ua.includes('ipad') ||
    (ua.includes('tablet') && !ua.includes('mobile')) ||
    (ua.includes('android') && !ua.includes('mobile'))
  ) {
    return 'tablet';
  }

  // 모바일 감지
  if (
    ua.includes('mobile') ||
    ua.includes('iphone') ||
    ua.includes('ipod') ||
    ua.includes('android') ||
    ua.includes('blackberry') ||
    ua.includes('windows phone') ||
    ua.includes('webos')
  ) {
    return 'mobile';
  }

  // 기본값: 데스크톱
  return 'desktop';
}

/**
 * 브라우저에서 현재 기기 타입을 감지
 * @returns 'mobile' | 'tablet' | 'desktop'
 */
export function getClientDeviceType(): DeviceType {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  return detectDeviceType(window.navigator.userAgent);
}
