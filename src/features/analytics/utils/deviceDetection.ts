/**
 * 기기 정보 감지 유틸리티
 */

export interface DeviceInfo {
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  screenResolution: string;
}

/**
 * User Agent에서 기기 타입 감지
 */
export function getDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  const ua = userAgent.toLowerCase();

  // 태블릿 체크
  if (/(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(userAgent)) {
    return 'tablet';
  }

  // 모바일 체크
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(userAgent)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * User Agent에서 브라우저 정보 추출
 */
export function getBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome/')) return 'Chrome';
  if (ua.includes('safari/') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('firefox/')) return 'Firefox';
  if (ua.includes('opera/') || ua.includes('opr/')) return 'Opera';
  if (ua.includes('trident/')) return 'IE';

  return 'Unknown';
}

/**
 * User Agent에서 운영체제 정보 추출
 */
export function getOS(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('win')) return 'Windows';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';

  return 'Unknown';
}

/**
 * 화면 해상도 가져오기 (클라이언트 측에서만 가능)
 */
export function getScreenResolution(): string {
  if (typeof window === 'undefined') {
    return 'Unknown';
  }

  return `${window.screen.width}x${window.screen.height}`;
}

/**
 * 모든 기기 정보를 한 번에 가져오기
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      deviceType: 'desktop',
      browser: 'Unknown',
      os: 'Unknown',
      screenResolution: 'Unknown'
    };
  }

  const userAgent = navigator.userAgent;

  return {
    deviceType: getDeviceType(userAgent),
    browser: getBrowser(userAgent),
    os: getOS(userAgent),
    screenResolution: getScreenResolution()
  };
}
