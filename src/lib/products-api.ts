/**
 * Products API Client
 * Handles all API calls related to products.
 *
 * Dipindah dari bagdja-auth ke bagdja-payment-service (lihat
 * refactoring-payment-service.md §5). `appId` yang dipakai di sini adalah
 * slug app (`ClientApp.appId`), bukan lagi UUID `ClientApp.id`.
 */

import { paymentAppRequest, paymentConsoleRequest, type AppScope } from './console-user-api';
import type { Product, CreateProductRequest, UpdateProductRequest } from '@/types';

/*
 * Lewat endpoint `/console/*` berbasis token user — tanpa token client
 * (core-service-flag-removal-plan.md P5.4):
 * - pemilik App: `/console/apps/:appId/products` (header org pemilik App);
 * - org sistem: `/console/catalog/products?appId=` (read-only).
 */

/** Product satu App, sebagai anggota org pemilik App. */
export async function getProducts(app: AppScope): Promise<Product[]> {
  return paymentAppRequest<Product[]>(app, '/products');
}

/** Product App mana pun, untuk org sistem (Infrastructure). */
export async function getPlatformProducts(appId: string): Promise<Product[]> {
  return paymentConsoleRequest<Product[]>(`/catalog/products?appId=${encodeURIComponent(appId)}`);
}

export async function createProduct(app: AppScope, data: CreateProductRequest): Promise<Product> {
  return paymentAppRequest<Product>(app, '/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProduct(app: AppScope, id: string, data: UpdateProductRequest): Promise<Product> {
  return paymentAppRequest<Product>(app, `/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(app: AppScope, id: string): Promise<void> {
  return paymentAppRequest<void>(app, `/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
