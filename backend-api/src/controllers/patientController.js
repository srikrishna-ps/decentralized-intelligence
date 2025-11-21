const crypto = require('crypto');
// Use mock Fabric for now due to orderer networking issues
const { getContract: getFabricContract } = require('../fabric/mock-gateway');
const { getContract: getEvmContract, web3 } = require('../evm/provider');
const { uploadFile, getFile } = require('../ipfs/client');

const FABRIC_CHANNEL = process.env.FABRIC_CHANNEL || 'medical-channel';
const FABRIC_CHAINCODE = process.env.FABRIC_CHAINCODE || 'encryption';

// Helper to handle errors
const handleError = (res, error) => {
    console.error('Error:', error);
    res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error'
    });
};

const patientController = {
    // Upload a new medical record
    async uploadRecord(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            const { patientId, providerId, description } = req.body;

            // 1. Upload file to IPFS
            console.log('Uploading to IPFS...');
            const cid = await uploadFile(req.file.buffer);
            console.log('IPFS CID:', cid);

            // 2. Create metadata for Fabric
            const recordId = crypto.randomUUID();
            const medicalData = {
                cid: cid,
                filename: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                description: description || 'Medical Record',
                timestamp: new Date().toISOString()
            };

            // 3. Store encrypted metadata on Fabric (using mock for now)
            console.log('Storing on Fabric...');
            const contract = await getFabricContract(FABRIC_CHANNEL, FABRIC_CHAINCODE);

            const transaction = await contract.submitTransaction(
                'storeProtectedMedicalData',
                recordId,
                JSON.stringify(medicalData),
                providerId,
                patientId
            );

            const fabricResult = JSON.parse(new TextDecoder().decode(transaction));

            res.json({
                success: true,
                message: 'Medical record uploaded and secured successfully',
                data: {
                    recordId: recordId,
                    ipfsCid: cid,
                    fabricTxId: fabricResult.protectionId,
                    timestamp: fabricResult.timestamp
                }
            });

        } catch (error) {
            handleError(res, error);
        }
    },

    // Get patient's records
    async getRecords(req, res) {
        try {
            const { patientId } = req.params;

            console.log(`Fetching records for patient: ${patientId}`);
            const contract = await getFabricContract(FABRIC_CHANNEL, FABRIC_CHAINCODE);

            const resultBuffer = await contract.evaluateTransaction(
                'getPatientRecords',
                patientId,
                patientId
            );

            const result = JSON.parse(new TextDecoder().decode(resultBuffer));

            res.json(result);

        } catch (error) {
            handleError(res, error);
        }
    },

    // Grant consent to a provider
    async grantConsent(req, res) {
        try {
            const { patientAddress, providerAddress, category, durationDays, purpose, privateKey } = req.body;

            if (!privateKey) {
                return res.status(400).json({ success: false, error: 'Private key required for signing (demo mode)' });
            }

            console.log('Granting consent on EVM...');
            const consentContract = getEvmContract('ConsentManagement');

            // Create account from private key
            const account = web3.eth.accounts.privateKeyToAccount(privateKey);
            web3.eth.accounts.wallet.add(account);

            // Calculate duration in seconds
            const durationSeconds = durationDays * 24 * 60 * 60;

            // Send transaction
            const tx = await consentContract.methods.grantConsent(
                providerAddress,
                category,
                durationSeconds,
                purpose,
                false // allowSubAccess default to false
            ).send({
                from: account.address,
                gas: 500000
            });

            // Extract consent ID from events
            const consentGrantedEvent = tx.events?.ConsentGranted;
            const consentId = consentGrantedEvent?.returnValues?.consentId;

            res.json({
                success: true,
                message: 'Consent granted successfully',
                transactionHash: tx.transactionHash,
                consentId: consentId,
                blockNumber: Number(tx.blockNumber)
            });

        } catch (error) {
            handleError(res, error);
        }
    }
};

module.exports = patientController;
