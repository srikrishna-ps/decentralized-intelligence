#!/bin/bash

# Exit on any error
set -e

echo "Approving and committing chaincode..."

# Get the package ID
PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep medical_1.0 | awk -F 'ID: ' '{print $2}' | sed 's/, Label:.*//')

echo "Package ID: $PACKAGE_ID"

# Approve chaincode for hospital organization
echo "Approving chaincode for hospital organization..."
docker exec -e CORE_PEER_TLS_ENABLED=false \
    cli peer lifecycle chaincode approveformyorg \
    -o orderer0.orderer.medical.com:7050 \
    --channelID medical-channel \
    --name medical \
    --version 1.0 \
    --package-id $PACKAGE_ID \
    --sequence 1

# Check commit readiness
echo "Checking commit readiness..."
docker exec cli peer lifecycle chaincode checkcommitreadiness \
    --channelID medical-channel \
    --name medical \
    --version 1.0 \
    --sequence 1 \
    --output json

# Commit the chaincode
echo "Committing chaincode..."
docker exec -e CORE_PEER_TLS_ENABLED=false \
    cli peer lifecycle chaincode commit \
    -o orderer0.orderer.medical.com:7050 \
    --channelID medical-channel \
    --name medical \
    --version 1.0 \
    --sequence 1

echo "Chaincode successfully approved and committed!"
