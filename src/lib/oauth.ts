/**
 * OAuth 2.0 + PKCE utilities for bagdja-console (client side)
 * Mirrors server-side utilities but works in browser environment
 */

/**
 * Generate a cryptographically random code verifier (43-128 characters)
 * RFC 7636 compliant
 * Browser version using Web Crypto API
 */
export async function generateCodeVerifier(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/**
 * Generate code challenge from code verifier using SHA256
 * RFC 7636 S256 method (recommended over 'plain')
 * Browser version using Web Crypto API
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64url(new Uint8Array(hash));
}

/**
 * Base64URL encode (RFC 4648 §5)
 * Works in browser environment
 */
function base64url(buffer: Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * State parameter data structure
 * Contains path and nonce for validation
 */
export interface StatePayload {
  path: string;
  nonce: string;
  iat: number; // issued at timestamp
}

/**
 * Generate encrypted state parameter (client-side)
 * Uses Web Crypto API for AES-256-GCM encryption
 * 
 * @param path - Original path to redirect after auth (e.g. '/dashboard')
 * @param encryptionKeyStr - 32-byte encryption key (base64url)
 * @param nonce - Optional nonce for validation
 */
export async function generateState(
  path: string,
  encryptionKeyStr: string,
  nonce?: string
): Promise<string> {
  const payload: StatePayload = {
    path,
    nonce: nonce || Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''),
    iat: Date.now(),
  };

  // Create IV (initialization vector) - 16 bytes for AES
  const iv = crypto.getRandomValues(new Uint8Array(16));

  // Decode encryption key from base64url
  const encryptionKey = base64urlDecode(encryptionKeyStr);

  // Import key for Web Crypto
  const key = await crypto.subtle.importKey(
    'raw',
    encryptionKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Encrypt payload
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    plaintext
  );

  // For GCM mode, we need to extract the auth tag (last 16 bytes of ciphertext)
  // Most Web Crypto API implementations include it, but we need to handle both cases
  // Combine IV + ciphertext and encode to base64url
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return base64url(combined);
}

/**
 * Decrypt and validate state parameter (client-side)
 * Returns decoded state payload if valid
 * 
 * @param state - Encrypted state parameter from OAuth callback
 * @param encryptionKeyStr - Same 32-byte encryption key used during generation
 * @param maxAge - Max age in seconds (prevent replay attacks)
 */
export async function decryptState(
  state: string,
  encryptionKeyStr: string,
  maxAge: number = 600 // 10 minutes default
): Promise<StatePayload | null> {
  try {
    // Decode from base64url
    const combined = base64urlDecode(state);

    // Extract IV (first 16 bytes) + ciphertext (rest)
    const iv = combined.slice(0, 16);
    const ciphertext = combined.slice(16);

    // Decode encryption key from base64url
    const encryptionKey = base64urlDecode(encryptionKeyStr);

    // Import key for Web Crypto
    const key = await crypto.subtle.importKey(
      'raw',
      encryptionKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    const decrypted = new TextDecoder().decode(plaintext);
    const payload = JSON.parse(decrypted) as StatePayload;

    // Validate payload structure
    if (!payload.path || !payload.nonce || !payload.iat) {
      return null;
    }

    // Check max age
    const age = (Date.now() - payload.iat) / 1000;
    if (age > maxAge) {
      return null;
    }

    return payload;
  } catch (error) {
    // Invalid state (tampering, corruption, or wrong key)
    console.error('State decryption failed:', error);
    return null;
  }
}

/**
 * Decode base64url to Uint8Array
 */
function base64urlDecode(str: string): Uint8Array {
  const binary = atob(
    str
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(str.length + ((4 - (str.length % 4)) % 4), '=')
  );
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Validate code verifier format
 * RFC 7636: unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 * Length: 43-128 characters
 */
export function isValidCodeVerifier(verifier: string): boolean {
  if (!verifier || verifier.length < 43 || verifier.length > 128) {
    return false;
  }
  // Check if only contains unreserved characters
  return /^[A-Za-z0-9\-._~]+$/.test(verifier);
}

/**
 * Validate code challenge format
 * Should be base64url without padding, 43-128 characters
 */
export function isValidCodeChallenge(challenge: string): boolean {
  if (!challenge || challenge.length < 43 || challenge.length > 128) {
    return false;
  }
  // Base64url without padding
  return /^[A-Za-z0-9\-_]+$/.test(challenge);
}

/**
 * Check if string is valid base64url format
 */
export function isValidBase64url(str: string): boolean {
  if (!str) return false;
  try {
    // Try to decode - will throw if invalid
    base64urlDecode(str);
    return /^[A-Za-z0-9\-_]*$/.test(str);
  } catch {
    return false;
  }
}

/**
 * Generate a secure encryption key (32 bytes for AES-256)
 * Returns as base64url
 */
export function generateEncryptionKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64url(bytes);
}
