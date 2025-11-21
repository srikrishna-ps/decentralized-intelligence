const { connect, signers } = require('@hyperledger/fabric-gateway');
const grpc = require('@grpc/grpc-js');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const mspId = process.env.FABRIC_ORG || 'HospitalMSP';
// Resolve network path relative to the project root (process.cwd())
const cryptoPath = path.resolve(process.cwd(), process.env.FABRIC_NETWORK_PATH || '../network', 'organizations/peerOrganizations/hospital.medical.com');
const keyDirectoryPath = path.resolve(cryptoPath, 'users/Admin@hospital.medical.com/msp/keystore');
const certPath = path.resolve(cryptoPath, 'users/Admin@hospital.medical.com/msp/signcerts/Admin@hospital.medical.com-cert.pem');
const tlsCertPath = path.resolve(cryptoPath, 'peers/peer0.hospital.medical.com/tls/ca.crt');
const peerEndpoint = process.env.FABRIC_PEER || 'localhost:7051';
const peerHostAlias = 'peer0.hospital.medical.com';

async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity() {
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function newSigner() {
    const files = await fs.readdir(keyDirectoryPath);
    const keyPath = path.resolve(keyDirectoryPath, files[0]);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

let gateway;

async function getGateway() {
    if (gateway) return gateway;

    const client = await newGrpcConnection();
    const identity = await newIdentity();
    const signer = await newSigner();

    gateway = connect({
        client,
        identity,
        signer,
        // Default timeouts for different gRPC calls
        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        },
        discovery: { enabled: false, asLocalhost: true }
    });

    return gateway;
}

async function getContract(channelName, chaincodeName) {
    const gw = await getGateway();
    const network = gw.getNetwork(channelName);
    return network.getContract(chaincodeName);
}

async function closeGateway() {
    if (gateway) {
        gateway.close();
        gateway = null;
    }
}

module.exports = {
    getGateway,
    getContract,
    closeGateway
};
