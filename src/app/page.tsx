'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user has token, if yes go to dashboard, else login
    const token = typeof window !== 'undefined' 
      ? sessionStorage.getItem('bagdja_access_token') 
      : null;
    
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-gray-600">Loading...</div>
    </div>
  );
}
