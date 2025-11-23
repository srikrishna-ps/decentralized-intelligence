#!/bin/bash
# Debug version - show ALL errors

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=HospitalMSP
export CORE_PEER_ADDRESS=peer0.hospital.medical.com:7051
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/users/Admin@hospital.medical.com/msp

ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/tls/ca.crt

echo "=== Approving chaincode ==="
peer lifecycle chaincode approveformyorg \
  -o orderer0.orderer.medical.com:7050 \
  --ordererTLSHostnameOverride orderer0.orderer.medical.com \
  --channelID medical-channel \
  --name encryption \
  --version 1.1 \
  --package-id encryption_1.1:312e339be990c8710c430ed49f \
  --sequence 1 \
  --tls \
  --cafile $ORDERER_CA

if [ $? -eq 0 ]; then
    echo "✅ Approval succeeded!"
else
    echo "❌ Approval failed!"
    exit 1
fi

echo "=== Committing chaincode ==="
peer lifecycle chaincode commit \
  -o orderer0.orderer.medical.com:7050 \
  --ordererTLSHostnameOverride orderer0.orderer.medical.com \
  --channelID medical-channel \
  --name encryption \
  --version 1.1 \
  --sequence 1 \
  --tls \
  --cafile $ORDERER_CA \
  --peerAddresses peer0.hospital.medical.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt

if [ $? -eq 0 ]; then
    echo "✅ Commit succeeded!"
else
    echo "❌ Commit failed!"
    exit 1
fi

echo "=== Verifying ==="
peer lifecycle chaincode querycommitted --channelID medical-channel --name encryption
