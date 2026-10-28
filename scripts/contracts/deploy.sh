#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ( "$1" != "testnet" && "$1" != "mainnet" ) ]]; then
  echo "Usage: $0 <testnet|mainnet>" >&2
  exit 2
fi

NETWORK="$1"
: "${POOL_ADMIN:?Set POOL_ADMIN to the pool administrator public address or identity}"
: "${USDC_SAC:=$([[ "$NETWORK" == "testnet" ]] && echo 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA' || true)}"
: "${USDC_SAC:?Set USDC_SAC for mainnet}"
ALLOWANCE="${ALLOWANCE:-2500000}"
PERIOD="${PERIOD:-604800}"
SOURCE_IDENTITY="${SOURCE_IDENTITY:-tanong-admin}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT/contracts"
stellar contract build
WASM="target/wasm32v1-none/release/tanong_pool.wasm"
CONTRACT_ID="$(stellar contract deploy --wasm "$WASM" --source "$SOURCE_IDENTITY" --network "$NETWORK" -- --admin "$POOL_ADMIN" --token "$USDC_SAC" --allowance "$ALLOWANCE" --period "$PERIOD")"
printf '%s\n' "$CONTRACT_ID"

