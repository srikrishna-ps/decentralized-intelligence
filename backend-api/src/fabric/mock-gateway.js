// MongoDB-backed Fabric gateway - Data persists across restarts and syncs everywhere!
const { MedicalRecord } = require('../models');

class PersistentFabricGateway {
    async getContract(channelName, chaincodeName) {
        return new PersistentContract();
    }

    close() {
        // No-op
    }
}

class PersistentContract {
    async submitTransaction(functionName, ...args) {
        console.log(`[FABRIC] Invoking: ${functionName}(${args.join(', ')})`);

        switch (functionName) {
            case 'initLedger':
                return Buffer.from(JSON.stringify({
                    success: true,
                    message: 'Ledger initialized (MongoDB-backed)'
                }));

            case 'storeProtectedMedicalData':
                const [recordId, medicalDataJson, providerId, patientId] = args;

                // Store in MongoDB - persists forever!
                const record = await MedicalRecord.create({
                    recordId,
                    medicalData: JSON.parse(medicalDataJson),
                    providerId,
                    patientId,
                    protectionId: `prot-${Date.now()}`,
                    timestamp: new Date()
                });

                console.log(`[FABRIC] ✅ Stored record in MongoDB: ${recordId}`);

                return Buffer.from(JSON.stringify({
                    recordId: record.recordId,
                    protectionId: record.protectionId,
                    timestamp: record.timestamp
                }));

            default:
                throw new Error(`Unknown function: ${functionName}`);
        }
    }

    async evaluateTransaction(functionName, ...args) {
        console.log(`[FABRIC] Querying: ${functionName}(${args.join(', ')})`);

        switch (functionName) {
            case 'getPatientRecords':
                const [patientId] = args;

                // Query from MongoDB - works from any system!
                const records = await MedicalRecord.find({ patientId }).lean();

                console.log(`[FABRIC] ✅ Found ${records.length} records for patient ${patientId}`);

                return Buffer.from(JSON.stringify({ records }));

            default:
                return Buffer.from(JSON.stringify({ records: [] }));
        }
    }
}

// Export persistent gateway
async function getPersistentGateway() {
    return new PersistentFabricGateway();
}

async function getPersistentContract(channelName, chaincodeName) {
    const gateway = await getPersistentGateway();
    return gateway.getContract(channelName, chaincodeName);
}

async function closePersistentGateway() {
    // No-op
}

module.exports = {
    getGateway: getPersistentGateway,
    getContract: getPersistentContract,
    closeGateway: closePersistentGateway
};
