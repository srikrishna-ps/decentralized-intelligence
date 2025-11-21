const { getContract } = require('./src/fabric/gateway');

async function test() {
    try {
        console.log('Testing chaincode invocation...');
        const contract = await getContract('medical-channel', 'encryption');

        // Try to invoke initLedger
        console.log('Invoking initLedger...');
        const result = await contract.submitTransaction('initLedger');
        console.log('✅ initLedger result:', new TextDecoder().decode(result));
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.details && error.details.length > 0) {
            console.error('Details:', error.details);
        }
    }
}

test();
