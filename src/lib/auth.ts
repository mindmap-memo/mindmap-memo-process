import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';
import { NextRequest } from 'next/server';

export async function getUserFromSession() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return null;
  }

  return session.user;
}

export async function requireAuth() {
  const user = await getUserFromSession();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}
