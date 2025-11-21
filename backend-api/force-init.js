// This script uses a workaround: it will invoke the chaincode directly
// Even if not formally "committed", if the chaincode is installed and approved,
// we can sometimes invoke it and it will auto-instantiate

const { getContract, closeGateway } = require('./src/fabric/gateway');

async function forceInitChaincode() {
    try {
        console.log('Attempting to force-initialize chaincode...\n');

        const contract = await getContract('medical-channel', 'encryption');

        // Try to invoke initLedger with a very long timeout
        console.log('Invoking initLedger (this may take 30-60 seconds)...');

        // Set a custom timeout
        const result = await Promise.race([
            contract.submitTransaction('initLedger'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 60s')), 60000))
        ]);

        console.log('✅ SUCCESS! Chaincode initialized!');
        console.log('Result:', new TextDecoder().decode(result));

        // Test a query
        console.log('\nTesting query...');
        const queryResult = await contract.evaluateTransaction('getPatientRecords', 'patient1', 'patient1');
        console.log('Query result:', new TextDecoder().decode(queryResult));

    } catch (error) {
        console.error('Error:', error.message);

        // Even if it fails, try a query to see if something got initialized
        try {
            console.log('\nTrying query anyway...');
            const contract = await getContract('medical-channel', 'encryption');
            const result = await contract.evaluateTransaction('getPatientRecords', 'patient1', 'patient1');
            console.log('✅ Query worked! Result:', new TextDecoder().decode(result));
        } catch (queryError) {
            console.log('Query also failed:', queryError.message);
        }
    } finally {
        await closeGateway();
    }
}

forceInitChaincode();
