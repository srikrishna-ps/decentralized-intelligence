#!/bin/bash

# Network verification script
# Checks if channels are created, peers joined, and chaincodes deployed

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

CLI_ROOT="/opt/gopath/src/github.com/hyperledger/fabric/peer"
CLI_ORG_DIR="${CLI_ROOT}/organizations"

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
    export CORE_PEER_LOCALMSPID CORE_PEER_TLS_ROOTCERT_FILE CORE_PEER_MSPCONFIGPATH CORE_PEER_ADDRESS
}

print_status "=== Network Verification Report ==="
echo ""

# Check Docker containers
print_status "Checking Docker containers..."
if docker ps | grep -q "orderer0.orderer.medical.com"; then
    print_status "✓ Orderer containers are running"
else
    print_error "✗ Orderer containers are not running"
fi

if docker ps | grep -q "peer0.hospital.medical.com"; then
    print_status "✓ Peer containers are running"
else
    print_error "✗ Peer containers are not running"
fi

echo ""

# Check channels
print_status "Checking channels..."
CHANNELS=("medical-channel" "insurance-channel" "private-data-channel")

for channel in "${CHANNELS[@]}"; do
    print_status "Checking ${channel}..."
    
    # Check if channel block exists
    if [ -f "network/channel-artifacts/${channel}.block" ]; then
        print_status "  ✓ Channel block exists"
    else
        print_warning "  ✗ Channel block missing"
    fi
    
    # Check if peers joined
    for org in "HospitalMSP" "InsuranceMSP" "RegulatoryMSP"; do
        set_peer_env "$org"
        if docker exec -e CORE_PEER_LOCALMSPID="$CORE_PEER_LOCALMSPID" \
            -e CORE_PEER_TLS_ROOTCERT_FILE="$CORE_PEER_TLS_ROOTCERT_FILE" \
            -e CORE_PEER_MSPCONFIGPATH="$CORE_PEER_MSPCONFIGPATH" \
            -e CORE_PEER_ADDRESS="$CORE_PEER_ADDRESS" \
            cli peer channel list 2>&1 | grep -q "$channel"; then
            print_status "  ✓ ${org} joined ${channel}"
        else
            print_warning "  ✗ ${org} not joined to ${channel}"
        fi
    done
done

echo ""

# Check chaincodes
print_status "Checking installed chaincodes..."
set_peer_env "HospitalMSP"
INSTALLED=$(docker exec -e CORE_PEER_LOCALMSPID="$CORE_PEER_LOCALMSPID" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$CORE_PEER_TLS_ROOTCERT_FILE" \
    -e CORE_PEER_MSPCONFIGPATH="$CORE_PEER_MSPCONFIGPATH" \
    -e CORE_PEER_ADDRESS="$CORE_PEER_ADDRESS" \
    cli peer lifecycle chaincode queryinstalled 2>&1)

if echo "$INSTALLED" | grep -q "Installed chaincodes on peer:" && [ -z "$(echo "$INSTALLED" | grep -v "Installed chaincodes on peer:")" ]; then
    print_warning "  ✗ No chaincodes installed"
else
    print_status "  ✓ Chaincodes installed:"
    echo "$INSTALLED" | grep -v "Installed chaincodes on peer:" || true
fi

echo ""

# Check committed chaincodes
print_status "Checking committed chaincodes on medical-channel..."
set_peer_env "HospitalMSP"
COMMITTED=$(docker exec -e CORE_PEER_LOCALMSPID="$CORE_PEER_LOCALMSPID" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$CORE_PEER_TLS_ROOTCERT_FILE" \
    -e CORE_PEER_MSPCONFIGPATH="$CORE_PEER_MSPCONFIGPATH" \
    -e CORE_PEER_ADDRESS="$CORE_PEER_ADDRESS" \
    cli peer lifecycle chaincode querycommitted -C medical-channel 2>&1)

if echo "$COMMITTED" | grep -q "channel 'medical-channel' not found"; then
    print_warning "  ✗ medical-channel not found (peers may not have joined)"
elif echo "$COMMITTED" | grep -q "Committed chaincode definitions on channel"; then
    print_status "  ✓ Committed chaincodes:"
    echo "$COMMITTED" | tail -n +2 || true
else
    print_warning "  ✗ No chaincodes committed to medical-channel"
fi

echo ""
print_status "=== Verification Complete ==="


