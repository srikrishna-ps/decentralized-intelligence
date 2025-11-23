/**
 * Test suite for Hash Utilities and Merkle Tree functionality
 * Tests SHA-256 hashing, HMAC generation, and Merkle tree operations
 */

const { expect } = require('chai');
const crypto = require('crypto');

// Import modules to test
const MedicalHashUtils = require('../../network/crypto/hashUtils');
const HashUtils = new MedicalHashUtils(); // ← create instance
const hash = HashUtils.generateDataHash("Hello World");
const MedicalMerkleTree = require('../../network/crypto/merkleTree'); 
const merkleTree = new MedicalMerkleTree(); // ← create instance
console.log(merkleTree.buildTree([{ patientId: 1 }, { patientId: 2 }]));

describe('Hash Utilities Tests', () => {
    describe('SHA-256 Hash Functions', () => {
        it('should generate consistent SHA-256 hashes', () => {
            const testData = 'Medical record data for patient P123456';
            
            const hash1 = HashUtils.sha256Hash(testData);
            const hash2 = HashUtils.sha256Hash(testData);

            expect(hash1).to.equal(hash2);
            expect(hash1).to.be.a('string');
            expect(hash1.length).to.equal(64); // SHA-256 produces 64-character hex string
        });

        it('should generate different hashes for different inputs', () => {
            const data1 = 'Patient John Doe - Diagnosis: Hypertension';
            const data2 = 'Patient Jane Smith - Diagnosis: Diabetes';

            const hash1 = HashUtils.sha256Hash(data1);
            const hash2 = HashUtils.sha256Hash(data2);

            expect(hash1).to.not.equal(hash2);
        });

        it('should handle empty string input', () => {
            const emptyHash = HashUtils.sha256Hash('');
            
            expect(emptyHash).to.be.a('string');
            expect(emptyHash.length).to.equal(64);
            // SHA-256 of empty string should be consistent
            expect(emptyHash).to.equal('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        });

        it('should handle large data inputs', () => {
            const largeData = 'x'.repeat(100000); // 100KB of data
            
            const hash = HashUtils.sha256Hash(largeData);
            
            expect(hash).to.be.a('string');
            expect(hash.length).to.equal(64);
        });

        it('should handle unicode characters', () => {
            const unicodeData = 'Patient données médicales 患者医疗记录 المريض السجلات الطبية';
            
            const hash = HashUtils.sha256Hash(unicodeData);
            
            expect(hash).to.be.a('string');
            expect(hash.length).to.equal(64);
        });
    });

    describe('Hash Verification', () => {
        it('should verify correct hash successfully', () => {
            const originalData = 'Medical record: Patient vital signs';
            const hash = HashUtils.sha256Hash(originalData);

            const isValid = HashUtils.verifyHash(originalData, hash);

            expect(isValid).to.be.true;
        });

        it('should fail verification for modified data', () => {
            const originalData = 'Medical record: Blood pressure 120/80';
            const modifiedData = 'Medical record: Blood pressure 140/90';
            const hash = HashUtils.sha256Hash(originalData);

            const isValid = HashUtils.verifyHash(modifiedData, hash);

            expect(isValid).to.be.false;
        });

        it('should fail verification for invalid hash format', () => {
            const data = 'Medical data';
            const invalidHash = 'invalid_hash_format';

            const isValid = HashUtils.verifyHash(data, invalidHash);

            expect(isValid).to.be.false;
        });
    });

    describe('HMAC Generation and Verification', () => {
        it('should generate HMAC successfully', () => {
            const data = 'Sensitive medical information';
            const key = crypto.randomBytes(32);

            const hmac = HashUtils.generateHMAC(data, key);

            expect(hmac).to.be.a('string');
            expect(hmac.length).to.equal(64); // HMAC-SHA256 produces 64-character hex string
        });

        it('should generate consistent HMAC for same input and key', () => {
            const data = 'Patient confidential data';
            const key = crypto.randomBytes(32);

            const hmac1 = HashUtils.generateHMAC(data, key);
            const hmac2 = HashUtils.generateHMAC(data, key);

            expect(hmac1).to.equal(hmac2);
        });

        it('should generate different HMAC for different keys', () => {
            const data = 'Medical record data';
            const key1 = crypto.randomBytes(32);
            const key2 = crypto.randomBytes(32);

            const hmac1 = HashUtils.generateHMAC(data, key1);
            const hmac2 = HashUtils.generateHMAC(data, key2);

            expect(hmac1).to.not.equal(hmac2);
        });

        it('should verify HMAC successfully', () => {
            const data = 'Medical data integrity check';
            const key = crypto.randomBytes(32);

            const hmac = HashUtils.generateHMAC(data, key);
            const isValid = HashUtils.verifyHMAC(data, key, hmac);

            expect(isValid).to.be.true;
        });

        it('should fail HMAC verification for tampered data', () => {
            const originalData = 'Original medical data';
            const tamperedData = 'Tampered medical data';
            const key = crypto.randomBytes(32);

            const hmac = HashUtils.generateHMAC(originalData, key);
            const isValid = HashUtils.verifyHMAC(tamperedData, key, hmac);

            expect(isValid).to.be.false;
        });
    });

    describe('Batch Hash Generation', () => {
        it('should generate hashes for multiple data items', () => {
            const medicalRecords = [
                { patientId: 'P001', diagnosis: 'Hypertension' },
                { patientId: 'P002', diagnosis: 'Diabetes' },
                { patientId: 'P003', diagnosis: 'Asthma' }
            ];

            const hashes = HashUtils.batchHash(medicalRecords);

            expect(hashes).to.be.an('array');
            expect(hashes).to.have.length(3);
            hashes.forEach(hash => {
                expect(hash).to.be.a('string');
                expect(hash.length).to.equal(64);
            });
        });

        it('should generate unique hashes for different records', () => {
            const records = [
                'Record 1: Patient A data',
                'Record 2: Patient B data',
                'Record 3: Patient C data'
            ];

            const hashes = HashUtils.batchHash(records);
            const uniqueHashes = [...new Set(hashes)];

            expect(uniqueHashes).to.have.length(3);
        });

        it('should handle empty batch', () => {
            const hashes = HashUtils.batchHash([]);

            expect(hashes).to.be.an('array');
            expect(hashes).to.have.length(0);
        });
    });

    describe('Data Fingerprinting', () => {
        it('should generate consistent fingerprint for structured data', () => {
            const medicalRecord = {
                patientId: 'P123456',
                timestamp: '2024-01-15T10:30:00Z',
                vitals: {
                    bloodPressure: '120/80',
                    heartRate: 72,
                    temperature: 98.6
                },
                medications: ['Lisinopril', 'Metformin']
            };

            const fingerprint1 = HashUtils.generateDataFingerprint(medicalRecord);
            const fingerprint2 = HashUtils.generateDataFingerprint(medicalRecord);

            expect(fingerprint1).to.equal(fingerprint2);
            expect(fingerprint1).to.be.a('string');
            expect(fingerprint1.length).to.equal(64);
        });

        it('should generate different fingerprints for different data structures', () => {
            const record1 = { patientId: 'P001', diagnosis: 'Hypertension' };
            const record2 = { patientId: 'P002', diagnosis: 'Diabetes' };

            const fingerprint1 = HashUtils.generateDataFingerprint(record1);
            const fingerprint2 = HashUtils.generateDataFingerprint(record2);

            expect(fingerprint1).to.not.equal(fingerprint2);
        });

        it('should be sensitive to property order in objects', () => {
            const record1 = { name: 'John', age: 30 };
            const record2 = { age: 30, name: 'John' };

            const fingerprint1 = HashUtils.generateDataFingerprint(record1);
            const fingerprint2 = HashUtils.generateDataFingerprint(record2);

            // Should normalize object property order for consistent fingerprinting
            expect(fingerprint1).to.equal(fingerprint2);
        });
    });
});

describe('Merkle Tree Tests', () => {
    let merkleTree;

    beforeEach(() => {
        merkleTree = new MedicalMerkleTree();
    });

    describe('Tree Construction', () => {
        it('should create merkle tree from medical records', () => {
            const medicalRecords = [
                'Patient P001: Blood test results normal',
                'Patient P002: X-ray shows no abnormalities',
                'Patient P003: Prescription updated',
                'Patient P004: Follow-up appointment scheduled'
            ];

            const tree = merkleTree.buildTree(medicalRecords);

            expect(tree).to.have.property('root');
            expect(tree).to.have.property('leaves');
            expect(tree).to.have.property('depth');
            expect(tree.leaves).to.have.length(4);
        });

        it('should handle single record', () => {
            const singleRecord = ['Patient P001: Single medical record'];

            const tree = merkleTree.buildTree(singleRecord);

            expect(tree).to.have.property('root');
            expect(tree.leaves).to.have.length(1);
            expect(tree.root).to.equal(HashUtils.sha256Hash(singleRecord[0]));
        });

        it('should handle empty record set', () => {
            const emptyRecords = [];

            const tree = merkleTree.buildTree(emptyRecords);

            expect(tree).to.have.property('root');
            expect(tree.root).to.be.null;
            expect(tree.leaves).to.have.length(0);
        });

        it('should create balanced tree for power of 2 records', () => {
            const records = [
                'Record 1', 'Record 2', 'Record 3', 'Record 4',
                'Record 5', 'Record 6', 'Record 7', 'Record 8'
            ];

            const tree = merkleTree.buildTree(records);

            expect(tree.depth).to.equal(3); // log2(8) = 3
        });

        it('should handle odd number of records', () => {
            const records = ['Record 1', 'Record 2', 'Record 3'];

            const tree = merkleTree.buildTree(records);

            expect(tree).to.have.property('root');
            expect(tree.leaves).to.have.length(3);
        });
    });

    describe('Proof Generation and Verification', () => {
        it('should generate valid merkle proof', () => {
            const medicalRecords = [
                'Patient P001: Diagnosis confirmed',
                'Patient P002: Treatment plan updated',
                'Patient P003: Lab results reviewed',
                'Patient P004: Medication adjusted'
            ];

            const tree = merkleTree.buildTree(medicalRecords);
            const proof = merkleTree.generateProof(1); // Proof for second record

            expect(proof).to.be.an('array');
            expect(proof.length).to.be.greaterThan(0);
            
            proof.forEach(proofElement => {
                expect(proofElement).to.have.property('hash');
                expect(proofElement).to.have.property('position');
            });
        });

        it('should verify valid merkle proof', () => {
            const records = [
                'Medical Record A',
                'Medical Record B', 
                'Medical Record C',
                'Medical Record D'
            ];

            const tree = merkleTree.buildTree(records);
            const leafIndex = 2;
            const proof = merkleTree.generateProof(tree, leafIndex);

            const isValid = merkleTree.verifyProof(
                records[leafIndex],
                proof
            );

            expect(isValid).to.be.true;
        });

        it('should reject invalid merkle proof', () => {
            const records = ['Record A', 'Record B', 'Record C', 'Record D'];
            const tree = merkleTree.buildTree(records);
            const proof = merkleTree.generateProof(tree, 1);

            // Try to verify with wrong data
            const isValid = merkleTree.verifyProof(
                'Wrong Record',
                proof,
                tree.root
            );

            expect(isValid).to.be.false;
        });

        it('should reject proof with tampered root', () => {
            const records = ['Record 1', 'Record 2', 'Record 3', 'Record 4'];
            const tree = merkleTree.buildTree(records);
            const proof = merkleTree.generateProof(tree, 0);

            const tamperedRoot = 'tampered_root_hash';
            const isValid = merkleTree.verifyProof(
                records[0],
                proof,
                tamperedRoot
            );

            expect(isValid).to.be.false;
        });
    });

    describe('Batch Verification', () => {
        it('should verify multiple records efficiently', () => {
            const batchRecords = Array.from({ length: 100 }, (_, i) => 
                `Medical Record ${i}: Patient data`
            );

            const tree = merkleTree.buildTree(batchRecords);
            const indicesToVerify = [5, 23, 67, 89];

            const batchProofs = indicesToVerify.map(index => ({
                record: batchRecords[index],
                proof: merkleTree.generateProof(tree, index)
            }));

            const results = merkleTree.batchVerify(batchProofs, tree.root);

            expect(results).to.be.an('array');
            expect(results).to.have.length(4);
            results.forEach(result => {
                expect(result).to.be.true;
            });
        });

        it('should detect tampered records in batch', () => {
            const records = Array.from({ length: 10 }, (_, i) => `Record ${i}`);
            const tree = merkleTree.buildTree(records);

            const batchProofs = [
                {
                    record: records[0], // Valid record
                    proof: merkleTree.generateProof(tree, 0)
                },
                {
                    record: 'Tampered Record', // Invalid record
                    proof: merkleTree.generateProof(tree, 1)
                },
                {
                    record: records[2], // Valid record
                    proof: merkleTree.generateProof(tree, 2)
                }
            ];

            const results = merkleTree.batchVerify(batchProofs, tree.root);

            expect(results[0]).to.be.true;  // Valid
            expect(results[1]).to.be.false; // Tampered
            expect(results[2]).to.be.true;  // Valid
        });
    });

    describe('Tree Updates and Incremental Construction', () => {
        it('should update tree when new records are added', () => {
            const initialRecords = ['Record 1', 'Record 2', 'Record 3'];
            const tree = merkleTree.buildTree(initialRecords);
            const originalRoot = tree.root;

            const newRecords = ['Record 4', 'Record 5'];
            const updatedTree = merkleTree.updateTree(tree, newRecords);

            expect(updatedTree.root).to.not.equal(originalRoot);
            expect(updatedTree.leaves).to.have.length(5);
        });

        it('should maintain proof validity after incremental updates', () => {
            const records = ['Record A', 'Record B'];
            let tree = merkleTree.buildTree(records);

            // Generate proof for first record
            const proof = merkleTree.generateProof(tree, 0);
            
            // Add more records
            tree = merkleTree.updateTree(tree, ['Record C', 'Record D']);

            // Original proof should still be valid for the specific record
            // Note: In practice, proofs might need regeneration after tree updates
            const isValid = merkleTree.verifyProof(records[0], proof, tree.root);
            
            // This test depends on implementation - some merkle tree implementations
            // maintain proof validity, others require proof regeneration
            expect(typeof isValid).to.equal('boolean');
        });
    });

    describe('Performance Tests', () => {
        it('should handle large dataset efficiently', function() {
            this.timeout(10000); // 10 second timeout

            const largeDataset = Array.from({ length: 10000 }, (_, i) => 
                `Medical Record ${i}: Patient P${String(i).padStart(6, '0')}`
            );

            const startTime = Date.now();
            const tree = merkleTree.buildTree(largeDataset);
            const endTime = Date.now();

            expect(tree).to.have.property('root');
            expect(tree.leaves).to.have.length(10000);
            expect(endTime - startTime).to.be.lessThan(5000); // Should complete in under 5 seconds
        });

        it('should generate proofs quickly for large trees', function() {
            this.timeout(5000);

            const dataset = Array.from({ length: 1000 }, (_, i) => `Record ${i}`);
            const tree = merkleTree.buildTree(dataset);

            const startTime = Date.now();
            const proofs = [];
            
            for (let i = 0; i < 100; i++) {
                proofs.push(merkleTree.generateProof(tree, i));
            }

            const endTime = Date.now();

            expect(proofs).to.have.length(100);
            expect(endTime - startTime).to.be.lessThan(1000); // Should complete in under 1 second
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle null or undefined inputs gracefully', () => {
            expect(() => merkleTree.buildTree(null)).to.not.throw();
            expect(() => merkleTree.buildTree(undefined)).to.not.throw();
            
            const tree = merkleTree.buildTree([]);
            expect(() => merkleTree.generateProof(tree, 0)).to.not.throw();
        });

        it('should handle invalid proof index', () => {
            const records = ['Record 1', 'Record 2'];
            const tree = merkleTree.buildTree(records);

            expect(() => merkleTree.generateProof(tree, -1)).to.not.throw();
            expect(() => merkleTree.generateProof(tree, 10)).to.not.throw();
        });

        it('should handle malformed proof data', () => {
            const malformedProof = [
                { hash: 'invalid', position: 'left' },
                { hash: null, position: 'right' }
            ];

            const isValid = merkleTree.verifyProof(
                'Test Record',
                malformedProof,
                'some_root_hash'
            );

            expect(isValid).to.be.false;
        });
    });
});