#!/bin/bash
/bin/bash
# Helper to convert POSIX paths to Windows style when needed
convert_path() {
    local input_path="$1"
    if command -v cygpath >/dev/null 2>&1; then
        cygpath -m "$input_path"
    elif command -v wslpath >/dev/null 2>&1; then
        local converted
        if converted=$(wslpath -m "$input_path" 2>/dev/null); then
            echo "$converted"
        else
            echo "$input_path"
        fi
    else
        echo "$input_path"
    fi
}
#!/bin/bash

# Medical Network Bootstrap Script
# This script sets up the entire blockchain network

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Set working directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$NETWORK_DIR")"

# Ensure Fabric binaries are available
export PATH="${PROJECT_ROOT}/fabric-binaries/bin:${PATH}"
FABRIC_BIN_DIR="${PROJECT_ROOT}/fabric-binaries/bin"
CRYPTGEN_BIN="${FABRIC_BIN_DIR}/cryptogen"
CONFIGTXGEN_BIN="${FABRIC_BIN_DIR}/configtxgen"

if [ ! -f "$CRYPTGEN_BIN" ] && [ -f "${CRYPTGEN_BIN}.exe" ]; then
    CRYPTGEN_BIN="${CRYPTGEN_BIN}.exe"
fi

if [ ! -f "$CONFIGTXGEN_BIN" ] && [ -f "${CONFIGTXGEN_BIN}.exe" ]; then
    CONFIGTXGEN_BIN="${CONFIGTXGEN_BIN}.exe"
fi

cd "$NETWORK_DIR"
FABRIC_CFG_PATH_VALUE="$NETWORK_DIR/config"
if [[ "$CONFIGTXGEN_BIN" == *.exe ]]; then
    FABRIC_CFG_PATH_VALUE="$(convert_path "$NETWORK_DIR/config")"
fi
export FABRIC_CFG_PATH="$FABRIC_CFG_PATH_VALUE"
CONFIGTX_CFG_DIR="$NETWORK_DIR/configtx"
if [[ "$CONFIGTXGEN_BIN" == *.exe ]]; then
    CONFIGTX_CFG_DIR="$(convert_path "$NETWORK_DIR/configtx")"
fi

print_status "Starting Medical Network Bootstrap Process..."

# Step 1: Clean previous setup
print_status "Cleaning previous network setup..."
./scripts/cleanup.sh

# Step 2: Generate crypto material
print_status "Generating crypto material for all organizations..."
"$CRYPTGEN_BIN" generate --config=./crypto-config.yaml --output="organizations"

print_status "Normalizing MSP config paths..."
find ./organizations -name "config.yaml" -type f -print0 | xargs -0 sed -i 's#\\#/#g'

# Sync CA certificates: ensure root MSP has same CA as orderer-specific MSPs
print_status "Syncing CA certificates..."
for orderer in orderer0 orderer1 orderer2; do
    if [ -f "./organizations/ordererOrganizations/orderer.medical.com/orderers/${orderer}.orderer.medical.com/msp/cacerts/"*.pem ]; then
        cp ./organizations/ordererOrganizations/orderer.medical.com/orderers/${orderer}.orderer.medical.com/msp/cacerts/*.pem \
           ./organizations/ordererOrganizations/orderer.medical.com/msp/cacerts/ 2>/dev/null || true
    fi
done

# Add application org CA certs to orderer MSPs so orderers can validate channel blocks
print_status "Adding application org CA certs to orderer MSPs..."
for orderer in orderer0 orderer1 orderer2; do
    for org in hospital insurance regulatory; do
        if [ -f "./organizations/peerOrganizations/${org}.medical.com/msp/cacerts/"*.pem ]; then
            cp ./organizations/peerOrganizations/${org}.medical.com/msp/cacerts/*.pem \
               ./organizations/ordererOrganizations/orderer.medical.com/orderers/${orderer}.orderer.medical.com/msp/cacerts/ 2>/dev/null || true
        fi
    done
done

# Step 3: Start blockchain network containers (using channel participation API, no system channel)
print_status "Starting blockchain network containers..."
docker-compose -f docker/docker-compose.yaml up -d

# Wait for containers to start
print_status "Waiting for network to initialize..."
sleep 45

# Step 5: Create channels
print_status "Creating medical channels..."
./scripts/create-channels.sh

# Step 6: Deploy smart contracts
print_status "Deploying smart contracts..."
./scripts/deploy-contracts.sh

print_status "Medical Network Bootstrap Complete!"
print_status "Network is ready for medical data management operations."
