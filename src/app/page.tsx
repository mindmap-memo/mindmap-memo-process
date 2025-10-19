import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AppContent from '../components/AppContent';

export default async function Home() {
  const session = await auth();

  // 로그인하지 않은 경우 로그인 페이지로 리디렉션
  if (!session) {
    redirect('/auth/signin');
  }

  return <AppContent />;
}
