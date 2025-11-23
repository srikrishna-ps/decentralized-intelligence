#!/bin/bash

# Direct chaincode commit using peer container environment

set -e

CHANNEL_NAME="medical-channel"
CC_NAME="encryption"
CC_VERSION="1.1"
CC_SEQUENCE="1"
PACKAGE_ID="encryption_1.1:312e339be990c8710c430ed49f"

echo "=== Committing chaincode directly from peer container ==="

# Commit from Hospital peer
docker exec peer0.hospital.medical.com bash -c "
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=HospitalMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode commit \
  -o orderer0.orderer.medical.com:7050 \
  --ordererTLSHostnameOverride orderer0.orderer.medical.com \
  --channelID $CHANNEL_NAME \
  --name $CC_NAME \
  --version $CC_VERSION \
  --sequence $CC_SEQUENCE \
  --tls \
  --cafile /etc/hyperledger/fabric/tls/ca.crt \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt
"

echo "Checking if commit succeeded..."
docker exec peer0.hospital.medical.com peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_NAME

echo "Done!"
