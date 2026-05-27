import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear the httpOnly session cookie
  response.cookies.set({
    name: 'bagdja_auth_token',
    value: '',
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  // Clear the client-side flag cookie
  response.cookies.set({
    name: 'bagdja_access_token_flag',
    value: '',
    httpOnly: false,
    expires: new Date(0),
    path: '/',
  });

  return response;
}
