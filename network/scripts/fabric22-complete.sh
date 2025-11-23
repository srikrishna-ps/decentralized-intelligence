#!/bin/bash
# Fabric 2.2 - Package and deploy chaincode properly

set -e

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=HospitalMSP
export CORE_PEER_ADDRESS=peer0.hospital.medical.com:7051
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/users/Admin@hospital.medical.com/msp

ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/tls/ca.crt

echo "Step 1: Join peer to channel"
peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/medical-channel.block || echo "Already joined"

echo "Step 2: Package chaincode for Fabric 2.2"
cd /opt/gopath/src/github.com/hyperledger/fabric/peer/contracts/encryption
peer chaincode package encryption.tar.gz -n encryption -v 1.1 -p /opt/gopath/src/github.com/hyperledger/fabric/peer/contracts/encryption

echo "Step 3: Install chaincode"
peer chaincode install encryption.tar.gz

echo "Step 4: Instantiate chaincode"
peer chaincode instantiate \
  -o orderer0.orderer.medical.com:7050 \
  --tls \
  --cafile $ORDERER_CA \
  -C medical-channel \
  -n encryption \
  -v 1.1 \
  -c '{"Args":[]}' \
  -P "OR('HospitalMSP.member')"

echo "Step 5: Wait for chaincode container to start"
sleep 10

echo "Step 6: Invoke initLedger"
peer chaincode invoke \
  -o orderer0.orderer.medical.com:7050 \
  --tls \
  --cafile $ORDERER_CA \
  -C medical-channel \
  -n encryption \
  -c '{"function":"initLedger","Args":[]}'

echo "Step 7: Test query"
sleep 3
peer chaincode query -C medical-channel -n encryption -c '{"Args":["getPatientRecords","patient1","patient1"]}'

echo "✅ CHAINCODE DEPLOYED AND WORKING!"
