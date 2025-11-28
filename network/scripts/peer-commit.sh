#!/bin/bash
# Run from INSIDE peer container - direct access to orderer

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=HospitalMSP
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp

ORDERER_CA=/etc/hyperledger/fabric/orderer-tls/ca.crt

echo "Approving..."
peer lifecycle chaincode approveformyorg \
  -o orderer0.orderer.medical.com:7050 \
  --channelID medical-channel \
  --name encryption \
  --version 1.1 \
  --package-id encryption_1.1:312e339be990c8710c430ed49f \
  --sequence 1 \
  --tls \
  --cafile $ORDERER_CA

echo "Committing..."
peer lifecycle chaincode commit \
  -o orderer0.orderer.medical.com:7050 \
  --channelID medical-channel \
  --name encryption \
  --version 1.1 \
  --sequence 1 \
  --tls \
  --cafile $ORDERER_CA \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt

echo "Done!"
