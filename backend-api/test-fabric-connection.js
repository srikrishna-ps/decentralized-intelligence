const { getContract } = require('./src/fabric/gateway');

async function test() {
    try {
        console.log('Testing Fabric connection...');
        const contract = await getContract('medical-channel', 'encryption');
        console.log('✅ Successfully connected to Fabric!');
        console.log('Contract:', contract.chaincodeName);

        // Try to query the chaincode
        console.log('\nTrying to query chaincode...');
        const result = await contract.evaluateTransaction('getPatientRecords', 'patient1', 'patient1');
        console.log('Query result:', new TextDecoder().decode(result));
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    }
}

test();
