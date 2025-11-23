#!/bin/bash

# Smart contract deployment script for medical network
# Deploys encryption chaincode from contracts/encryption/

set -e

# Colors and functions
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

# CLI container paths
CLI_ORG_DIR="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations"
CLI_CONTRACTS_DIR="/opt/gopath/src/github.com/hyperledger/fabric/peer/contracts"

# Host paths
HOST_CONTRACTS_DIR="${PROJECT_ROOT}/contracts"

print_status "Deploying encryption smart contracts..."

# Helper function to run peer commands in CLI container
peer_cli() {
    docker exec \
        -e CORE_PEER_TLS_ENABLED="$CORE_PEER_TLS_ENABLED" \
        -e CORE_PEER_LOCALMSPID="$CORE_PEER_LOCALMSPID" \
        -e CORE_PEER_TLS_ROOTCERT_FILE="$CORE_PEER_TLS_ROOTCERT_FILE" \
        -e CORE_PEER_MSPCONFIGPATH="$CORE_PEER_MSPCONFIGPATH" \
        -e CORE_PEER_ADDRESS="$CORE_PEER_ADDRESS" \
        cli peer "$@"
}

set_peer_env() {
    local org="$1"
    case "$org" in
        "HospitalMSP")
            CORE_PEER_LOCALMSPID="HospitalMSP"
            CORE_PEER_TLS_ROOTCERT_FILE="${CLI_ORG_DIR}/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt"
            CORE_PEER_MSPCONFIGPATH="${CLI_ORG_DIR}/peerOrganizations/hospital.medical.com/users/Admin@hospital.medical.com/msp"
            CORE_PEER_ADDRESS="peer0.hospital.medical.com:7051"
            ;;
        "InsuranceMSP")
            CORE_PEER_LOCALMSPID="InsuranceMSP"
            CORE_PEER_TLS_ROOTCERT_FILE="${CLI_ORG_DIR}/peerOrganizations/insurance.medical.com/peers/peer0.insurance.medical.com/tls/ca.crt"
            CORE_PEER_MSPCONFIGPATH="${CLI_ORG_DIR}/peerOrganizations/insurance.medical.com/users/Admin@insurance.medical.com/msp"
            CORE_PEER_ADDRESS="peer0.insurance.medical.com:8051"
            ;;
        "RegulatoryMSP")
            CORE_PEER_LOCALMSPID="RegulatoryMSP"
            CORE_PEER_TLS_ROOTCERT_FILE="${CLI_ORG_DIR}/peerOrganizations/regulatory.medical.com/peers/peer0.regulatory.medical.com/tls/ca.crt"
            CORE_PEER_MSPCONFIGPATH="${CLI_ORG_DIR}/peerOrganizations/regulatory.medical.com/users/Admin@regulatory.medical.com/msp"
            CORE_PEER_ADDRESS="peer0.regulatory.medical.com:9051"
            ;;
        *)
            print_error "Unknown organization $org"
            return 1
            ;;
    esac
    export CORE_PEER_LOCALMSPID CORE_PEER_TLS_ROOTCERT_FILE CORE_PEER_MSPCONFIGPATH CORE_PEER_ADDRESS
}

export CORE_PEER_TLS_ENABLED=true
ORDERER_CA="${CLI_ORG_DIR}/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/tls/ca.crt"

# Mount contracts directory to CLI container if not already mounted
print_status "Ensuring contracts are accessible in CLI container..."
docker cp "${HOST_CONTRACTS_DIR}/encryption" cli:/opt/gopath/src/github.com/hyperledger/fabric/peer/contracts/ 2>/dev/null || true

# Copy crypto utilities to chaincode directory in CLI
print_status "Copying crypto utilities to chaincode directory..."
docker cp "${NETWORK_DIR}/crypto" cli:/opt/gopath/src/github.com/hyperledger/fabric/peer/contracts/encryption/

# Update require paths in chaincode files to point to local crypto directory
print_status "Updating require paths in chaincode..."
docker exec cli bash -c "cd ${CLI_CONTRACTS_DIR}/encryption && sed -i 's|\.\./network/crypto/|\./crypto/|g' *.js"

# Package chaincode
print_status "Packaging encryption chaincode..."
set_peer_env "HospitalMSP"

# Create package.json for the chaincode if it doesn't exist
docker exec cli bash -c "cd ${CLI_CONTRACTS_DIR}/encryption && cat > package.json << 'EOF'
{
  \"name\": \"encryption-chaincode\",
  \"version\": \"1.0.0\",
  \"description\": \"Encryption and key management chaincode\",
  \"main\": \"index.js\",
  \"scripts\": {
    \"start\": \"fabric-chaincode-node start\"
  },
  \"dependencies\": {
    \"fabric-contract-api\": \"^2.5.0\",
    \"fabric-shim\": \"^2.5.0\"
  }
}
EOF"

