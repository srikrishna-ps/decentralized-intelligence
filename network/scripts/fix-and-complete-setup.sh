#!/bin/bash

# Script to fix MSP configuration and complete network setup

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
CLI_ROOT="/opt/gopath/src/github.com/hyperledger/fabric/peer"
CLI_ORG_DIR="${CLI_ROOT}/organizations"

print_status "Fixing MSP configuration and completing network setup..."

# Step 1: Add orderer CA certs to peer MSPs
print_status "Adding orderer CA certificates to peer MSPs..."

for org in hospital insurance regulatory; do
    for peer in peer0 peer1; do
        PEER_MSP_DIR="${NETWORK_DIR}/organizations/peerOrganizations/${org}.medical.com/peers/${peer}.${org}.medical.com/msp/cacerts"
        ORDERER_CA="${NETWORK_DIR}/organizations/ordererOrganizations/orderer.medical.com/msp/cacerts/ca.orderer.medical.com-cert.pem"
        
        if [ -f "$ORDERER_CA" ] && [ -d "$PEER_MSP_DIR" ]; then
            cp "$ORDERER_CA" "$PEER_MSP_DIR/" 2>/dev/null || true
            print_status "  ✓ Added orderer CA to ${peer}.${org}.medical.com"
        fi
    done
    
    # Also add to org-level MSP
    ORG_MSP_DIR="${NETWORK_DIR}/organizations/peerOrganizations/${org}.medical.com/msp/cacerts"
    if [ -f "$ORDERER_CA" ] && [ -d "$ORG_MSP_DIR" ]; then
        cp "$ORDERER_CA" "$ORG_MSP_DIR/" 2>/dev/null || true
    fi
done

# Step 2: Copy updated MSPs to CLI container
print_status "Updating MSPs in CLI container..."
docker cp "${NETWORK_DIR}/organizations" cli:"${CLI_ROOT}/" || {
    print_error "Failed to copy organizations to CLI container"
    exit 1
}

# Step 3: Join peers to channels
print_status "Joining peers to channels..."

set_peer_env() {
    local org=$1
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
    esac
    export CORE_PEER_LOCALMSPID CORE_PEER_TLS_ROOTCERT_FILE CORE_PEER_MSPCONFIGPATH CORE_PEER_ADDRESS CORE_PEER_TLS_ENABLED=true
}

CHANNELS=("medical-channel" "insurance-channel" "private-data-channel")
declare -A CHANNEL_ORGS=(
    ["medical-channel"]="HospitalMSP InsuranceMSP RegulatoryMSP"
    ["private-data-channel"]="HospitalMSP RegulatoryMSP"
    ["insurance-channel"]="HospitalMSP InsuranceMSP"
)

for channel in "${CHANNELS[@]}"; do
    print_status "Joining peers to ${channel}..."
    for org in ${CHANNEL_ORGS[$channel]}; do
        set_peer_env "$org"
        print_status "  Joining ${org} to ${channel}..."
        
        if docker exec \
            -e CORE_PEER_LOCALMSPID="$CORE_PEER_LOCALMSPID" \
            -e CORE_PEER_TLS_ROOTCERT_FILE="$CORE_PEER_TLS_ROOTCERT_FILE" \
            -e CORE_PEER_MSPCONFIGPATH="$CORE_PEER_MSPCONFIGPATH" \
            -e CORE_PEER_ADDRESS="$CORE_PEER_ADDRESS" \
            -e CORE_PEER_TLS_ENABLED=true \
            cli peer channel join -b "${CLI_ROOT}/channel-artifacts/${channel}.block" 2>&1 | grep -q "Successfully submitted proposal"; then
            print_status "    ✓ ${org} joined ${channel}"
        else
            # Check if already joined
            if docker exec \
                -e CORE_PEER_LOCALMSPID="$CORE_PEER_LOCALMSPID" \
                -e CORE_PEER_TLS_ROOTCERT_FILE="$CORE_PEER_TLS_ROOTCERT_FILE" \
                -e CORE_PEER_MSPCONFIGPATH="$CORE_PEER_MSPCONFIGPATH" \
                -e CORE_PEER_ADDRESS="$CORE_PEER_ADDRESS" \
                -e CORE_PEER_TLS_ENABLED=true \
                cli peer channel list 2>&1 | grep -q "$channel"; then
                print_status "    ✓ ${org} already in ${channel}"
            else
                print_warning "    ✗ Failed to join ${org} to ${channel}"
            fi
        fi
    done
done

print_status "Setup completion finished!"
print_status "Run 'bash network/scripts/verify-network.sh' to verify the network status"


