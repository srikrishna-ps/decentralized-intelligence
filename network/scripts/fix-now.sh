#!/bin/bash
# SIMPLE WORKING SOLUTION - Approve and commit with Hospital only

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=HospitalMSP
export CORE_PEER_ADDRESS=peer0.hospital.medical.com:7051
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/users/Admin@hospital.medical.com/msp

ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/tls/ca.crt

echo "Step 1: Approve for Hospital"
peer lifecycle chaincode approveformyorg \
  -o orderer0.orderer.medical.com:7050 \
  --ordererTLSHostnameOverride orderer0.orderer.medical.com \
  --channelID medical-channel \
  --name encryption \
  --version 1.1 \
  --package-id encryption_1.1:312e339be990c8710c430ed49f \
  --sequence 1 \
  --signature-policy "OR('HospitalMSP.member')" \
  --tls \
  --cafile $ORDERER_CA

echo "Step 2: Commit to channel"
peer lifecycle chaincode commit \
  -o orderer0.orderer.medical.com:7050 \
  --ordererTLSHostnameOverride orderer0.orderer.medical.com \
  --channelID medical-channel \
  --name encryption \
  --version 1.1 \
  --sequence 1 \
  --signature-policy "OR('HospitalMSP.member')" \
  --tls \
  --cafile $ORDERER_CA \
  --peerAddresses peer0.hospital.medical.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt

echo "Step 3: Verify"
peer lifecycle chaincode querycommitted --channelID medical-channel --name encryption

echo "Step 4: Initialize ledger"
peer chaincode invoke \
  -o orderer0.orderer.medical.com:7050 \
  --ordererTLSHostnameOverride orderer0.orderer.medical.com \
  --tls \
  --cafile $ORDERER_CA \
  -C medical-channel \
  -n encryption \
  --peerAddresses peer0.hospital.medical.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt \
  -c '{"function":"initLedger","Args":[]}'

echo "✅ DONE!"
