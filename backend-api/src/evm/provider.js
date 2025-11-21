const { Web3 } = require('web3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const rpcUrl = process.env.EVM_RPC_URL || 'http://127.0.0.1:8545';
const web3 = new Web3(rpcUrl);

const artifactPaths = {
    ConsentManagement: '../../../artifacts/contracts/medical/ConsentManagement.sol/ConsentManagement.json',
    AccessControlContract: '../../../artifacts/contracts/medical/AccessControlContract.sol/AccessControlContract.json',
    TokenEngine: '../../../artifacts/contracts/medical/TokenEngine.sol/TokenEngine.json',
    DataRegistry: '../../../artifacts/contracts/medical/DataRegistry.sol/DataRegistry.json'
};

const contractAddresses = {
    ConsentManagement: process.env.CONSENT_CONTRACT,
    AccessControlContract: process.env.ACCESS_CONTROL_CONTRACT,
    TokenEngine: process.env.TOKEN_ENGINE_CONTRACT,
    DataRegistry: process.env.DATA_REGISTRY_CONTRACT
};

// Cache for contract instances
const contracts = {};

function getContract(contractName) {
    if (contracts[contractName]) {
        return contracts[contractName];
    }

    if (!contractAddresses[contractName]) {
        throw new Error(`Address for contract ${contractName} not found in environment variables`);
    }

    const artifactPath = path.resolve(__dirname, artifactPaths[contractName]);

    try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        const contract = new web3.eth.Contract(artifact.abi, contractAddresses[contractName]);
        contracts[contractName] = contract;
        return contract;
    } catch (error) {
        console.error(`Failed to load contract ${contractName}:`, error);
        throw error;
    }
}

async function getAccount() {
    const accounts = await web3.eth.getAccounts();
    return accounts[0]; // Use the first account as default deployer/admin
}

module.exports = {
    web3,
    getContract,
    getAccount
};
