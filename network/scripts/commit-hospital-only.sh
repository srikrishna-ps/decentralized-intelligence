#!/bin/bash

# Ultra-simple chaincode commit - Hospital only

export CORE_PEER_LOCALMSPID=HospitalMSP
export CORE_PEER_ADDRESS=peer0.hospital.medical.com:7051
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/users/Admin@hospital.medical.com/msp
export CORE_PEER_TLS_ENABLED=true

peer lifecycle chaincode commit \
  -o orderer0.orderer.medical.com:7050 \
  --channelID medical-channel \
  --name encryption \
  --version 1.1 \
  --sequence 1 \
  --signature-policy "OR('HospitalMSP.member')" \
  --peerAddresses peer0.hospital.medical.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt
