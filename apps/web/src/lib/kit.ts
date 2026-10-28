type KitModule = typeof import("./walletKit");

let kitPromise: Promise<KitModule> | null = null;

/** Lazily loads the wallet + signing module once. */
export function loadKit(): Promise<KitModule> {
  if (!kitPromise) {
    kitPromise = import("./walletKit").catch((err: unknown) => {
      kitPromise = null; // allow a retry after a failed chunk download
      throw err;
    });
  }
  return kitPromise;
}

export type Kit = KitModule;
