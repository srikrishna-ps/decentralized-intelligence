#!/bin/bash
# Fabric 2.2 - Simple chaincode deployment

set -e

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=HospitalMSP
export CORE_PEER_ADDRESS=peer0.hospital.medical.com:7051
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/users/Admin@hospital.medical.com/msp

ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/tls/ca.crt

echo "Step 1: Join peer to channel"
peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/medical-channel.block

echo "Step 2: Install chaincode"
peer chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/encryption_1.1.tar.gz

echo "Step 3: Instantiate chaincode"
peer chaincode instantiate \
  -o orderer0.orderer.medical.com:7050 \
  --tls \
  --cafile $ORDERER_CA \
  -C medical-channel \
  -n encryption \
  -v 1.1 \
  -c '{"Args":["init"]}' \
  -P "OR('HospitalMSP.member')"

echo "Step 4: Invoke initLedger"
sleep 5
peer chaincode invoke \
  -o orderer0.orderer.medical.com:7050 \
  --tls \
  --cafile $ORDERER_CA \
  -C medical-channel \
  -n encryption \
  -c '{"function":"initLedger","Args":[]}'

echo "Step 5: Test query"
peer chaincode query -C medical-channel -n encryption -c '{"Args":["getPatientRecords","patient1","patient1"]}'

echo "✅ ALL DONE!"
