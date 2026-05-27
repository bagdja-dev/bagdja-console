/**
 * OAuth Callback Handler - Server-side Code Exchange
 * POST /api/auth/callback
 * 
 * Handles OAuth callback from bagdja-login
 * Exchanges authorization code for access token
 * Returns secure httpOnly cookie + redirect path
 */

import { NextRequest, NextResponse } from 'next/server';
import { decryptState } from '@/lib/oauth';

const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL || 'https://bagdja-login.local';
const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY || '';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || '';
const NEXT_PUBLIC_CLIENT_ID =
  process.env.NEXT_PUBLIC_CLIENT_ID ||
  process.env.NEXT_PUBLIC_CLIENT_APP_ID ||
  'user-console';

interface TokenExchangeRequest {
  code?: string;
  state?: string;
  code_verifier?: string;
}

/**
 * Validate callback request
 */
function validateRequest(body: TokenExchangeRequest): { valid: boolean; error?: string } {
  if (!body.code) {
    return { valid: false, error: 'code is required' };
  }

  if (!body.state) {
    return { valid: false, error: 'state is required' };
  }

  if (!body.code_verifier) {
    return { valid: false, error: 'code_verifier is required' };
  }

  return { valid: true };
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const redirectUri =
      process.env.NEXT_PUBLIC_REDIRECT_URI ||
      `${request.nextUrl.origin}/auth/callback`;

    if (!SESSION_ENCRYPTION_KEY) {
      console.error('SESSION_ENCRYPTION_KEY not configured');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    const body: TokenExchangeRequest = await request.json();
    // #region debug-point D:console-callback-input
    fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'oauth-login-loop', runId: 'pre-fix', hypothesisId: 'D', location: 'bagdja-console/src/app/api/auth/callback/route.ts:POST', msg: '[DEBUG] console callback route received oauth params', data: { hasCode: !!body.code, hasState: !!body.state, hasCodeVerifier: !!body.code_verifier, loginUrl: LOGIN_URL, clientId: NEXT_PUBLIC_CLIENT_ID, redirectUri }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid request' },
        { status: 400 }
      );
    }

    // Decrypt and validate state parameter
    const statePayload = await decryptState(body.state!, SESSION_ENCRYPTION_KEY);
    // #region debug-point D:console-state-decrypt
    fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'oauth-login-loop', runId: 'pre-fix', hypothesisId: 'D', location: 'bagdja-console/src/app/api/auth/callback/route.ts:POST', msg: '[DEBUG] console callback state decrypt result', data: { stateValid: !!statePayload, redirectPath: statePayload?.path || null }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    if (!statePayload) {
      return NextResponse.json(
        { error: 'Invalid or expired state parameter' },
        { status: 400 }
      );
    }

    // Extract path from state
    const redirectPath = statePayload.path || '/dashboard';

    // Exchange authorization code for access token
    // Call bagdja-login /oauth/token endpoint
    const tokenResponse = await fetch(`${LOGIN_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: body.code,
        code_verifier: body.code_verifier,
        redirect_uri: redirectUri,
        client_id: NEXT_PUBLIC_CLIENT_ID,
        client_secret: OAUTH_CLIENT_SECRET,
      }),
    });
    // #region debug-point D:console-token-exchange-response
    fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'oauth-login-loop', runId: 'pre-fix', hypothesisId: 'D', location: 'bagdja-console/src/app/api/auth/callback/route.ts:POST', msg: '[DEBUG] console callback token exchange response', data: { status: tokenResponse.status, ok: tokenResponse.ok }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token exchange failed:', error);
      return NextResponse.json(
        { error: error.error || 'Token exchange failed' },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token in response' },
        { status: 500 }
      );
    }

    // Create response with secure httpOnly cookie
    const response = NextResponse.json(
      {
        success: true,
        redirectPath,
      },
      { status: 200 }
    );

    // Set httpOnly, Secure cookie with token
    // The cookie name should match what middleware expects
    response.cookies.set({
      name: 'bagdja_auth_token',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600, // 1 hour default
      path: '/',
    });

    // Also set a non-httpOnly cookie for client-side JavaScript if needed
    // This can be used by fetch interceptors, but token is primarily in httpOnly
    response.cookies.set({
      name: 'bagdja_access_token_flag',
      value: 'set', // Just a flag to indicate token is set
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
