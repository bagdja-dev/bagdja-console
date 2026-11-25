/**
 * Payment Method Fees API Client
 *
 * Memanggil jalur Console berbasis USER di payment-service
 * (`/console/payment-method-fees`, plan/architecture/
 * core-service-flag-removal-plan.md P2): cukup token login user, tanpa
 * token client app core service. Butuh keanggotaan org sistem +
 * `console.infra.payment-fees.view` / `.manage`.
 */

import { paymentConsoleRequest } from './console-user-api';

const BASE = '/payment-method-fees';

export interface PaymentMethodFee {
  id: string;
  provider: string;
  method: string;
  fixedFee: number;
  percentageFee: number;
  currency: string;
  orgId: string;
  appId: string;
  isActive: boolean;
  topupRewardFixedFee: number;
  topupRewardPercentageFee: number;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethodFeeListResponse = {
  data: PaymentMethodFee[];
  total: number;
  page: number;
  limit: number;
};

export type PaymentMethodFeesQuery = {
  page?: number;
  limit?: number;
  size?: number;
  search?: string;
  sort?: string;
  provider?: string;
  method?: string;
  currency?: string;
  orgId?: string;
  appId?: string;
  isActive?: string;
};

export async function getPaymentMethodFees(
  params?: PaymentMethodFeesQuery
): Promise<PaymentMethodFeeListResponse> {
  const qs = new URLSearchParams();
  const page = params?.page;
  const limit = params?.limit ?? params?.size;

  if (page) qs.append('page', String(page));
  if (limit) qs.append('limit', String(limit));
  if (params?.search) qs.append('search', params.search);
  if (params?.sort) qs.append('sort', params.sort);
  if (params?.provider) qs.append('provider', params.provider);
  if (params?.method) qs.append('method', params.method);
  if (params?.currency) qs.append('currency', params.currency);
  if (params?.orgId) qs.append('orgId', params.orgId);
  if (params?.appId) qs.append('appId', params.appId);
  if (params?.isActive) qs.append('is_active', params.isActive);

  const queryString = qs.toString();
  return paymentConsoleRequest<PaymentMethodFeeListResponse>(queryString ? `${BASE}?${queryString}` : BASE, {
    method: 'GET',
  });
}

export async function createPaymentMethodFee(
  payload: Omit<PaymentMethodFee, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PaymentMethodFee> {
  return paymentConsoleRequest<PaymentMethodFee>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePaymentMethodFee(
  id: string,
  payload: Partial<Omit<PaymentMethodFee, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PaymentMethodFee> {
  return paymentConsoleRequest<PaymentMethodFee>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deletePaymentMethodFee(id: string): Promise<void> {
  return paymentConsoleRequest<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
