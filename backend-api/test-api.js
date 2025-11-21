const fs = require('fs');
const path = require('path');

async function testApi() {
    const fetch = (await import('node-fetch')).default;

    const baseUrl = 'http://localhost:3000';

    console.log('Testing Health Check...');
    const healthRes = await fetch(`${baseUrl}/health`);
    console.log('Health:', await healthRes.json());

    console.log('\nTesting Grant Consent (EVM)...');
    // Use Account 1 (patient) - this account was granted PATIENT_ROLE
    const privateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // Account 1

    const consentRes = await fetch(`${baseUrl}/api/patient/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            patientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account 1 (patient)
            providerAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Account 2 (doctor)
            category: 1, // LAB_RESULTS
            durationDays: 30,
            purpose: 'Checkup',
            privateKey: privateKey
        })
    });

    console.log('Response status:', consentRes.status);
    const consentData = await consentRes.json();
    console.log('Consent Result:', JSON.stringify(consentData, null, 2));

    if (consentData.success) {
        console.log('\n✅ Consent granted successfully!');
        console.log('Transaction Hash:', consentData.transactionHash);
        console.log('Consent ID:', consentData.consentId);
    } else {
        console.log('\n❌ Consent failed:', consentData.error);
    }
}

testApi().catch(console.error);
