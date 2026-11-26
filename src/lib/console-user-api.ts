/**
 * Klien untuk endpoint `/console/*` berbasis USER di service platform
 * (plan/architecture/core-service-flag-removal-plan.md P2).
 *
 * Hanya mengirim token login user (`Authorization: Bearer`). Tidak memakai
 * token client app / secret core service — service memverifikasi token ke
 * bagdja-auth dan mengecek keanggotaan org sistem + permission sendiri.
 */

import { requireAccessToken } from './auth';
import type { ApiError } from '@/types';

export function requireServiceBase(envValue: string | undefined, envName: string): string {
  if (!envValue) {
    throw new Error(`${envName} environment variable is required. Please set it in your .env file.`);
  }
  return envValue;
}

/**
 * Pesan 403 yang bisa ditindaklanjuti (org-user-management-plan §7): apa yang
 * kurang + ke mana minta izin. Detail asli dari service tetap disertakan.
 */
export function describeForbidden(detail: string): string {
  const hint =
    'Minta owner atau admin organisasi memberi izin di Organizations → Anggota & Role.';
  if (/system organization/i.test(detail)) {
    return `Hanya anggota organisasi sistem yang boleh melakukan aksi ini. ${hint}`;
  }
  if (/not a member of this organization/i.test(detail)) {
    return `Anda bukan anggota organisasi pemilik data ini. ${hint}`;
  }
  if (/not owned by organization/i.test(detail)) {
    return 'App ini bukan milik organisasi yang sedang aktif. Pilih organisasi pemilik App lebih dulu.';
  }
  return `Anda tidak punya izin untuk aksi ini (${detail}). ${hint}`;
}

export async function consoleUserRequest<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const userToken = requireAccessToken();
  if (!userToken) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
      ...(options.headers as Record<string, string>),
    },
    cache: options.cache || 'no-store',
  });

  if (!response.ok) {
    const error: ApiError = { message: 'An error occurred', statusCode: response.status };
    try {
      const errorData = await response.json();
      error.message = errorData.message || errorData.error || error.message;
    } catch {
      error.message = response.statusText || error.message;
    }

    // 401/403 dari service non-auth TIDAK menghapus token login (29 Okt 2026):
    // bisa berarti izin di service itu, bukan sesi berakhir. Sesi hanya
    // diakhiri oleh 401 dari bagdja-auth (lib/api.ts).

    if (response.status === 403) {
      error.code = 'FORBIDDEN';
      error.message = describeForbidden(error.message);
    }

    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Request ke `${NEXT_PUBLIC_PAYMENT_API}/console…` sebagai user. */
export function paymentConsoleRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = requireServiceBase(process.env.NEXT_PUBLIC_PAYMENT_API, 'NEXT_PUBLIC_PAYMENT_API');
  return consoleUserRequest<T>(base, `/console${path}`, options);
}
