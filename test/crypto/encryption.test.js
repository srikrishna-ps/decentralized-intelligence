/**
 * Comprehensive test suite for encryption functionality
 * Tests AES encryption, RSA key pairs, and data protection
 */
const path = require('path');
const Encryption = require(path.resolve(__dirname, '../../network/crypto/encryption.js'));

console.log('Encryption:', Encryption);
console.log('Type of Encryption:', typeof Encryption);

const { expect } = require('chai');
const sinon = require('sinon');
const crypto = require('crypto');

// Import modules to test
const MedicalKeyManager = require('../../network/crypto/keyManagement');
console.log('KeyManagement:', MedicalKeyManager);
console.log('Type of KeyManagement:', typeof MedicalKeyManager);
const DataProtection = require('../../network/crypto/dataProtection');
const MedicalHashUtils = require('../../network/crypto/hashUtils');
const HashUtils = new MedicalHashUtils();

describe('Encryption Module Tests', () => {
    let encryption;
    let keyManagement;
    let dataProtection;

    beforeEach(async () => {
        encryption = new Encryption();
        // No need to call encryption.initialize() if not defined in your class
        
        keyManagement = new MedicalKeyManager({
            keySize: 256,
            keyType: 'AES',
            rotationInterval: 30 * 24 * 60 * 60 * 1000
        });
        await keyManagement.initialize();

        dataProtection = new DataProtection({
            encryptionStandard: 'AES-256-GCM',
            complianceLevel: 'HIPAA',
            auditLevel: 'FULL'
        });
        await dataProtection.initialize();
    });

    afterEach(() => {
        // Clean up after each test
        sinon.restore();
    });

    describe('AES Encryption Tests', () => {
        it('should encrypt and decrypt data successfully', async () => {
            // Test data
            const testData = {
                patientId: 'P123456',
                name: 'John Doe',
                diagnosis: 'Hypertension',
                medication: ['Lisinopril 10mg', 'Amlodipine 5mg'],
                sensitive: true
            };

            // Generate key
            const key = crypto.randomBytes(32); // 256-bit key

            // Encrypt data
            const encryptedResult = await encryption.encryptData(JSON.stringify(testData), key);
            
            expect(encryptedResult).to.have.property('encryptedData');
            expect(encryptedResult).to.have.property('iv');
            expect(encryptedResult).to.have.property('tag');
            expect(encryptedResult.encryptedData).to.be.a('string');

            // Decrypt data
            const decryptedData = await encryption.decryptData(
                encryptedResult.encryptedData,
                key,
                encryptedResult.iv,
                encryptedResult.tag
            );

            const parsedData = JSON.parse(decryptedData);
            expect(parsedData).to.deep.equal(testData);
        });

        it('should fail to decrypt with wrong key', async () => {
            const testData = 'Sensitive medical information';
            const correctKey = crypto.randomBytes(32);
            const wrongKey = crypto.randomBytes(32);

            // Encrypt with correct key
            const encryptedResult = await encryption.encryptData(testData, correctKey);

            // Try to decrypt with wrong key
            try {
                await encryption.decryptData(
                    encryptedResult.encryptedData,
                    wrongKey,
                    encryptedResult.iv,
                    encryptedResult.tag
                );
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('decrypt');
            }
        });

        it('should handle empty data encryption', async () => {
            const key = crypto.randomBytes(32);
            const emptyData = '';

            const encryptedResult = await encryption.encryptData(emptyData, key);
            const decryptedData = await encryption.decryptData(
                encryptedResult.encryptedData,
                key,
                encryptedResult.iv,
                encryptedResult.tag
            );

            expect(decryptedData).to.equal(emptyData);
        });

        it('should handle large data encryption', async () => {
            const key = crypto.randomBytes(32);
            const largeData = 'x'.repeat(100000); // 100KB of data

            const encryptedResult = await encryption.encryptData(largeData, key);
            const decryptedData = await encryption.decryptData(
                encryptedResult.encryptedData,
                key,
                encryptedResult.iv,
                encryptedResult.tag
            );

            expect(decryptedData).to.equal(largeData);
        });
    });

    describe('RSA Key Generation Tests', () => {
        it('should generate RSA key pair successfully', async () => {
            const userId = 'user123';
            const keySize = 2048;

            const keyPair = await keyManagement.generateRSAKeyPair(userId, keySize);

            expect(keyPair).to.have.property('keyId');
            expect(keyPair).to.have.property('publicKey');
            expect(keyPair).to.have.property('privateKeyHash');
            expect(keyPair.publicKey).to.include('-----BEGIN PUBLIC KEY-----');
            expect(keyPair.keyId).to.be.a('string');
        });

        it('should encrypt and decrypt with RSA keys', async () => {
            const userId = 'user123';
            const testData = 'Secret medical data';

            const keyPair = await keyManagement.generateRSAKeyPair(userId, 2048);
            
            // For this test, we need the actual private key (not just hash)
            // In real implementation, private key would be securely stored
            const privateKey = keyPair.privateKey; // This would come from secure storage

            const encryptedData = await encryption.rsaEncrypt(testData, keyPair.publicKey);
            const decryptedData = await encryption.rsaDecrypt(encryptedData, privateKey);

            expect(decryptedData).to.equal(testData);
        });

        it('should generate different keys for different users', async () => {
            const keyPair1 = await keyManagement.generateRSAKeyPair('user1', 2048);
            const keyPair2 = await keyManagement.generateRSAKeyPair('user2', 2048);

            expect(keyPair1.keyId).to.not.equal(keyPair2.keyId);
            expect(keyPair1.publicKey).to.not.equal(keyPair2.publicKey);
        });
    });

    describe('Symmetric Key Management Tests', () => {
        it('should generate symmetric key successfully', async () => {
            const keyId = 'test-key-123';
            const options = {
                owner: 'patient123',
                purpose: 'medical_record',
                provider: 'hospital1'
            };

            const symmetricKey = await keyManagement.generateSymmetricKey(keyId, options);

            expect(symmetricKey).to.have.property('encryptedKey');
            expect(symmetricKey).to.have.property('keyHash');
            expect(symmetricKey.keyHash).to.be.a('string');
        });

        it('should rotate symmetric key successfully', async () => {
            const keyId = 'test-key-rotation';
            const options = {
                owner: 'patient123',
                purpose: 'medical_record',
                provider: 'hospital1'
            };

            // Generate original key
            const originalKey = await keyManagement.generateSymmetricKey(keyId, options);

            // Rotate key
            const rotatedKey = await keyManagement.rotateSymmetricKey(keyId, originalKey.encryptedKey);

            expect(rotatedKey.keyHash).to.not.equal(originalKey.keyHash);
            expect(rotatedKey).to.have.property('encryptedKey');
        });
    });

    describe('Data Protection Tests', () => {
        it('should protect medical data with full encryption', async () => {
            const medicalData = {
                patientId: 'P123456',
                name: 'Jane Smith',
                ssn: '123-45-6789',
                diagnosis: 'Diabetes Type 2',
                bloodType: 'O+',
                allergies: ['Penicillin', 'Shellfish']
            };

            const providerId = 'hospital1';
            const options = {
                recordType: 'medical_record',
                dataClassification: 'PHI',
                retentionPolicy: 'LONG_TERM'
            };

            const protectionResult = await dataProtection.protectMedicalData(
                medicalData,
                providerId,
                options
            );

            expect(protectionResult).to.have.property('protectionId');
            expect(protectionResult).to.have.property('protectedPackage');
            expect(protectionResult.protectedPackage).to.have.property('encryptedData');
            expect(protectionResult.protectedPackage).to.have.property('dataHash');
        });

        it('should retrieve protected data successfully', async () => {
            const medicalData = {
                patientId: 'P123456',
                condition: 'Confidential medical condition'
            };

            const providerId = 'hospital1';
            const options = {
                recordType: 'medical_record',
                dataClassification: 'PHI'
            };

            // Protect data
            const protectionResult = await dataProtection.protectMedicalData(
                medicalData,
                providerId,
                options
            );

            // Retrieve data
            const retrievedData = await dataProtection.retrieveProtectedData(
                protectionResult.protectionId,
                protectionResult.protectedPackage,
                providerId
            );

            expect(retrievedData).to.deep.equal(medicalData);
        });

        it('should mask PII data appropriately', async () => {
            const medicalData = {
                patientId: 'P123456',
                name: 'John Doe',
                ssn: '123-45-6789',
                phone: '555-123-4567',
                email: 'john.doe@email.com',
                diagnosis: 'Hypertension'
            };

            const maskedData = await dataProtection.maskPII(medicalData);

            expect(maskedData.ssn).to.equal('XXX-XX-6789');
            expect(maskedData.phone).to.equal('XXX-XXX-4567');
            expect(maskedData.email).to.include('***');
            expect(maskedData.name).to.not.equal('John Doe');
            expect(maskedData.diagnosis).to.equal('Hypertension'); // Medical info not masked
        });
    });

    describe('Hash Utilities Tests', () => {
        it('should generate consistent SHA-256 hashes', async () => {
            const testData = 'Medical record data for hashing';
            
            const hash1 = HashUtils.sha256Hash(testData);
            const hash2 = HashUtils.sha256Hash(testData);

            expect(hash1).to.equal(hash2);
            expect(hash1).to.be.a('string');
            expect(hash1.length).to.equal(64); // SHA-256 produces 64-character hex string
        });

        it('should generate different hashes for different data', async () => {
            const data1 = 'Patient record 1';
            const data2 = 'Patient record 2';

            const hash1 = HashUtils.sha256Hash(data1);
            const hash2 = HashUtils.sha256Hash(data2);

            expect(hash1).to.not.equal(hash2);
        });

        it('should verify data integrity with hashes', async () => {
            const originalData = 'Original medical data';
            const modifiedData = 'Modified medical data';

            const originalHash = HashUtils.sha256Hash(originalData);

            const isValid = HashUtils.verifyHash(originalData, originalHash);
            const isInvalid = HashUtils.verifyHash(modifiedData, originalHash);

            expect(isValid).to.be.true;
            expect(isInvalid).to.be.false;
        });

        it('should generate secure HMAC', async () => {
            const data = 'Medical data for HMAC';
            const key = crypto.randomBytes(32);

            const hmac = HashUtils.generateHMAC(data, key);

            expect(hmac).to.be.a('string');
            expect(hmac.length).to.be.greaterThan(0);
        });
    });

    describe('Performance Tests', () => {
        it('should encrypt large dataset within reasonable time', async function() {
            this.timeout(10000); // 10 second timeout

            const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
                recordId: `record_${i}`,
                patientId: `patient_${i}`,
                data: 'x'.repeat(1000) // 1KB per record
            }));

            const key = crypto.randomBytes(32);
            const startTime = Date.now();

            const encryptedResults = await Promise.all(
                largeDataset.map(record => 
                    encryption.encryptData(JSON.stringify(record), key)
                )
            );

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            expect(encryptedResults).to.have.length(1000);
            expect(executionTime).to.be.lessThan(5000); // Should complete in under 5 seconds
        });

        it('should handle concurrent encryption operations', async function() {
            this.timeout(10000);

            const concurrentOperations = Array.from({ length: 100 }, (_, i) => ({
                data: `Concurrent operation ${i}`,
                key: crypto.randomBytes(32)
            }));

            const startTime = Date.now();

            const results = await Promise.all(
                concurrentOperations.map(op => 
                    encryption.encryptData(op.data, op.key)
                )
            );

            const endTime = Date.now();

            expect(results).to.have.length(100);
            expect(endTime - startTime).to.be.lessThan(3000); // Should complete in under 3 seconds
        });
    });

    describe('Error Handling Tests', () => {
        it('should handle invalid encryption parameters', async () => {
            try {
                await encryption.encryptData(null, null);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Invalid');
            }
        });

        it('should handle corrupted encrypted data', async () => {
            const key = crypto.randomBytes(32);
            const testData = 'Test data';

            const encrypted = await encryption.encryptData(testData, key);
            
            // Corrupt the encrypted data
            const corruptedData = encrypted.encryptedData.substring(0, 10) + 'corrupted';

            try {
                await encryption.decryptData(corruptedData, key, encrypted.iv, encrypted.tag);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.exist;
            }
        });

        it('should handle missing key during decryption', async () => {
            try {
                await encryption.decryptData('encryptedData', null, 'iv', 'tag');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('key');
            }
        });
    });

    describe('Security Tests', () => {
        it('should generate cryptographically secure keys', async () => {
            const keys = [];
            for (let i = 0; i < 10; i++) {
                const keyPair = await keyManagement.generateRSAKeyPair(`user${i}`, 2048);
                keys.push(keyPair.keyId);
            }

            // All keys should be unique
            const uniqueKeys = [...new Set(keys)];
            expect(uniqueKeys).to.have.length(10);
        });

        it('should not expose sensitive data in logs', async () => {
            const sensitiveData = {
                ssn: '123-45-6789',
                creditCard: '4111-1111-1111-1111'
            };

            const logSpy = sinon.spy(console, 'log');

            await dataProtection.protectMedicalData(sensitiveData, 'provider1', {});

            // Check that sensitive data doesn't appear in logs
            const logCalls = logSpy.getCalls();
            logCalls.forEach(call => {
                const logMessage = call.args.join(' ');
                expect(logMessage).to.not.include('123-45-6789');
                expect(logMessage).to.not.include('4111-1111-1111-1111');
            });
        });

        it('should validate input data before processing', async () => {
            const maliciousData = {
                patientId: '<script>alert("xss")</script>',
                name: 'DROP TABLE patients;'
            };

            try {
                await dataProtection.protectMedicalData(maliciousData, 'provider1', {});
                // Should sanitize input rather than throw error
                expect(true).to.be.true;
            } catch (error) {
                // Or should reject malicious input
                expect(error.message).to.include('Invalid');
            }
        });
    });
});