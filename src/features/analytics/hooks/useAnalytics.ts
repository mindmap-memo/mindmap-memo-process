import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { AnalyticsEventType } from '../types';
import { isEmailExcluded } from '../utils/excludedEmails';
import { sessionManager } from '../utils/sessionManager';

/**
 * useAnalytics
 *
 * 애널리틱스 이벤트 추적 훅
 * - 세션 시작/종료 자동 추적 (전역 세션 관리자 사용)
 * - 이벤트 기록 함수 제공
 * - 제외된 이메일 계정은 추적하지 않음
 * - 여러 컴포넌트에서 호출해도 세션은 하나만 생성됨
 */
export const useAnalytics = () => {
  const { data: session } = useSession();
  const mountedRef = useRef<boolean>(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);


  // 이벤트 추적
  const trackEvent = useCallback(async (
    eventType: AnalyticsEventType,
    eventData?: Record<string, any>
  ) => {
    const sessionInfo = sessionManager.getSessionInfo();
    if (!sessionInfo.sessionId || !session?.user?.email) return;

    // 제외된 이메일은 추적하지 않음
    if (isEmailExcluded(session.user.email)) return;

    try {
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionInfo.sessionId,
          userEmail: session.user.email,
          eventType,
          eventData
        })
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, [session]);

  // 세션 시작/종료 자동 추적
  useEffect(() => {
    const email = session?.user?.email;
    if (!email) return;

    // 제외된 이메일은 추적하지 않음
    if (isEmailExcluded(email)) return;

    // 이미 마운트되었으면 중복 실행 방지 (Strict Mode 대응)
    if (mountedRef.current) return;
    mountedRef.current = true;

    // 전역 세션 관리자를 통해 세션 시작
    sessionManager.startSession(email);

    // 세션 종료 핸들러
    const handleSessionEnd = () => {
      sessionManager.endSession();
    };

    // 페이지 종료 시 세션 종료 (데스크톱)
    const handleBeforeUnload = () => {
      handleSessionEnd();
    };

    // 페이지 숨김 시 세션 종료 (모바일 - 더 안정적)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleSessionEnd();
      }
    };

    // iOS Safari에서 페이지 종료 시 (beforeunload가 작동하지 않을 때)
    const handlePageHide = () => {
      handleSessionEnd();
    };

    // 주기적 heartbeat (30초마다 세션 업데이트)
    heartbeatIntervalRef.current = setInterval(() => {
      sessionManager.updateSession();
    }, 30000); // 30초마다

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      // cleanup 시 세션 종료
      handleSessionEnd();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      mountedRef.current = false;
    };
  }, [session?.user?.email]);

  return {
    trackEvent
  };
};
