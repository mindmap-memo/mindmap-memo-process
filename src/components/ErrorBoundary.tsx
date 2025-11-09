import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  parsedLocation: string | null;
  dbLogStatus: 'pending' | 'success' | 'failed' | null;
  dbLogError: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      parsedLocation: null,
      dbLogStatus: null,
      dbLogError: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
      parsedLocation: null,
      dbLogStatus: 'pending',
      dbLogError: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 에러 위치 파싱
    const parsedLocation = this.parseErrorLocation(error);

    // 에러 로그를 데이터베이스에 저장
    this.logErrorToDatabase(error, errorInfo, parsedLocation);

    this.setState({
      error,
      errorInfo,
      parsedLocation
    });
  }

  parseErrorLocation(error: Error): string | null {
    try {
      const stack = error.stack || '';

      // 스택에서 실제 파일 위치 찾기 (소스맵 적용된 경우)
      const stackLines = stack.split('\n');

      for (const line of stackLines) {
        // webpack-internal 또는 실제 소스 파일 경로 찾기
        const webpackMatch = line.match(/webpack-internal:\/\/\/(.+?):(\d+):(\d+)/);
        if (webpackMatch) {
          const [, file, lineNum, colNum] = webpackMatch;
          return `${file}:${lineNum}:${colNum}`;
        }

        // 일반 파일 경로 찾기
        const fileMatch = line.match(/\((.*?):(\d+):(\d+)\)/);
        if (fileMatch) {
          const [, file, lineNum, colNum] = fileMatch;
          // src/ 또는 components/ 등이 포함된 경로만 추출
          if (file.includes('src/') || file.includes('components/') || file.includes('hooks/')) {
            const srcIndex = file.indexOf('src/');
            if (srcIndex !== -1) {
              return `${file.substring(srcIndex)}:${lineNum}:${colNum}`;
            }
          }
        }
      }

      // 청크 파일 정보라도 추출
      const chunkMatch = stack.match(/\/_next\/static\/chunks\/([a-f0-9]+\.js):(\d+):(\d+)/);
      if (chunkMatch) {
        const [, chunkFile, lineNum, colNum] = chunkMatch;
        return `청크: ${chunkFile}:${lineNum}:${colNum}`;
      }

      return null;
    } catch (e) {
      console.error('Failed to parse error location:', e);
      return null;
    }
  }

  async logErrorToDatabase(error: Error, errorInfo: ErrorInfo, parsedLocation: string | null) {
    try {
      // 현재 청크 파일 정보 추출
      const stack = error.stack || '';
      const chunkMatch = stack.match(/\/_next\/static\/chunks\/([a-f0-9]+\.js)/);
      const chunkFile = chunkMatch ? chunkMatch[1] : null;

      console.log('[ErrorBoundary] Logging error to database...', {
        message: error.message,
        parsedLocation,
        chunkFile
      });

      const response = await fetch('/api/error-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          chunkFile,
          parsedLocation,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `상태: ${response.status}, 메시지: ${errorText}`;
        console.error('[ErrorBoundary] Failed to log error - Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        this.setState({
          dbLogStatus: 'failed',
          dbLogError: errorMsg
        });
      } else {
        const result = await response.json();
        console.log('[ErrorBoundary] Error logged successfully:', result);
        this.setState({
          dbLogStatus: 'success',
          dbLogError: null
        });
      }
    } catch (logError) {
      const errorMsg = logError instanceof Error ? logError.message : String(logError);
      console.error('[ErrorBoundary] Exception while logging error:', logError);
      this.setState({
        dbLogStatus: 'failed',
        dbLogError: `예외 발생: ${errorMsg}`
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#fff5f5',
          overflow: 'auto',
          zIndex: 9999
        }}>
          <div style={{
            padding: '20px',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            <h2 style={{ color: '#d32f2f', marginBottom: '20px' }}>⚠️ 에러가 발생했습니다</h2>

            {/* DB 저장 상태 표시 */}
            <div style={{
              padding: '15px',
              backgroundColor: this.state.dbLogStatus === 'success' ? '#d4edda' :
                              this.state.dbLogStatus === 'failed' ? '#f8d7da' : '#fff3cd',
              border: `2px solid ${this.state.dbLogStatus === 'success' ? '#28a745' :
                                   this.state.dbLogStatus === 'failed' ? '#dc3545' : '#ffc107'}`,
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{
                margin: '0 0 10px 0',
                color: this.state.dbLogStatus === 'success' ? '#155724' :
                       this.state.dbLogStatus === 'failed' ? '#721c24' : '#856404'
              }}>
                {this.state.dbLogStatus === 'pending' && '⏳ DB 저장 중...'}
                {this.state.dbLogStatus === 'success' && '✅ DB 저장 성공'}
                {this.state.dbLogStatus === 'failed' && '❌ DB 저장 실패'}
              </h3>
              {this.state.dbLogStatus === 'failed' && this.state.dbLogError && (
                <div style={{
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#721c24',
                  marginTop: '10px'
                }}>
                  <strong>실패 원인:</strong>
                  <pre style={{
                    margin: '5px 0 0 0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {this.state.dbLogError}
                  </pre>
                </div>
              )}
            </div>

            {this.state.parsedLocation && (
              <div style={{
                padding: '15px',
                backgroundColor: '#fff3cd',
                border: '2px solid #ffc107',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>📍 에러 위치</h3>
                <code style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#d32f2f',
                  display: 'block',
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '4px'
                }}>
                  {this.state.parsedLocation}
                </code>
              </div>
            )}

            <div style={{
              padding: '15px',
              backgroundColor: 'white',
              border: '2px solid #ff0000',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#d32f2f' }}>💬 에러 메시지</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
                {this.state.error?.message}
              </p>
            </div>

            <details style={{ marginBottom: '20px' }}>
              <summary style={{
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                padding: '15px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '8px'
              }}>
                📋 전체 스택 트레이스 보기
              </summary>
              <div style={{
                marginTop: '10px',
                padding: '15px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                border: '1px solid #ddd',
                maxHeight: '400px',
                overflow: 'auto'
              }}>
                <pre style={{
                  fontSize: '12px',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {this.state.error?.stack}
                </pre>
              </div>
            </details>

            {this.state.errorInfo && (
              <details style={{ marginBottom: '20px' }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  padding: '15px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '8px'
                }}>
                  🔧 컴포넌트 스택 보기
                </summary>
                <div style={{
                  marginTop: '10px',
                  padding: '15px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  maxHeight: '400px',
                  overflow: 'auto'
                }}>
                  <pre style={{
                    fontSize: '12px',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                width: '100%',
                maxWidth: '300px',
                display: 'block',
                margin: '0 auto'
              }}
            >
              🔄 페이지 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
