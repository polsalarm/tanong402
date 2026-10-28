/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_MOCK_API?: string;
  readonly VITE_NETWORK?: string;
  readonly VITE_RECEIVER_ADDRESS?: string;
  readonly VITE_MAX_PRICE_USDC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
