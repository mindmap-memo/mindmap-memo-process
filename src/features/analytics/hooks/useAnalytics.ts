import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { AnalyticsEventType } from '../types';
import { isEmailExcluded } from '../utils/excludedEmails';

/**
 * useAnalytics
 *
 * 애널리틱스 이벤트 추적 훅
 * - 세션 시작/종료 자동 추적
 * - 이벤트 기록 함수 제공
 * - 제외된 이메일 계정은 추적하지 않음
 * - 세션 중복 생성 방지
 */
export const useAnalytics = () => {
  const { data: session } = useSession();
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const isSessionActiveRef = useRef<boolean>(false);
  const sessionEndedRef = useRef<boolean>(false);

  // 세션 시작 (useEffect 내부에서만 호출됨)
  const startSession = async (email: string) => {
    // 이미 세션이 활성화되어 있으면 중복 생성 방지
    if (isSessionActiveRef.current) {
      console.log('[Analytics] Session already active, skipping duplicate start');
      return;
    }

    // 이미 세션 ID가 있으면 중복 생성 방지
    if (sessionIdRef.current) {
      console.log('[Analytics] Session ID already exists, skipping duplicate start');
      return;
    }

    // 플래그를 먼저 설정하여 동시 호출 차단
    isSessionActiveRef.current = true;

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionIdRef.current = sessionId;
    sessionStartTimeRef.current = Date.now();
    sessionEndedRef.current = false;

    console.log('[Analytics] Starting new session:', sessionId);

    try {
      await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userEmail: email,
          action: 'start'
        })
      });
    } catch (error) {
      console.error('Failed to start analytics session:', error);
      // 에러 시 플래그 초기화
      isSessionActiveRef.current = false;
      sessionIdRef.current = null;
    }
  };

  // 세션 종료 (useEffect cleanup이나 beforeunload에서 호출됨)
  const endSession = async (email: string) => {
    if (!sessionIdRef.current || !sessionStartTimeRef.current) return;

    // 이미 종료된 세션은 다시 종료하지 않음
    if (sessionEndedRef.current) return;

    sessionEndedRef.current = true;
    isSessionActiveRef.current = false;

    const durationSeconds = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

    try {
      await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          userEmail: email,
          action: 'end',
          durationSeconds
        })
      });
    } catch (error) {
      console.error('Failed to end analytics session:', error);
    }
  };

  // 이벤트 추적
  const trackEvent = useCallback(async (
    eventType: AnalyticsEventType,
    eventData?: Record<string, any>
  ) => {
    if (!sessionIdRef.current || !session?.user?.email) return;

    // 제외된 이메일은 추적하지 않음
    if (isEmailExcluded(session.user.email)) return;

    try {
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
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

    // 이미 세션이 활성화되어 있으면 중복 시작 방지 (Strict Mode 대응)
    if (isSessionActiveRef.current && sessionIdRef.current) return;

    // 세션 시작
    startSession(email);

    // 세션 종료 핸들러 (모바일 브라우저 호환성 강화)
    const handleSessionEnd = () => {
      endSession(email);
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
    const heartbeatInterval = setInterval(() => {
      if (sessionIdRef.current && sessionStartTimeRef.current) {
        const durationSeconds = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        fetch('/api/analytics/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            userEmail: email,
            action: 'end',
            durationSeconds
          }),
          keepalive: true // 페이지가 종료되어도 요청이 완료되도록 함
        }).catch(err => console.error('Heartbeat failed:', err));
      }
    }, 30000); // 30초마다

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      // cleanup 시 세션 종료
      handleSessionEnd();
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [session?.user?.email]);

  return {
    trackEvent
  };
};
