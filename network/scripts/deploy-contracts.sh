#!/bin/bash

# Smart contract deployment script for medical network

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

# Contract paths
CONTRACTS_DIR="${PROJECT_ROOT}/contracts"

print_status "Deploying medical smart contracts..."

# Set environment variables
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="HospitalMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${NETWORK_DIR}/organizations/hospital/peers/peer0.hospital.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${NETWORK_DIR}/organizations/hospital/users/Admin@hospital.medical.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Package and install contracts
print_status "Packaging smart contracts..."

# 1. Consent Management Contract
cd ${CONTRACTS_DIR}/medical
peer lifecycle chaincode package consent-management.tar.gz --path . --lang node --label consent-management_1.0

# 2. Access Control Contract  
cd ${CONTRACTS_DIR}/utils
peer lifecycle chaincode package access-control.tar.gz --path . --lang node --label access-control_1.0

# 3. Data Registry Contract
cd ${CONTRACTS_DIR}/medical
peer lifecycle chaincode package data-registry.tar.gz --path . --lang node --label data-registry_1.0

# 4. Token Engine Contract
cd ${CONTRACTS_DIR}/medical
peer lifecycle chaincode package token-engine.tar.gz --path . --lang node --label token-engine_1.0

print_status "Installing contracts on peers..."

# Install on Hospital peers
peer lifecycle chaincode install consent-management.tar.gz
peer lifecycle chaincode install access-control.tar.gz
peer lifecycle chaincode install data-registry.tar.gz
peer lifecycle chaincode install token-engine.tar.gz

# Install on Insurance peers
export CORE_PEER_LOCALMSPID="InsuranceMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${NETWORK_DIR}/organizations/insurance/peers/peer0.insurance.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${NETWORK_DIR}/organizations/insurance/users/Admin@insurance.medical.com/msp
export CORE_PEER_ADDRESS=localhost:8051

peer lifecycle chaincode install consent-management.tar.gz
peer lifecycle chaincode install access-control.tar.gz
peer lifecycle chaincode install data-registry.tar.gz
peer lifecycle chaincode install token-engine.tar.gz

# Install on Regulatory peers
export CORE_PEER_LOCALMSPID="RegulatoryMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${NETWORK_DIR}/organizations/regulatory/peers/peer0.regulatory.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${NETWORK_DIR}/organizations/regulatory/users/Admin@regulatory.medical.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode install consent-management.tar.gz
peer lifecycle chaincode install access-control.tar.gz
peer lifecycle chaincode install data-registry.tar.gz
peer lifecycle chaincode install token-engine.tar.gz

print_status "Approving chaincode definitions..."

# Get package IDs
CONSENT_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label=="consent-management_1.0") | .package_id')
ACCESS_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label=="access-control_1.0") | .package_id')
DATA_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label=="data-registry_1.0") | .package_id')
TOKEN_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label=="token-engine_1.0") | .package_id')

# Approve definitions for each organization
approve_for_org() {
    local org=$1
    local mspid=$2
    local address=$3
    local tls_cert=$4
    local msp_path=$5

    export CORE_PEER_LOCALMSPID=$mspid
    export CORE_PEER_TLS_ROOTCERT_FILE=$tls_cert
    export CORE_PEER_MSPCONFIGPATH=$msp_path
    export CORE_PEER_ADDRESS=$address

    print_status "Approving for $org..."

    # Consent Management
    peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer0.orderer.medical.com --channelID medical-channel --name consent-management --version 1.0 --package-id $CONSENT_PACKAGE_ID --sequence 1 --tls --cafile ${NETWORK_DIR}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem --waitForEvent

    # Access Control
    peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer0.orderer.medical.com --channelID medical-channel --name access-control --version 1.0 --package-id $ACCESS_PACKAGE_ID --sequence 1 --tls --cafile ${NETWORK_DIR}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem --waitForEvent

    # Data Registry
    peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer0.orderer.medical.com --channelID medical-channel --name data-registry --version 1.0 --package-id $DATA_PACKAGE_ID --sequence 1 --tls --cafile ${NETWORK_DIR}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem --waitForEvent

    # Token Engine
    peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer0.orderer.medical.com --channelID medical-channel --name token-engine --version 1.0 --package-id $TOKEN_PACKAGE_ID --sequence 1 --tls --cafile ${NETWORK_DIR}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem --waitForEvent
}

