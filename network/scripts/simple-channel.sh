#!/bin/bash

# Simple channel creation for medical-channel

set -e

CHANNEL_NAME="medical-channel"
ORDERER_CA="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem"

echo "Creating channel: $CHANNEL_NAME"

# Set environment for Hospital peer0
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="HospitalMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/users/Admin@hospital.medical.com/msp
export CORE_PEER_ADDRESS=peer0.hospital.medical.com:7051

# Create channel (this will fail if channel exists, which is fine)
peer channel create -o orderer0.orderer.medical.com:7050 -c $CHANNEL_NAME \
    --ordererTLSHostnameOverride orderer0.orderer.medical.com \
    -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.tx \
    --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block \
    --tls --cafile $ORDERER_CA || echo "Channel may already exist or tx file missing"

# If channel creation failed due to missing tx, try fetching the channel
if [ ! -f "/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block" ]; then
    echo "Fetching channel block..."
    peer channel fetch 0 /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block \
        -o orderer0.orderer.medical.com:7050 -c $CHANNEL_NAME \
        --ordererTLSHostnameOverride orderer0.orderer.medical.com \
        --tls --cafile $ORDERER_CA || echo "Could not fetch channel"
fi

# Join Hospital peer0
echo "Joining Hospital peer0 to channel..."
peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block

# Join Hospital peer1
export CORE_PEER_ADDRESS=peer1.hospital.medical.com:8051
echo "Joining Hospital peer1 to channel..."
peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block

echo "Channel setup complete!"
