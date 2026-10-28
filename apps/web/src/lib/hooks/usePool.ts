import type { PoolStatus } from "@tanong/shared";
import { useConfig } from "../../contexts/ConfigContext";
import { useWallet } from "../../contexts/WalletContext";
import { api } from "../api";
import { useResource } from "./useResource";

/** Scholarship Pool status for the active account (null key = idle when not applicable). */
export function usePool() {
  const { config } = useConfig();
  const { address, status } = useWallet();
  const enabled = Boolean(config?.poolEnabled && address && status === "ready");
  const res = useResource<PoolStatus>(
    enabled ? `pool:${address}` : null,
    (signal) => api.poolStatus(address!, signal),
    { pollMs: 60_000 },
  );
  return { ...res, enabled };
}
