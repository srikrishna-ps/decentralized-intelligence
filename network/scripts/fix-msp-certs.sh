#!/bin/bash

# Fix MSP certificate mismatches

set -e

GREEN='\033[0;32m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"

print_status "Fixing MSP certificate mismatches..."

# Fix orderer root MSP - use the same CA cert as orderer0
ORDERER0_CA="${NETWORK_DIR}/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/msp/cacerts/ca.orderer.medical.com-cert.pem"
ROOT_ORDERER_CA="${NETWORK_DIR}/organizations/ordererOrganizations/orderer.medical.com/msp/cacerts/ca.orderer.medical.com-cert.pem"

if [ -f "$ORDERER0_CA" ]; then
    cp "$ORDERER0_CA" "$ROOT_ORDERER_CA"
    print_status "✓ Synced orderer root MSP CA certificate"
fi

# Ensure all orderer MSPs have the same CA
for orderer in orderer0 orderer1 orderer2; do
    ORDERER_MSP="${NETWORK_DIR}/organizations/ordererOrganizations/orderer.medical.com/orderers/${orderer}.orderer.medical.com/msp/cacerts/ca.orderer.medical.com-cert.pem"
    if [ -f "$ORDERER0_CA" ] && [ -f "$ORDERER_MSP" ]; then
        cp "$ORDERER0_CA" "$ORDERER_MSP"
    fi
done

# Update in CLI container
print_status "Updating MSPs in CLI container..."
docker cp "${NETWORK_DIR}/organizations" cli:/opt/gopath/src/github.com/hyperledger/fabric/peer/ || {
    echo "Failed to copy organizations"
    exit 1
}

print_status "MSP certificates fixed!"


