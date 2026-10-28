#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ( "$1" != "testnet" && "$1" != "mainnet" ) ]]; then
  echo "Usage: $0 <testnet|mainnet>" >&2
  exit 2
fi
: "${POOL_CONTRACT_ID:?Set POOL_CONTRACT_ID}"
NETWORK="$1"
SOURCE_IDENTITY="${SOURCE_IDENTITY:-tanong-admin}"
ALLOWANCE="${ALLOWANCE:-2500000}"
PERIOD="${PERIOD:-604800}"
stellar contract invoke --id "$POOL_CONTRACT_ID" --source "$SOURCE_IDENTITY" --network "$NETWORK" -- config
stellar contract invoke --id "$POOL_CONTRACT_ID" --source "$SOURCE_IDENTITY" --network "$NETWORK" -- stats
printf 'Pool %s is initialized on %s (allowance=%s, period=%s).\n' "$POOL_CONTRACT_ID" "$NETWORK" "$ALLOWANCE" "$PERIOD"

