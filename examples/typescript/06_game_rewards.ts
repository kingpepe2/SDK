// Scenario 15: a minimal game rewards backend.
// Private keys and RPC credentials stay on this backend. Game clients must never
// connect to the wallet RPC. The internal ledger is the source of truth for
// player balances; the chain is only for deposits and withdrawals.
import { KingPepeClient, assertKingPepeAddress, parseKpepe, rpcAmountToBaseUnits } from "@kingpepe/sdk";

const REQUIRED_CONFIRMATIONS = 2;

// In-memory ledger for illustration only — use a transactional database.
const balances = new Map<string, bigint>(); // playerId -> base units
const creditedOutpoints = new Set<string>(); // idempotency for deposits
const withdrawals = new Map<string, string>(); // withdrawalId -> txid (idempotency)
const depositAddress = new Map<string, string>(); // playerId -> address

function credit(playerId: string, amount: bigint) {
  balances.set(playerId, (balances.get(playerId) ?? 0n) + amount);
}

export async function getDepositAddress(wallet: KingPepeClient, playerId: string) {
  let addr = depositAddress.get(playerId);
  if (!addr) {
    addr = await wallet.getNewAddress(`player:${playerId}`);
    depositAddress.set(playerId, addr);
  }
  return addr;
}

// Credit confirmed deposits exactly once (idempotent on txid:vout).
export async function scanDeposits(wallet: KingPepeClient, playerId: string) {
  const addr = await getDepositAddress(wallet, playerId);
  for (const u of await wallet.listUnspent(REQUIRED_CONFIRMATIONS, 9_999_999, [addr])) {
    const key = `${u.txid}:${u.vout}`;
    if (creditedOutpoints.has(key)) continue;
    creditedOutpoints.add(key);
    credit(playerId, rpcAmountToBaseUnits(u.amount));
  }
}

// Rewards are internal ledger movements — no on-chain transaction.
export function rewardPlayer(playerId: string, rewardId: string, amountKpepe: string, seen: Set<string>) {
  if (seen.has(rewardId)) return; // idempotent on reward id
  seen.add(rewardId);
  credit(playerId, parseKpepe(amountKpepe));
}

// Withdraw on-chain: debit first (inside your DB transaction), validate address,
// and use an idempotency key so retries cannot double-spend.
export async function withdraw(
  wallet: KingPepeClient,
  playerId: string,
  toAddress: string,
  amountKpepe: string,
  withdrawalId: string,
) {
  if (withdrawals.has(withdrawalId)) return withdrawals.get(withdrawalId);
  assertKingPepeAddress(toAddress); // reject Bitcoin/typo addresses
  const amount = parseKpepe(amountKpepe);
  const balance = balances.get(playerId) ?? 0n;
  if (balance < amount) throw new Error("insufficient balance");
  balances.set(playerId, balance - amount); // debit before broadcast
  const txid = await wallet.sendToAddress(toAddress, amount);
  withdrawals.set(withdrawalId, txid);
  return txid;
}
