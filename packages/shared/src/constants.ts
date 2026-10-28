export type StellarNetwork = "stellar:testnet" | "stellar:pubnet";

/** USDC Stellar Asset Contract addresses (match @x402/stellar defaults). */
export const USDC_ADDRESS: Record<StellarNetwork, string> = {
  "stellar:testnet": "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  "stellar:pubnet": "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
};

/** Classic USDC asset (code + issuer), needed for trustlines. */
export const USDC_ISSUER: Record<StellarNetwork, string> = {
  "stellar:testnet": "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  "stellar:pubnet": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
};

export const NETWORK_PASSPHRASE: Record<StellarNetwork, string> = {
  "stellar:testnet": "Test SDF Network ; September 2015",
  "stellar:pubnet": "Public Global Stellar Network ; September 2015",
};

export const DEFAULT_RPC_URL: Record<StellarNetwork, string> = {
  "stellar:testnet": "https://soroban-testnet.stellar.org",
  "stellar:pubnet": "https://mainnet.sorobanrpc.com",
};

export const DEFAULT_HORIZON_URL: Record<StellarNetwork, string> = {
  "stellar:testnet": "https://horizon-testnet.stellar.org",
  "stellar:pubnet": "https://horizon.stellar.org",
};

export const TOKEN_DECIMALS = 7;
export const UNITS_PER_TOKEN = 10_000_000n;

/** Default price per question in USDC. Server can override with PRICE_USDC. */
export const DEFAULT_PRICE_USDC = "0.005";
export const DEFAULT_PHP_PER_USD = 58;

export const MAX_QUESTION_CHARS = 2000;
export const MAX_HISTORY_TURNS = 4;

export const SUBJECTS = [
  "math",
  "physics",
  "chemistry",
  "programming",
  "filipino",
  "writing",
  "general",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_LABEL: Record<Subject, string> = {
  math: "Math",
  physics: "Physics",
  chemistry: "Chem",
  programming: "Programming",
  filipino: "Filipino",
  writing: "Writing",
  general: "General",
};

export function explorerTxUrl(network: StellarNetwork, hash: string): string {
  const net = network === "stellar:pubnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/tx/${hash}`;
}

export function explorerAccountUrl(network: StellarNetwork, address: string): string {
  const net = network === "stellar:pubnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/account/${address}`;
}

export function explorerContractUrl(network: StellarNetwork, id: string): string {
  const net = network === "stellar:pubnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/contract/${id}`;
}
