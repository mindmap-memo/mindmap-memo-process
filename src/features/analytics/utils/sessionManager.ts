/**
 * 전역 세션 관리자
 * 여러 컴포넌트에서 useAnalytics를 호출해도 세션은 하나만 생성되도록 보장
 */

interface SessionState {
  sessionId: string | null;
  startTime: number | null;
  isActive: boolean;
  isEnding: boolean;
  email: string | null;
}

class SessionManager {
  private state: SessionState = {
    sessionId: null,
    startTime: null,
    isActive: false,
    isEnding: false,
    email: null,
  };

  private startPromise: Promise<void> | null = null;

  /**
   * 세션 시작 (중복 호출 방지)
   */
  async startSession(email: string): Promise<string | null> {
    // 이미 같은 이메일로 세션이 활성화되어 있으면 기존 세션 ID 반환
    if (this.state.isActive && this.state.email === email && this.state.sessionId) {
      console.log('[SessionManager] Session already active for', email, '- ID:', this.state.sessionId);
      return this.state.sessionId;
    }

    // 이미 시작 중이면 대기
    if (this.startPromise) {
      console.log('[SessionManager] Session start already in progress, waiting...');
      await this.startPromise;
      return this.state.sessionId;
    }

    // 이메일이 변경되었으면 기존 세션 종료
    if (this.state.isActive && this.state.email !== email) {
      console.log('[SessionManager] Email changed, ending previous session');
      await this.endSession();
    }

    // 새 세션 시작
    this.startPromise = this._startSessionInternal(email);
    await this.startPromise;
    this.startPromise = null;

    return this.state.sessionId;
  }

  private async _startSessionInternal(email: string): Promise<void> {
    // 플래그 먼저 설정
    this.state.isActive = true;
    this.state.email = email;
    this.state.isEnding = false;

    // 세션 ID 생성
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.state.sessionId = sessionId;
    this.state.startTime = Date.now();

    console.log('[SessionManager] Starting new session:', sessionId, 'for', email);

    try {
      const response = await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userEmail: email,
          action: 'start'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.status}`);
      }

      console.log('[SessionManager] Session started successfully:', sessionId);
    } catch (error) {
      console.error('[SessionManager] Failed to start session:', error);
      // 에러 시 상태 초기화
      this.resetState();
      throw error;
    }
  }

  /**
   * 세션 종료 (중복 호출 방지)
   */
  async endSession(): Promise<void> {
    if (!this.state.sessionId || !this.state.startTime || !this.state.email) {
      console.log('[SessionManager] No active session to end');
      return;
    }

    // 이미 종료 중이면 중복 호출 방지
    if (this.state.isEnding) {
      console.log('[SessionManager] Session already ending');
      return;
    }

    this.state.isEnding = true;
    const sessionId = this.state.sessionId;
    const email = this.state.email;
    const durationSeconds = Math.floor((Date.now() - this.state.startTime) / 1000);

    console.log('[SessionManager] Ending session:', sessionId, 'Duration:', durationSeconds, 's');

    try {
      const response = await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userEmail: email,
          action: 'end',
          durationSeconds
        }),
        keepalive: true // 페이지 종료 시에도 요청 완료 보장
      });

      if (!response.ok) {
        throw new Error(`Failed to end session: ${response.status}`);
      }

      console.log('[SessionManager] Session ended successfully:', sessionId);
    } catch (error) {
      console.error('[SessionManager] Failed to end session:', error);
    } finally {
      this.resetState();
    }
  }

  /**
   * 세션 업데이트 (heartbeat)
   */
  async updateSession(): Promise<void> {
    if (!this.state.sessionId || !this.state.startTime || !this.state.email || !this.state.isActive) {
      return;
    }

    const durationSeconds = Math.floor((Date.now() - this.state.startTime) / 1000);

    try {
      await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.state.sessionId,
          userEmail: this.state.email,
          action: 'end',
          durationSeconds
        }),
        keepalive: true
      });
    } catch (error) {
      console.error('[SessionManager] Heartbeat failed:', error);
    }
  }

  /**
   * 현재 세션 정보 조회
   */
  getSessionInfo() {
    return { ...this.state };
  }

  /**
   * 상태 초기화
   */
  private resetState() {
    this.state = {
      sessionId: null,
      startTime: null,
      isActive: false,
      isEnding: false,
      email: null,
    };
  }
}

// 전역 싱글톤 인스턴스
export const sessionManager = new SessionManager();
