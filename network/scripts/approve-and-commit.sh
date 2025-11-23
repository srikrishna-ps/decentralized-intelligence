#!/bin/bash

# Approve and commit chaincode for all orgs

set -e

CHANNEL_NAME="medical-channel"
CC_NAME="encryption"
CC_VERSION="1.1"
CC_SEQUENCE="1"
PACKAGE_ID="encryption_1.1:312e339be990c8710c430ed49f"

echo "Approving chaincode for Insurance org..."
docker exec cli bash -c "
export CORE_PEER_LOCALMSPID=InsuranceMSP
export CORE_PEER_ADDRESS=peer0.insurance.medical.com:8051
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurance.medical.com/peers/peer0.insurance.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurance.medical.com/users/Admin@insurance.medical.com/msp
export CORE_PEER_TLS_ENABLED=true

peer lifecycle chaincode approveformyorg \
  -o orderer0.orderer.medical.com:7050 \
  --channelID $CHANNEL_NAME \
  --name $CC_NAME \
  --version $CC_VERSION \
  --package-id $PACKAGE_ID \
  --sequence $CC_SEQUENCE \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/tls/ca.crt
"

echo "Approving chaincode for Regulatory org..."
docker exec cli bash -c "
export CORE_PEER_LOCALMSPID=RegulatoryMSP
export CORE_PEER_ADDRESS=peer0.regulatory.medical.com:9051
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulatory.medical.com/peers/peer0.regulatory.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulatory.medical.com/users/Admin@regulatory.medical.com/msp
export CORE_PEER_TLS_ENABLED=true

peer lifecycle chaincode approveformyorg \
  -o orderer0.orderer.medical.com:7050 \
  --channelID $CHANNEL_NAME \
  --name $CC_NAME \
  --version $CC_VERSION \
  --package-id $PACKAGE_ID \
  --sequence $CC_SEQUENCE \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/tls/ca.crt
"

echo "Checking commit readiness..."
docker exec cli peer lifecycle chaincode checkcommitreadiness \
  --channelID $CHANNEL_NAME \
  --name $CC_NAME \
  --version $CC_VERSION \
  --sequence $CC_SEQUENCE \
  --output json

echo "Committing chaincode to channel..."
docker exec cli bash -c "
export CORE_PEER_LOCALMSPID=HospitalMSP
export CORE_PEER_ADDRESS=peer0.hospital.medical.com:7051
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/users/Admin@hospital.medical.com/msp
export CORE_PEER_TLS_ENABLED=true

peer lifecycle chaincode commit \
  -o orderer0.orderer.medical.com:7050 \
  --channelID $CHANNEL_NAME \
  --name $CC_NAME \
  --version $CC_VERSION \
  --sequence $CC_SEQUENCE \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/tls/ca.crt \
  --peerAddresses peer0.hospital.medical.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt \
  --peerAddresses peer0.insurance.medical.com:8051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurance.medical.com/peers/peer0.insurance.medical.com/tls/ca.crt \
  --peerAddresses peer0.regulatory.medical.com:9051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulatory.medical.com/peers/peer0.regulatory.medical.com/tls/ca.crt
"

echo "Verifying chaincode deployment..."
docker exec cli peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_NAME

echo "Chaincode deployment complete!"
