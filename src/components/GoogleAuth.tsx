import React, { useState, useEffect } from 'react';
import { GOOGLE_CONFIG } from '../config/google';
import { updateGoogleAuthState } from '../utils/googleSheetsAPI';

// Google API 및 GIS 타입 선언
declare global {
  interface Window {
    gapi: any;
    google: any;
    googleServicesLoaded: boolean;
    initGoogleServices: () => void;
  }
}

declare const gapi: any;
declare const google: any;

interface GoogleAuthProps {
  onAuthSuccess: (isSignedIn: boolean) => void;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ onAuthSuccess }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // localStorage에서 기존 인증 정보 확인
  const checkExistingAuth = () => {
    try {
      const storedToken = localStorage.getItem('google_access_token');
      const storedProfile = localStorage.getItem('google_user_profile');
      const tokenExpiry = localStorage.getItem('google_token_expiry');
      
      console.log('저장된 토큰 확인:', storedToken ? '있음' : '없음');
      console.log('토큰 만료 시간:', tokenExpiry);
      
      if (storedToken && tokenExpiry) {
        const now = new Date().getTime();
        const expiryTime = parseInt(tokenExpiry);
        
        if (now < expiryTime) {
          // 토큰이 아직 유효함
          console.log('기존 토큰이 유효함, 로그인 상태 복원');
          setAccessToken(storedToken);
          setIsSignedIn(true);
          
          if (storedProfile) {
            setUserProfile(JSON.parse(storedProfile));
          }
          
          // 전역 상태 업데이트
          updateGoogleAuthState({
            isSignedIn: true,
            accessToken: storedToken,
            userProfile: storedProfile ? JSON.parse(storedProfile) : null
          });
          
          onAuthSuccess(true);
          return true;
        } else {
          // 토큰이 만료됨
          console.log('저장된 토큰이 만료됨, 삭제');
          localStorage.removeItem('google_access_token');
          localStorage.removeItem('google_user_profile');
          localStorage.removeItem('google_token_expiry');
        }
      }
    } catch (error) {
      console.error('기존 인증 정보 확인 중 오류:', error);
    }
    
    return false;
  };

  useEffect(() => {
    const initializeGoogleServices = async () => {
      try {
        console.log('=== Google Services 초기화 시작 ===');
        
        // 먼저 기존 인증 정보 확인
        if (checkExistingAuth()) {
          console.log('기존 로그인 상태 복원됨');
        }
        
        // Google API와 GIS 로드 확인
        if (!window.gapi || !window.google) {
          console.error('Google API 또는 GIS가 로드되지 않았습니다');
          setIsLoading(false);
          return;
        }
        console.log('✓ Google API와 GIS 로드됨');

        // Google API Client 초기화 (Sheets API용)
        console.log('Google API Client 초기화 중...');
        await new Promise<void>((resolve, reject) => {
          gapi.load('client', {
            callback: resolve,
            onerror: reject
          });
        });

        await gapi.client.init({
          apiKey: '', // API Key는 필요없음 (OAuth만 사용)
          discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
        });
        console.log('✓ Google API Client 초기화 완료');

        // 설정 유효성 검증
        if (!GOOGLE_CONFIG.CLIENT_ID || GOOGLE_CONFIG.CLIENT_ID.includes('your-client-id')) {
          throw new Error('유효한 Google Client ID가 설정되지 않았습니다');
        }

        console.log('사용 중인 CLIENT_ID:', GOOGLE_CONFIG.CLIENT_ID);
        console.log('SCOPES:', GOOGLE_CONFIG.SCOPES);
        console.log('현재 도메인:', window.location.origin);
        
        setIsLoading(false);
        console.log('=== Google Services 초기화 성공 ===');
      } catch (error) {
        console.error('=== Google Services 초기화 실패 ===');
        console.error('오류 상세:', error);
        setIsLoading(false);
      }
    };

    const waitForGoogleServices = () => {
      console.log('Google Services 로드 상태 확인 중...');
      console.log('window.gapi:', !!window.gapi);
      console.log('window.google:', !!window.google);
      console.log('window.googleServicesLoaded:', window.googleServicesLoaded);
      
      if (window.googleServicesLoaded) {
        console.log('Google 서비스 이미 준비됨, 초기화 시작');
        initializeGoogleServices();
      } else if (window.gapi && window.google) {
        console.log('서비스는 로드되었지만 플래그가 false, 직접 초기화');
        initializeGoogleServices();
      } else {
        console.log('googleReady 이벤트 대기 중...');
        
        const handleGoogleReady = () => {
          console.log('googleReady 이벤트 수신됨');
          window.removeEventListener('googleReady', handleGoogleReady);
          initializeGoogleServices();
        };
        
        window.addEventListener('googleReady', handleGoogleReady);
        
        // 타임아웃 설정 (15초로 증가)
        setTimeout(() => {
          if (!window.gapi || !window.google) {
            console.error('Google Services 로드 시간 초과');
            window.removeEventListener('googleReady', handleGoogleReady);
            setIsLoading(false);
          } else {
            console.log('타임아웃이지만 서비스는 로드됨, 강제 초기화');
            window.removeEventListener('googleReady', handleGoogleReady);
            initializeGoogleServices();
          }
        }, 15000);
      }
    };
    
    waitForGoogleServices();
  }, [onAuthSuccess]);

  const handleSignIn = async () => {
    console.log('=== 구글 로그인 시작 (GIS) ===');
    
    if (!window.google) {
      console.error('Google Identity Services가 로드되지 않았습니다');
      alert('Google 서비스가 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
      return;
    }

    try {
      console.log('Google Identity Services로 토큰 요청 중...');
      
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: GOOGLE_CONFIG.SCOPES,
        callback: (tokenResponse: any) => {
          console.log('✓ 토큰 수신 성공!', tokenResponse);
          
          if (tokenResponse.access_token) {
            // 토큰을 localStorage에 저장 (1시간 유효기간)
            const expiryTime = new Date().getTime() + (3600 * 1000); // 1시간 후
            localStorage.setItem('google_access_token', tokenResponse.access_token);
            localStorage.setItem('google_token_expiry', expiryTime.toString());
            
            setAccessToken(tokenResponse.access_token);
            setIsSignedIn(true);
            onAuthSuccess(true);
            
            // 전역 상태 업데이트
            updateGoogleAuthState({
              isSignedIn: true,
              accessToken: tokenResponse.access_token
            });
            
            // 사용자 정보 가져오기
            fetchUserProfile(tokenResponse.access_token);
            
            console.log('로그인 완료!');
          } else {
            console.error('액세스 토큰을 받지 못했습니다');
            alert('로그인에 실패했습니다.');
          }
        },
        error_callback: (error: any) => {
          console.error('OAuth 오류:', error);
          alert(`로그인 실패: ${error.type || error.message || '알 수 없는 오류'}`);
        }
      });
      
      // 토큰 요청 시작
      client.requestAccessToken();
      
    } catch (error: any) {
      console.error('=== 로그인 실패 ===');
      console.error('오류:', error);
      alert(`구글 로그인 실패: ${error.message || error}`);
    }
  };

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const profile = await response.json();
        console.log('사용자 프로필:', profile);
        
        // 프로필을 localStorage에 저장
        localStorage.setItem('google_user_profile', JSON.stringify(profile));
        
        setUserProfile(profile);
        
        // 전역 상태에 프로필 업데이트
        updateGoogleAuthState({
          isSignedIn: true,
          accessToken: token,
          userProfile: profile
        });
      }
    } catch (error) {
      console.error('사용자 프로필 가져오기 실패:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('로그아웃 중...');
      
      // 토큰 해제
      if (accessToken && window.google) {
        window.google.accounts.oauth2.revoke(accessToken);
      }
      
      // localStorage 정리
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_user_profile');
      localStorage.removeItem('google_token_expiry');
      
      // 상태 초기화
      setAccessToken(null);
      setIsSignedIn(false);
      setUserProfile(null);
      onAuthSuccess(false);
      
      // 전역 상태 초기화
      updateGoogleAuthState({
        isSignedIn: false,
        accessToken: null,
        userProfile: null
      });
      
      console.log('로그아웃 완료');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f3f4f6',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        구글 API 초기화 중...
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      {isSignedIn ? (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <span style={{ color: '#16a34a', fontSize: '18px' }}>✓</span>
            <span style={{ color: '#16a34a', fontWeight: '500' }}>
              {userProfile ? `${userProfile.name} 연동됨` : '구글 계정 연동됨'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            이제 구글 시트 데이터를 가져올 수 있습니다.
          </div>
          <button
            onClick={handleSignOut}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            연동 해제
          </button>
        </div>
      ) : (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '18px' }}>🔗</span>
            <span style={{ fontWeight: '500' }}>
              구글 시트 연동
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            구글 계정으로 로그인하여 시트 데이터를 가져오세요.
          </div>
          <button
            onClick={handleSignIn}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>G</span>
            구글로 로그인
          </button>
        </div>
      )}
    </div>
  );
};

export default GoogleAuth;