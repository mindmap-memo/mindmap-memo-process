import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 에러 로그를 데이터베이스에 저장
    this.logErrorToDatabase(error, errorInfo);

    this.setState({
      error,
      errorInfo
    });
  }

  async logErrorToDatabase(error: Error, errorInfo: ErrorInfo) {
    try {
      // 현재 청크 파일 정보 추출
      const stack = error.stack || '';
      const chunkMatch = stack.match(/\/_next\/static\/chunks\/([a-f0-9]+\.js)/);
      const chunkFile = chunkMatch ? chunkMatch[1] : null;

      await fetch('/api/error-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          chunkFile,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (logError) {
      console.error('Failed to log error to database:', logError);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #ff0000',
          borderRadius: '8px',
          backgroundColor: '#fff5f5'
        }}>
          <h2 style={{ color: '#d32f2f' }}>에러가 발생했습니다</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              에러 상세 정보 보기
            </summary>
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <p><strong>메시지:</strong> {this.state.error?.message}</p>
              <p><strong>스택:</strong></p>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {this.state.error?.stack}
              </pre>
              {this.state.errorInfo && (
                <>
                  <p><strong>컴포넌트 스택:</strong></p>
                  <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            페이지 새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
