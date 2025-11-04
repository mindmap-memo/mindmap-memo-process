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
    if (isSessionActiveRef.current) return;

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionIdRef.current = sessionId;
    sessionStartTimeRef.current = Date.now();
    isSessionActiveRef.current = true;
    sessionEndedRef.current = false;

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

    // 페이지 종료 시 세션 종료
    const handleBeforeUnload = () => {
      endSession(email);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // cleanup 시에만 세션 종료 (beforeunload에서 이미 처리되므로 중복 호출되지 않음)
      endSession(email);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session?.user?.email]);

  return {
    trackEvent
  };
};
