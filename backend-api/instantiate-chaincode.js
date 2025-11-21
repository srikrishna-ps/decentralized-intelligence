const { getContract, closeGateway } = require('./src/fabric/gateway');

async function instantiateViaBackend() {
    try {
        console.log('=== Instantiating Chaincode via Backend API ===\n');

        console.log('Step 1: Connecting to Fabric peer...');
        const contract = await getContract('medical-channel', 'encryption');
        console.log('✅ Connected to peer successfully!\n');

        console.log('Step 2: Invoking initLedger to instantiate chaincode...');
        console.log('(This will take 30-60 seconds as chaincode container starts)\n');

        const result = await contract.submitTransaction('initLedger');
        console.log('✅ Chaincode instantiated and ledger initialized!');
        console.log('Result:', new TextDecoder().decode(result));

        console.log('\nStep 3: Testing query...');
        const queryResult = await contract.evaluateTransaction('getPatientRecords', 'patient1', 'patient1');
        console.log('✅ Query successful!');
        console.log('Records:', new TextDecoder().decode(queryResult));

        console.log('\n🎉 SUCCESS! Chaincode is fully operational via backend API!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.message.includes('DEADLINE_EXCEEDED')) {
            console.log('\n⚠️  Timeout - chaincode container may still be starting.');
            console.log('Wait 30 seconds and try querying again.');
        }
    } finally {
        await closeGateway();
    }
}

instantiateViaBackend();
