#!/bin/bash

# Exit on first error
set -e

# Create necessary directories
mkdir -p ../system-genesis-block
mkdir -p ../channel-artifacts

export FABRIC_CFG_PATH=${PWD}/../configtx

# Generate genesis block for the system channel
configtxgen -profile MedicalOrdererGenesis -channelID system-channel -outputBlock ../system-genesis-block/genesis.block

# Generate channel configuration transaction
configtxgen -profile MedicalChannel -outputCreateChannelTx ../channel-artifacts/medical.tx -channelID medical-channel

# Generate anchor peer transactions for each org
configtxgen -profile MedicalChannel -outputAnchorPeersUpdate ../channel-artifacts/HospitalMSPanchors.tx -channelID medical-channel -asOrg HospitalMSP
configtxgen -profile MedicalChannel -outputAnchorPeersUpdate ../channel-artifacts/InsuranceMSPanchors.tx -channelID medical-channel -asOrg InsuranceMSP
configtxgen -profile MedicalChannel -outputAnchorPeersUpdate ../channel-artifacts/RegulatoryMSPanchors.tx -channelID medical-channel -asOrg RegulatoryMSP

echo "Generated channel artifacts successfully"
