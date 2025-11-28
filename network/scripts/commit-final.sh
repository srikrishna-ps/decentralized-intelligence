#!/bin/bash

# Final working chaincode commit script with proper TLS configuration

set -e

CHANNEL_NAME="medical-channel"
CC_NAME="encryption"
CC_VERSION="1.1"
CC_SEQUENCE="1"
PACKAGE_ID="encryption_1.1:312e339be990c8710c430ed49f"

CLI_ORG_DIR="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations"
ORDERER_CA="${CLI_ORG_DIR}/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/tls/ca.crt"

echo "=== Committing chaincode with proper TLS configuration ==="

# Set Hospital peer environment
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="HospitalMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${CLI_ORG_DIR}/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${CLI_ORG_DIR}/peerOrganizations/hospital.medical.com/users/Admin@hospital.medical.com/msp"
export CORE_PEER_ADDRESS="peer0.hospital.medical.com:7051"

echo "Committing chaincode to channel..."
peer lifecycle chaincode commit \
    -o orderer0.orderer.medical.com:7050 \
    --ordererTLSHostnameOverride orderer0.orderer.medical.com \
    --channelID $CHANNEL_NAME \
    --name $CC_NAME \
    --version $CC_VERSION \
    --sequence $CC_SEQUENCE \
    --tls \
    --cafile "$ORDERER_CA" \
    --peerAddresses peer0.hospital.medical.com:7051 \
    --tlsRootCertFiles "${CLI_ORG_DIR}/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt"

echo "Verifying commit..."
peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_NAME

echo "✅ Chaincode committed successfully!"
