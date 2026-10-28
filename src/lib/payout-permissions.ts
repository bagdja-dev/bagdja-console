/**
 * Permission key payout/withdrawal (didaftarkan di bagdja-auth, ditegakkan
 * di payment-service). Sumber: refactor-payout-flow-plan.md §5.1.
 */
export const PAYOUT_PERMISSIONS = {
  WITHDRAWALS_REQUEST: 'payment.withdrawals.request',
  WITHDRAWALS_VIEW: 'payment.withdrawals.view',
  WITHDRAWALS_VIEW_ALL: 'payment.withdrawals.view-all',
  WITHDRAWALS_APPROVE: 'payment.withdrawals.approve',
  WITHDRAWALS_REJECT: 'payment.withdrawals.reject',
  CHANNELS_MANAGE: 'payment.payout-channels.manage',
  APP_CHANNELS_MANAGE: 'payment.app-payout-channels.manage',
} as const;
