/** Matches bagdja-payment-service BillingService.getSettings() lookup order. */

export const BILLING_DEFAULT_APP = 'default';
export const BILLING_DEFAULT_ORG = 'default';
export const BILLING_DEFAULT_ITEM_TYPE = 'default';
export const BILLING_DEFAULT_ITEM = 'default';
export const BILLING_DEFAULT_CURRENCY = 'DEFAULT';

export function isSystemGlobalKeys(
  org_id: string,
  app_id: string,
  item_type: string,
  item_id: string,
  currency: string,
): boolean {
  return (
    org_id === BILLING_DEFAULT_ORG &&
    app_id === BILLING_DEFAULT_APP &&
    item_type === BILLING_DEFAULT_ITEM_TYPE &&
    item_id === BILLING_DEFAULT_ITEM &&
    currency === BILLING_DEFAULT_CURRENCY
  );
}

export function getHierarchyStep(
  org_id: string,
  app_id: string,
  item_type: string,
  item_id: string,
  currency: string,
): number {
  const isOrg = (v: string) => v !== BILLING_DEFAULT_ORG;
  const isApp = (v: string) => v !== BILLING_DEFAULT_APP;
  const isType = (v: string) => v !== BILLING_DEFAULT_ITEM_TYPE;
  const isItem = (v: string) => v !== BILLING_DEFAULT_ITEM;
  const isCur = (v: string) => v !== BILLING_DEFAULT_CURRENCY;

  if (isOrg(org_id) && isApp(app_id) && isType(item_type) && isItem(item_id) && isCur(currency)) return 1;
  if (isOrg(org_id) && isApp(app_id) && isType(item_type) && isItem(item_id) && !isCur(currency)) return 2;
  if (isOrg(org_id) && isApp(app_id) && isType(item_type) && !isItem(item_id) && isCur(currency)) return 3;
  if (isOrg(org_id) && isApp(app_id) && isType(item_type) && !isItem(item_id) && !isCur(currency)) return 4;
  if (isOrg(org_id) && isApp(app_id) && !isType(item_type) && !isItem(item_id) && isCur(currency)) return 5;
  if (isOrg(org_id) && isApp(app_id) && !isType(item_type) && !isItem(item_id) && !isCur(currency)) return 6;
  if (isOrg(org_id) && !isApp(app_id) && !isType(item_type) && !isItem(item_id) && isCur(currency)) return 7;
  if (isOrg(org_id) && !isApp(app_id) && !isType(item_type) && !isItem(item_id) && !isCur(currency)) return 8;
  if (!isOrg(org_id) && isCur(currency)) return 9;
  return 10;
}

export function describeHierarchyStep(
  org_id: string,
  app_id: string,
  item_type: string,
  item_id: string,
  currency: string,
): string {
  const step = getHierarchyStep(org_id, app_id, item_type, item_id, currency);
  const labels: Record<number, string> = {
    1: 'Org + App + Item type + Item + Currency',
    2: 'Org + App + Item type + Item + All currencies',
    3: 'Org + App + Item type + All items + Currency',
    4: 'Org + App + Item type + All items + All currencies',
    5: 'Org + App + All types + All items + Currency',
    6: 'Org + App + All types + All items + All currencies',
    7: 'Org + All apps + All types + All items + Currency',
    8: 'Org + All apps + All types + All items + All currencies',
    9: 'System global + Currency',
    10: 'System global default',
  };
  return `Hierarchy priority #${step} — ${labels[step] ?? 'Unknown'}`;
}

export function formatRuleKeyLabel(
  org_id: string,
  app_id: string,
  item_type: string,
  item_id: string,
  currency: string,
): string {
  const org = org_id === BILLING_DEFAULT_ORG ? 'Global' : org_id;
  const app = app_id === BILLING_DEFAULT_APP ? 'All apps' : app_id;
  const type = item_type === BILLING_DEFAULT_ITEM_TYPE ? 'All types' : item_type;
  const item = item_id === BILLING_DEFAULT_ITEM ? 'All items' : item_id;
  const cur = currency === BILLING_DEFAULT_CURRENCY ? 'All currencies' : currency;
  return `${org} · ${app} · ${type} · ${item} · ${cur}`;
}
