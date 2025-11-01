import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { AnalyticsEventType } from '../types';

/**
 * useAnalytics
 *
 * 애널리틱스 이벤트 추적 훅
 * - 세션 시작/종료 자동 추적
 * - 이벤트 기록 함수 제공
 */
export const useAnalytics = () => {
  const { data: session } = useSession();
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);

  // 세션 시작
  const startSession = useCallback(async () => {
    if (!session?.user?.email) return;

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionIdRef.current = sessionId;
    sessionStartTimeRef.current = Date.now();

    try {
      await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userEmail: session.user.email,
          action: 'start'
        })
      });
    } catch (error) {
      console.error('Failed to start analytics session:', error);
    }
  }, [session]);

  // 세션 종료
  const endSession = useCallback(async () => {
    if (!sessionIdRef.current || !sessionStartTimeRef.current || !session?.user?.email) return;

    const durationSeconds = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

    try {
      await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          userEmail: session.user.email,
          action: 'end',
          durationSeconds
        })
      });
    } catch (error) {
      console.error('Failed to end analytics session:', error);
    }
  }, [session]);

  // 이벤트 추적
  const trackEvent = useCallback(async (
    eventType: AnalyticsEventType,
    eventData?: Record<string, any>
  ) => {
    if (!sessionIdRef.current || !session?.user?.email) return;

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
    if (!session?.user?.email) return;

    // 세션 시작
    startSession();

    // 페이지 종료 시 세션 종료
    const handleBeforeUnload = () => {
      endSession();
    };

    // 페이지 숨김 시 세션 종료 (모바일 대응)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endSession();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      endSession();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, startSession, endSession]);

  return {
    trackEvent
  };
};
