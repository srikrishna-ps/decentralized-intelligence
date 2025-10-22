#!/bin/bash

# Exit on any error
set -e

echo "Deploying chaincode..."

# Copy chaincode to CLI container
docker exec cli mkdir -p /opt/gopath/src/github.com/chaincode/medical/go
docker cp ../chaincode/medical/go/. cli:/opt/gopath/src/github.com/chaincode/medical/go/

# Update Go dependencies
docker exec -w /opt/gopath/src/github.com/chaincode/medical/go cli go mod tidy

# Set environment variables for the CLI container
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.medical.com/users/Admin@hospital.medical.com/msp
export CORE_PEER_ADDRESS=peer0.hospital.medical.com:7051
export CORE_PEER_LOCALMSPID=HospitalMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt

# Package the chaincode
docker exec cli peer lifecycle chaincode package medical.tar.gz --path /opt/gopath/src/github.com/chaincode/medical/go --lang golang --label medical_1.0

# Install chaincode on each organization's peer
echo "Installing chaincode on Hospital peer..."
docker exec cli peer lifecycle chaincode install medical.tar.gz || true

echo "Verifying chaincode installation..."
docker exec cli peer lifecycle chaincode queryinstalled

# Approve for insurance
export CORE_PEER_LOCALMSPID="InsuranceMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/insurance.medical.com/peers/peer0.insurance.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/insurance.medical.com/users/Admin@insurance.medical.com/msp
export CORE_PEER_ADDRESS=peer0.insurance.medical.com:8051

peer lifecycle chaincode approveformyorg -o orderer0.orderer.medical.com:7050 \
  --channelID medical-channel --name medical --version 1.0 --package-id $PACKAGE_ID \
  --sequence 1 --tls --cafile $ORDERER_CA

# Approve for regulatory
export CORE_PEER_LOCALMSPID="RegulatoryMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/regulatory.medical.com/peers/peer0.regulatory.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/regulatory.medical.com/users/Admin@regulatory.medical.com/msp
export CORE_PEER_ADDRESS=peer0.regulatory.medical.com:9051

peer lifecycle chaincode approveformyorg -o orderer0.orderer.medical.com:7050 \
  --channelID medical-channel --name medical --version 1.0 --package-id $PACKAGE_ID \
  --sequence 1 --tls --cafile $ORDERER_CA

# Commit the chaincode
peer lifecycle chaincode commit -o orderer0.orderer.medical.com:7050 --channelID medical-channel \
  --name medical --version 1.0 --sequence 1 --tls --cafile $ORDERER_CA \
  --peerAddresses peer0.hospital.medical.com:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt \
  --peerAddresses peer0.insurance.medical.com:8051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/insurance.medical.com/peers/peer0.insurance.medical.com/tls/ca.crt \
  --peerAddresses peer0.regulatory.medical.com:9051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/regulatory.medical.com/peers/peer0.regulatory.medical.com/tls/ca.crt

echo "Chaincode deployment completed!"
