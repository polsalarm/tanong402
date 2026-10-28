#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 || ( "$1" != "testnet" && "$1" != "mainnet" ) ]]; then
  echo "Usage: $0 <testnet|mainnet> <amount-in-usdc-base-units>" >&2
  exit 2
fi
: "${POOL_CONTRACT_ID:?Set POOL_CONTRACT_ID}"
NETWORK="$1"
AMOUNT="$2"
SOURCE_IDENTITY="${SOURCE_IDENTITY:-sponsor}"
SPONSOR="${SPONSOR:-$SOURCE_IDENTITY}"
stellar contract invoke --id "$POOL_CONTRACT_ID" --source "$SOURCE_IDENTITY" --network "$NETWORK" -- fund --from "$SPONSOR" --amount "$AMOUNT"

