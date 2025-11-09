'use client'

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import App from '../App';
import ErrorBoundary from '../components/ErrorBoundary';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#6b7280'
      }}>
        로딩 중...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
