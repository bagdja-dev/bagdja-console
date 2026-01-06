/**
 * Route guard logic
 * Helper functions for route protection
 */

import { getAccessToken } from './auth';

/**
 * Check if user has valid authentication
 */
export function hasValidAuth(): boolean {
  return getAccessToken() !== null;
}

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES = ['/login', '/register'];

/**
 * Check if a route is public
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname);
}





