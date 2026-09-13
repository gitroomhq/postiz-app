/**
 * Solana wallet sign-in. Off unless WALLET_LOGIN=true.
 *
 * This used to follow Stripe: any install with billing showed Continue with
 * Wallet. Hosted PostQueen has Stripe and does not want wallet login, so the
 * two are separate. Unset is off.
 */
export const isWalletLoginEnabled = () => process.env.WALLET_LOGIN === 'true';
