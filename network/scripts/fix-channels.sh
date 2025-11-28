#!/bin/bash

# Script to fix and regenerate channel blocks with correct MSP configuration

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
PROJECT_ROOT="$(dirname "$NETWORK_DIR")"
CLI_ROOT="/opt/gopath/src/github.com/hyperledger/fabric/peer"
CLI_ORG_DIR="${CLI_ROOT}/organizations"
CLI_CHANNEL_ARTIFACTS_DIR="${CLI_ROOT}/channel-artifacts"
HOST_CHANNEL_ARTIFACTS_DIR="${NETWORK_DIR}/channel-artifacts"

print_status "=== Fixing Channel Configuration ==="

# Step 1: Ensure all MSP directories have correct structure
print_status "Verifying MSP structure..."

# Ensure orderer MSPs have all CA certs
for orderer in orderer0 orderer1 orderer2; do
    ORDERER_MSP="${NETWORK_DIR}/organizations/ordererOrganizations/orderer.medical.com/orderers/${orderer}.orderer.medical.com/msp"
    
    # Copy orderer CA cert if missing
    if [ ! -f "${ORDERER_MSP}/cacerts/ca.orderer.medical.com-cert.pem" ]; then
        cp "${NETWORK_DIR}/organizations/ordererOrganizations/orderer.medical.com/msp/cacerts/ca.orderer.medical.com-cert.pem" \
           "${ORDERER_MSP}/cacerts/" 2>/dev/null || true
    fi
    
    # Copy application org CA certs
    for org in hospital insurance regulatory; do
        ORG_CA="${NETWORK_DIR}/organizations/peerOrganizations/${org}.medical.com/msp/cacerts/ca.${org}.medical.com-cert.pem"
        if [ -f "$ORG_CA" ]; then
            cp "$ORG_CA" "${ORDERER_MSP}/cacerts/" 2>/dev/null || true
        fi
    done
done

# Step 2: Update MSPs in CLI container
print_status "Updating MSPs in CLI container..."
docker cp "${NETWORK_DIR}/organizations" cli:"${CLI_ROOT}/" || {
    print_error "Failed to copy organizations to CLI container"
    exit 1
}

# Step 3: Ensure configtx.yaml has correct paths
print_status "Verifying configtx.yaml paths..."
docker exec cli bash -c "
    cd /opt/gopath/src/github.com/hyperledger/fabric/peer/configtx
    # Ensure paths are absolute container paths
    sed -i 's|MSPDir: ../organizations|MSPDir: /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations|g' configtx.yaml
    sed -i 's|ClientTLSCert: ../organizations|ClientTLSCert: /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations|g' configtx.yaml
    sed -i 's|ServerTLSCert: ../organizations|ServerTLSCert: /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations|g' configtx.yaml
"

# Step 4: Remove old channel blocks
print_status "Removing old channel blocks..."
rm -f "${HOST_CHANNEL_ARTIFACTS_DIR}"/*.block "${HOST_CHANNEL_ARTIFACTS_DIR}"/*.tx 2>/dev/null || true
docker exec cli rm -f "${CLI_CHANNEL_ARTIFACTS_DIR}"/*.block "${CLI_CHANNEL_ARTIFACTS_DIR}"/*.tx 2>/dev/null || true

# Step 5: Regenerate channel blocks
print_status "Regenerating channel blocks with correct MSP configuration..."

declare -A CHANNEL_PROFILES=(
    ["medical-channel"]="MedicalChannel"
    ["private-data-channel"]="PrivateDataChannel"
    ["insurance-channel"]="InsuranceChannel"
)

for channel_id in "${!CHANNEL_PROFILES[@]}"; do
    profile="${CHANNEL_PROFILES[$channel_id]}"
    print_status "Generating block for ${channel_id}..."
    
    if docker exec cli bash -c "
        export FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/config
        configtxgen -configPath /opt/gopath/src/github.com/hyperledger/fabric/peer/configtx \
            -profile $profile \
            -outputBlock ${CLI_CHANNEL_ARTIFACTS_DIR}/${channel_id}.block \
            -channelID $channel_id
    " 2>&1; then
        print_status "  ✓ Generated ${channel_id}.block"
        
        # Copy block to host
        docker cp "cli:${CLI_CHANNEL_ARTIFACTS_DIR}/${channel_id}.block" "${HOST_CHANNEL_ARTIFACTS_DIR}/" || {
            print_error "  ✗ Failed to copy block to host"
            continue
        }
    else
        print_error "  ✗ Failed to generate block for ${channel_id}"
        continue
    fi
done

print_status "=== Channel Blocks Regenerated ==="
print_status "Next: Join orderers to channels"


