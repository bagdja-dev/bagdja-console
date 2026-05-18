/** Matches bagdja-payment-service BillingService.getSettings() lookup order. */

export const BILLING_DEFAULT_APP = 'default';
export const BILLING_DEFAULT_ORG = 'default';
export const BILLING_DEFAULT_PRODUCT = 'default';
export const BILLING_DEFAULT_CURRENCY = 'DEFAULT';

export function isSystemGlobalKeys(
  org_id: string,
  app_id: string,
  product_id: string,
  currency: string,
): boolean {
  return (
    org_id === BILLING_DEFAULT_ORG &&
    app_id === BILLING_DEFAULT_APP &&
    product_id === BILLING_DEFAULT_PRODUCT &&
    currency === BILLING_DEFAULT_CURRENCY
  );
}

export function getHierarchyStep(
  org_id: string,
  app_id: string,
  product_id: string,
  currency: string,
): number {
  const isOrg = (v: string) => v !== BILLING_DEFAULT_ORG;
  const isApp = (v: string) => v !== BILLING_DEFAULT_APP;
  const isProduct = (v: string) => v !== BILLING_DEFAULT_PRODUCT;
  const isCur = (v: string) => v !== BILLING_DEFAULT_CURRENCY;

  if (isOrg(org_id) && isApp(app_id) && isProduct(product_id) && isCur(currency)) return 1;
  if (isOrg(org_id) && isApp(app_id) && isProduct(product_id) && !isCur(currency)) return 2;
  if (isOrg(org_id) && isApp(app_id) && !isProduct(product_id) && isCur(currency)) return 3;
  if (isOrg(org_id) && isApp(app_id) && !isProduct(product_id) && !isCur(currency)) return 4;
  if (isOrg(org_id) && !isApp(app_id) && !isProduct(product_id) && isCur(currency)) return 5;
  if (isOrg(org_id) && !isApp(app_id) && !isProduct(product_id) && !isCur(currency)) return 6;
  if (!isOrg(org_id) && isCur(currency)) return 7;
  return 8;
}

export function describeHierarchyStep(
  org_id: string,
  app_id: string,
  product_id: string,
  currency: string,
): string {
  const step = getHierarchyStep(org_id, app_id, product_id, currency);
  const labels: Record<number, string> = {
    1: 'Org + App + Product + Currency',
    2: 'Org + App + Product + All currencies',
    3: 'Org + App + All products + Currency',
    4: 'Org + App + All products + All currencies',
    5: 'Org + All apps + Currency',
    6: 'Org + All apps + All currencies',
    7: 'System global + Currency',
    8: 'System global default',
  };
  return `Hierarchy priority #${step} — ${labels[step] ?? 'Unknown'}`;
}

export function formatRuleKeyLabel(
  org_id: string,
  app_id: string,
  product_id: string,
  currency: string,
): string {
  const org = org_id === BILLING_DEFAULT_ORG ? 'Global' : org_id;
  const app = app_id === BILLING_DEFAULT_APP ? 'All apps' : app_id;
  const product =
    product_id === BILLING_DEFAULT_PRODUCT ? 'All products' : product_id;
  const cur = currency === BILLING_DEFAULT_CURRENCY ? 'All currencies' : currency;
  return `${org} · ${app} · ${product} · ${cur}`;
}
