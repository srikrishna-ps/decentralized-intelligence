const { getContract, closeGateway } = require('../backend-api/src/fabric/gateway');

async function main() {
    try {
        console.log('Connecting to Fabric gateway...');
        const contract = await getContract(process.env.FABRIC_CHANNEL || 'medical-channel', process.env.FABRIC_CHAINCODE || 'encryption');
        console.log('Submitting initLedger transaction...');
        const result = await contract.submitTransaction('initLedger');
        console.log('initLedger result:', new TextDecoder().decode(result));
    } catch (err) {
        console.error('Error initializing ledger:', err);
    } finally {
        await closeGateway();
    }
}

main();