# Approve for all organizations
approve_for_org "Hospital" "HospitalMSP" "localhost:7051" "${NETWORK_DIR}/organizations/hospital/peers/peer0.hospital.medical.com/tls/ca.crt" "${NETWORK_DIR}/organizations/hospital/users/Admin@hospital.medical.com/msp"

approve_for_org "Insurance" "InsuranceMSP" "localhost:8051" "${NETWORK_DIR}/organizations/insurance/peers/peer0.insurance.medical.com/tls/ca.crt" "${NETWORK_DIR}/organizations/insurance/users/Admin@insurance.medical.com/msp"

approve_for_org "Regulatory" "RegulatoryMSP" "localhost:9051" "${NETWORK_DIR}/organizations/regulatory/peers/peer0.regulatory.medical.com/tls/ca.crt" "${NETWORK_DIR}/organizations/regulatory/users/Admin@regulatory.medical.com/msp"

print_status "Committing chaincode definitions..."

# Reset to Hospital org for commits
export CORE_PEER_LOCALMSPID="HospitalMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${NETWORK_DIR}/organizations/hospital/peers/peer0.hospital.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${NETWORK_DIR}/organizations/hospital/users/Admin@hospital.medical.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Commit contracts
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer0.orderer.medical.com --channelID medical-channel --name consent-management --version 1.0 --sequence 1 --tls --cafile ${NETWORK_DIR}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem --peerAddresses localhost:7051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/hospital/peers/peer0.hospital.medical.com/tls/ca.crt --peerAddresses localhost:8051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/insurance/peers/peer0.insurance.medical.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/regulatory/peers/peer0.regulatory.medical.com/tls/ca.crt --waitForEvent

peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer0.orderer.medical.com --channelID medical-channel --name access-control --version 1.0 --sequence 1 --tls --cafile ${NETWORK_DIR}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem --peerAddresses localhost:7051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/hospital/peers/peer0.hospital.medical.com/tls/ca.crt --peerAddresses localhost:8051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/insurance/peers/peer0.insurance.medical.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/regulatory/peers/peer0.regulatory.medical.com/tls/ca.crt --waitForEvent

peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer0.orderer.medical.com --channelID medical-channel --name data-registry --version 1.0 --sequence 1 --tls --cafile ${NETWORK_DIR}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem --peerAddresses localhost:7051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/hospital/peers/peer0.hospital.medical.com/tls/ca.crt --peerAddresses localhost:8051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/insurance/peers/peer0.insurance.medical.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/regulatory/peers/peer0.regulatory.medical.com/tls/ca.crt --waitForEvent

peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer0.orderer.medical.com --channelID medical-channel --name token-engine --version 1.0 --sequence 1 --tls --cafile ${NETWORK_DIR}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem --peerAddresses localhost:7051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/hospital/peers/peer0.hospital.medical.com/tls/ca.crt --peerAddresses localhost:8051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/insurance/peers/peer0.insurance.medical.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/regulatory/peers/peer0.regulatory.medical.com/tls/ca.crt --waitForEvent

print_status "Testing deployed contracts..."

# Test contract invocation
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer0.orderer.medical.com --tls --cafile ${NETWORK_DIR}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem -C medical-channel -n consent-management --peerAddresses localhost:7051 --tlsRootCertFiles ${NETWORK_DIR}/organizations/hospital/peers/peer0.hospital.medical.com/tls/ca.crt -c '{"function":"initLedger","Args":[]}'

print_status "Smart contract deployment completed successfully!"
print_status "All contracts are now available on the medical-channel"