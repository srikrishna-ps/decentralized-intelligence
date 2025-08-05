#!/bin/bash

# Channel creation script for medical network

set -e

# Colors and functions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Environment setup
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="HospitalMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/hospital/peers/peer0.hospital.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/hospital/users/Admin@hospital.medical.com/msp
export CORE_PEER_ADDRESS=localhost:7051

print_status "Creating medical data channels..."

# 1. Create main medical channel (all organizations)
print_status "Creating main medical channel..."
configtxgen -profile MedicalChannel -outputCreateChannelTx ./channel-artifacts/medical-channel.tx -channelID medical-channel

# Create the channel
peer channel create -o localhost:7050 -c medical-channel --ordererTLSHostnameOverride orderer0.orderer.medical.com -f ./channel-artifacts/medical-channel.tx --outputBlock ./channel-artifacts/medical-channel.block --tls --cafile ${PWD}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem

# 2. Create private data channel (Hospital + Regulatory)
print_status "Creating private data channel..."
configtxgen -profile PrivateDataChannel -outputCreateChannelTx ./channel-artifacts/private-data-channel.tx -channelID private-data-channel

peer channel create -o localhost:7050 -c private-data-channel --ordererTLSHostnameOverride orderer0.orderer.medical.com -f ./channel-artifacts/private-data-channel.tx --outputBlock ./channel-artifacts/private-data-channel.block --tls --cafile ${PWD}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem

# 3. Create insurance channel (Hospital + Insurance)
print_status "Creating insurance channel..."
configtxgen -profile InsuranceChannel -outputCreateChannelTx ./channel-artifacts/insurance-channel.tx -channelID insurance-channel

peer channel create -o localhost:7050 -c insurance-channel --ordererTLSHostnameOverride orderer0.orderer.medical.com -f ./channel-artifacts/insurance-channel.tx --outputBlock ./channel-artifacts/insurance-channel.block --tls --cafile ${PWD}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem

print_status "Joining peers to channels..."

# Join Hospital peers to all channels
print_status "Joining Hospital peers to channels..."
peer channel join -b ./channel-artifacts/medical-channel.block
peer channel join -b ./channel-artifacts/private-data-channel.block
peer channel join -b ./channel-artifacts/insurance-channel.block

# Switch to Insurance org and join relevant channels
export CORE_PEER_LOCALMSPID="InsuranceMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/insurance/peers/peer0.insurance.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/insurance/users/Admin@insurance.medical.com/msp
export CORE_PEER_ADDRESS=localhost:8051

peer channel join -b ./channel-artifacts/medical-channel.block
peer channel join -b ./channel-artifacts/insurance-channel.block

# Switch to Regulatory org and join relevant channels
export CORE_PEER_LOCALMSPID="RegulatoryMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/regulatory/peers/peer0.regulatory.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/regulatory/users/Admin@regulatory.medical.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer channel join -b ./channel-artifacts/medical-channel.block
peer channel join -b ./channel-artifacts/private-data-channel.block

print_status "Setting anchor peers..."

# Set anchor peers for each organization
export CORE_PEER_LOCALMSPID="HospitalMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/hospital/peers/peer0.hospital.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/hospital/users/Admin@hospital.medical.com/msp
export CORE_PEER_ADDRESS=localhost:7051

configtxgen -profile MedicalChannel -outputAnchorPeersUpdate ./channel-artifacts/HospitalAnchor.tx -channelID medical-channel -asOrg HospitalMSP
peer channel update -o localhost:7050 --ordererTLSHostnameOverride orderer0.orderer.medical.com -c medical-channel -f ./channel-artifacts/HospitalAnchor.tx --tls --cafile ${PWD}/organizations/orderer/orderers/orderer0.orderer.medical.com/msp/tlscacerts/tlsca.orderer.medical.com-cert.pem

print_status "Channel creation and setup completed successfully!"