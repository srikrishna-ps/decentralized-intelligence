#!/bin/bash

# Complete network setup script that fixes all certificate issues

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"

print_status "=== Complete Network Setup ==="

# The fundamental issue is that cryptogen generates certificates, and when configtxgen
# reads the MSP directories, it embeds those certificates in the channel block.
# The orderer then validates the block, and the certificates must match exactly.

# Since we can't easily regenerate crypto without restarting everything,
# and the certificates seem to have byte-level differences, the best approach is to
# ensure the orderer's MSP has the exact same certificates that configtxgen will read.

print_status "Step 1: Ensuring all CA certificates are synchronized..."

# Copy the exact CA certificates that configtxgen will read to the orderer MSPs
for orderer in orderer0 orderer1 orderer2; do
    ORDERER_MSP="${NETWORK_DIR}/organizations/ordererOrganizations/orderer.medical.com/orderers/${orderer}.orderer.medical.com/msp/cacerts"
    
    # Copy orderer CA (use the one from orderer0 as the source of truth)
    if [ "$orderer" = "orderer0" ]; then
        SOURCE_ORDERER_CA="${ORDERER_MSP}/ca.orderer.medical.com-cert.pem"
    else
        SOURCE_ORDERER_CA="${NETWORK_DIR}/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/msp/cacerts/ca.orderer.medical.com-cert.pem"
        cp "$SOURCE_ORDERER_CA" "${ORDERER_MSP}/" 2>/dev/null || true
    fi
    
    # Copy application org CA certs (use the ones from peer org MSPs as source of truth)
    for org in hospital insurance regulatory; do
        SOURCE_CA="${NETWORK_DIR}/organizations/peerOrganizations/${org}.medical.com/msp/cacerts/ca.${org}.medical.com-cert.pem"
        if [ -f "$SOURCE_CA" ]; then
            cp "$SOURCE_CA" "${ORDERER_MSP}/" 2>/dev/null || true
        fi
    done
done

# Also update root orderer MSP
ROOT_ORDERER_MSP="${NETWORK_DIR}/organizations/ordererOrganizations/orderer.medical.com/msp/cacerts"
SOURCE_ORDERER_CA="${NETWORK_DIR}/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/msp/cacerts/ca.orderer.medical.com-cert.pem"
if [ -f "$SOURCE_ORDERER_CA" ]; then
    cp "$SOURCE_ORDERER_CA" "${ROOT_ORDERER_MSP}/" 2>/dev/null || true
fi

print_status "Step 2: Restarting orderers to pick up certificate changes..."
docker restart orderer0.orderer.medical.com orderer1.orderer.medical.com orderer2.orderer.medical.com

print_status "Step 3: Waiting for orderers to be ready..."
sleep 10

print_status "Step 4: Updating MSPs in CLI container..."
docker cp "${NETWORK_DIR}/organizations" cli:/opt/gopath/src/github.com/hyperledger/fabric/peer/ || {
    print_error "Failed to copy organizations"
    exit 1
}

print_status "Step 5: Regenerating channel blocks..."
bash "${SCRIPT_DIR}/fix-channels.sh"

print_status "Step 6: Joining orderers to channels..."
bash "${SCRIPT_DIR}/join-orderers.sh"

print_status "=== Setup Complete ==="
print_status "If orderers still fail to join, the issue may require regenerating all crypto material."
print_status "Run 'npm run fabric:cleanup' then 'npm run fabric:bootstrap' to start fresh."


