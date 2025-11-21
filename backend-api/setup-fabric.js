const { getContract, closeGateway } = require('./src/fabric/gateway');

async function setupFabric() {
    try {
        console.log('=== Fabric Setup and Test ===\n');

        console.log('Step 1: Connecting to Fabric gateway...');
        const contract = await getContract('medical-channel', 'encryption');
        console.log('✅ Connected successfully!');
        console.log('   Channel: medical-channel');
        console.log('   Chaincode: encryption\n');

        console.log('Step 2: Testing chaincode with a simple query...');
        try {
            // Try a simple query that should work even if ledger is empty
            const result = await contract.evaluateTransaction('getPatientRecords', 'test-patient', 'test-patient');
            console.log('✅ Chaincode is responding!');
            console.log('   Result:', new TextDecoder().decode(result));
        } catch (queryError) {
            if (queryError.message.includes('DEADLINE_EXCEEDED')) {
                console.log('⚠️  Chaincode query timed out - chaincode may not be fully initialized');
                console.log('   This usually means chaincode is installed but not committed or running');
            } else if (queryError.message.includes('not found')) {
                console.log('⚠️  Chaincode not found on channel');
            } else {
                console.log('⚠️  Query error:', queryError.message);
            }
        }

        console.log('\nStep 3: Attempting to initialize ledger...');
        try {
            const initResult = await contract.submitTransaction('initLedger');
            console.log('✅ Ledger initialized successfully!');
            console.log('   Result:', new TextDecoder().decode(initResult));
        } catch (initError) {
            if (initError.message.includes('DEADLINE_EXCEEDED')) {
                console.log('⚠️  Init transaction timed out');
                console.log('   Chaincode container may not be running');
            } else if (initError.message.includes('already exists')) {
                console.log('✅ Ledger already initialized');
            } else {
                console.log('⚠️  Init error:', initError.message);
            }
        }

        console.log('\nStep 4: Testing record storage...');
        try {
            const testData = {
                cid: 'QmTest123',
                filename: 'test-record.pdf',
                mimetype: 'application/pdf',
                size: 1024,
                description: 'Test medical record',
                timestamp: new Date().toISOString()
            };

            const storeResult = await contract.submitTransaction(
                'storeProtectedMedicalData',
                'test-record-1',
                JSON.stringify(testData),
                'provider-1',
                'patient-1'
            );
            console.log('✅ Record stored successfully!');
            console.log('   Result:', new TextDecoder().decode(storeResult));
        } catch (storeError) {
            console.log('⚠️  Store error:', storeError.message);
        }

        console.log('\n=== Summary ===');
        console.log('Fabric gateway connection: ✅ Working');
        console.log('Chaincode accessibility: Check logs above');
        console.log('\nIf chaincode is timing out, it needs to be committed on the channel.');

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error('Full error:', error);
    } finally {
        await closeGateway();
    }
}

setupFabric();