# Create index.js to export both contracts
docker exec cli bash -c "cd ${CLI_CONTRACTS_DIR}/encryption && cat > index.js << 'EOF'
'use strict';

const EncryptionContract = require('./EncryptionContract');
const KeyManagementContract = require('./KeyManagementContract');

module.exports.EncryptionContract = EncryptionContract;
module.exports.KeyManagementContract = KeyManagementContract;
module.exports.contracts = [EncryptionContract, KeyManagementContract];
EOF"

# Package the chaincode
docker exec cli peer lifecycle chaincode package encryption.tar.gz \
    --path ${CLI_CONTRACTS_DIR}/encryption \
    --lang node \
    --label encryption_1.0

print_status "Installing chaincode on all peers..."

# Install on all organizations
for org in "HospitalMSP" "InsuranceMSP" "RegulatoryMSP"; do
    print_status "Installing on $org..."
    set_peer_env "$org"
    peer_cli lifecycle chaincode install encryption.tar.gz || {
        print_warning "Failed to install on $org, continuing..."
    }
done

# Get package ID
print_status "Querying installed chaincode..."
set_peer_env "HospitalMSP"
PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled --output json | grep -o 'encryption_1.0:[a-f0-9]*' | head -1)

if [ -z "$PACKAGE_ID" ]; then
    print_error "Failed to get package ID"
    exit 1
fi

print_status "Package ID: $PACKAGE_ID"

# Approve chaincode for each organization
print_status "Approving chaincode for all organizations..."

for org in "HospitalMSP" "InsuranceMSP" "RegulatoryMSP"; do
    print_status "Approving for $org..."
    set_peer_env "$org"
    
    peer_cli lifecycle chaincode approveformyorg \
        -o orderer0.orderer.medical.com:7050 \
        --ordererTLSHostnameOverride orderer0.orderer.medical.com \
        --channelID medical-channel \
        --name encryption \
        --version 1.0 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --tls \
        --cafile "$ORDERER_CA" || {
        print_warning "Failed to approve for $org, continuing..."
    }
done

# Check commit readiness
print_status "Checking commit readiness..."
set_peer_env "HospitalMSP"
peer_cli lifecycle chaincode checkcommitreadiness \
    --channelID medical-channel \
    --name encryption \
    --version 1.0 \
    --sequence 1 \
    --tls \
    --cafile "$ORDERER_CA" \
    --output json

# Commit chaincode definition
print_status "Committing chaincode definition to channel..."
peer_cli lifecycle chaincode commit \
    -o orderer0.orderer.medical.com:7050 \
    --ordererTLSHostnameOverride orderer0.orderer.medical.com \
    --channelID medical-channel \
    --name encryption \
    --version 1.0 \
    --sequence 1 \
    --tls \
    --cafile "$ORDERER_CA" \
    --peerAddresses peer0.hospital.medical.com:7051 \
    --tlsRootCertFiles "${CLI_ORG_DIR}/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt" \
    --peerAddresses peer0.insurance.medical.com:8051 \
    --tlsRootCertFiles "${CLI_ORG_DIR}/peerOrganizations/insurance.medical.com/peers/peer0.insurance.medical.com/tls/ca.crt" \
    --peerAddresses peer0.regulatory.medical.com:9051 \
    --tlsRootCertFiles "${CLI_ORG_DIR}/peerOrganizations/regulatory.medical.com/peers/peer0.regulatory.medical.com/tls/ca.crt"

# Query committed chaincode
print_status "Verifying chaincode deployment..."
peer_cli lifecycle chaincode querycommitted --channelID medical-channel --name encryption

print_status "Testing chaincode invocation..."
peer_cli chaincode invoke \
    -o orderer0.orderer.medical.com:7050 \
    --ordererTLSHostnameOverride orderer0.orderer.medical.com \
    --tls \
    --cafile "$ORDERER_CA" \
    -C medical-channel \
    -n encryption \
    --peerAddresses peer0.hospital.medical.com:7051 \
    --tlsRootCertFiles "${CLI_ORG_DIR}/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt" \
    -c '{"function":"EncryptionContract:InitLedger","Args":[]}' || {
    print_warning "InitLedger may not exist, that's okay"
}

print_status "Encryption chaincode deployment completed successfully!"
print_status "Chaincode 'encryption' is now available on medical-channel"