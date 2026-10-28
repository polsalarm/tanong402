import { USDC_ISSUER, type StellarNetwork } from "@tanong/shared";

export interface AccountBalances {
  exists: boolean;
  usdc: string;
  hasUsdcTrustline: boolean;
  xlm: string;
}

/** Reads balances from Horizon. Returns zeros for accounts that don't exist yet. */
export async function getBalances(
  address: string,
  horizonUrl: string,
  network: StellarNetwork,
  fetchImpl: typeof fetch = fetch,
): Promise<AccountBalances> {
  const res = await fetchImpl(`${horizonUrl.replace(/\/$/, "")}/accounts/${address}`);
  if (res.status === 404) return { exists: false, usdc: "0", hasUsdcTrustline: false, xlm: "0" };
  if (!res.ok) throw new Error(`Horizon ${res.status}`);
  const body = (await res.json()) as {
    balances: { asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }[];
  };
  const usdc = body.balances.find(
    (b) => b.asset_code === "USDC" && b.asset_issuer === USDC_ISSUER[network],
  );
  const xlm = body.balances.find((b) => b.asset_type === "native");
  return {
    exists: true,
    usdc: usdc?.balance ?? "0",
    hasUsdcTrustline: Boolean(usdc),
    xlm: xlm?.balance ?? "0",
  };
}
