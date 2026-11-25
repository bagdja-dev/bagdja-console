/**
 * Payment Gateway Credentials API Client
 *
 * Memanggil jalur Console berbasis USER di payment-service
 * (`/console/payment-gateway-credentials`, plan/architecture/
 * core-service-flag-removal-plan.md P2): cukup token login user, tanpa
 * token client app core service. Butuh keanggotaan org sistem +
 * `console.infra.payment-gateway-credentials.view` / `.manage`.
 *
 * Nilai rahasia (apiKey, serverKey, …) tidak pernah dikirim server; saat
 * edit, field rahasia yang dikosongkan mempertahankan nilai tersimpan.
 */

import { paymentConsoleRequest } from './console-user-api';

const BASE = '/payment-gateway-credentials';

export interface PaymentGatewayCredential {
  provider: string;
  org_id: string;
  app_id: string;
  /** Hanya field non-rahasia (mis. merchantCode, baseUrl). */
  credentials: Record<string, string>;
  /** Semua field yang sudah terisi, termasuk yang rahasia (mis. apiKey). */
  configured_fields?: string[];
  is_sandbox: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getPaymentGatewayCredentials(params?: {
  provider?: string;
  orgId?: string;
  appId?: string;
}): Promise<PaymentGatewayCredential[]> {
  const qs = new URLSearchParams();
  if (params?.provider) qs.append('provider', params.provider);
  if (params?.orgId) qs.append('orgId', params.orgId);
  if (params?.appId) qs.append('appId', params.appId);
  const queryString = qs.toString();
  return paymentConsoleRequest<PaymentGatewayCredential[]>(queryString ? `${BASE}?${queryString}` : BASE, {
    method: 'GET',
  });
}

export async function createPaymentGatewayCredential(payload: {
  provider: string;
  org_id?: string;
  app_id?: string;
  credentials: Record<string, string>;
  is_sandbox?: boolean;
  is_active?: boolean;
}): Promise<PaymentGatewayCredential> {
  return paymentConsoleRequest<PaymentGatewayCredential>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePaymentGatewayCredential(
  provider: string,
  orgId: string,
  appId: string,
  payload: Partial<Pick<PaymentGatewayCredential, 'credentials' | 'is_sandbox' | 'is_active'>>,
): Promise<PaymentGatewayCredential> {
  return paymentConsoleRequest<PaymentGatewayCredential>(
    `${BASE}/${encodeURIComponent(provider)}/${encodeURIComponent(orgId)}/${encodeURIComponent(appId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export async function deletePaymentGatewayCredential(provider: string, orgId: string, appId: string): Promise<void> {
  return paymentConsoleRequest<void>(
    `${BASE}/${encodeURIComponent(provider)}/${encodeURIComponent(orgId)}/${encodeURIComponent(appId)}`,
    { method: 'DELETE' },
  );
}
