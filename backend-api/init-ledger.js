const { getContract, closeGateway } = require('./src/fabric/gateway');

async function init() {
    try {
        console.log('Connecting to gateway...');
        const contract = await getContract('medical-channel', 'encryption');

        console.log('Submitting initLedger transaction...');
        const result = await contract.submitTransaction('initLedger');

        console.log('Result:', new TextDecoder().decode(result));
        console.log('Ledger initialized successfully');
    } catch (error) {
        console.error('Failed to initialize ledger:', error);
    } finally {
        await closeGateway();
    }
}

init();
