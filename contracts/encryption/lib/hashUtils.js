/**
 * Hash Utilities for Medical Data Integrity
 * Implements SHA-256 hashing and cryptographic proof generation
 * Ensures data integrity and tamper detection
 */

const crypto = require('crypto');
const CryptoJS = require('crypto-js');

class MedicalHashUtils {
    constructor() {
        this.defaultAlgorithm = 'sha256';
        this.saltLength = 32; // 256 bits
        this.proofVersion = '1.0';
    }

    /**
     * Simple SHA-256 helper used extensively in tests
     */
    sha256Hash(data) {
        const normalized = this.normalizeDataForHash(data);
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }

    verifyHash(data, expectedHash) {
        try {
            if (!expectedHash || typeof expectedHash !== 'string' || expectedHash.length !== 64) {
                return false;
            }

            const computed = this.sha256Hash(data);
            return crypto.timingSafeEqual(
                Buffer.from(computed, 'hex'),
                Buffer.from(expectedHash, 'hex')
            );
        } catch (error) {
            return false;
        }
    }

    generateHMAC(data, key, algorithm = 'sha256') {
        if (!key) {
            throw new Error('HMAC key is required');
        }
        const normalized = this.normalizeDataForHash(data);
        return crypto.createHmac(algorithm, key).update(normalized).digest('hex');
    }

    verifyHMAC(data, key, expectedHmac, algorithm = 'sha256') {
        if (!expectedHmac) return false;
        const computed = this.generateHMAC(data, key, algorithm);
        try {
            return crypto.timingSafeEqual(
                Buffer.from(computed, 'hex'),
                Buffer.from(expectedHmac, 'hex')
            );
        } catch {
            return false;
        }
    }

    batchHash(dataArray) {
        if (!Array.isArray(dataArray) || dataArray.length === 0) {
            return [];
        }
        return dataArray.map(item => this.sha256Hash(item));
    }

    generateDataFingerprint(data) {
        const sorted = this.sortObjectKeys(data);
        const normalized = typeof sorted === 'string' ? sorted : JSON.stringify(sorted);
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }

    /**
     * Generate SHA-256 hash of medical data
     * @param {string|Object} data - Data to hash
     * @param {string} salt - Optional salt for additional security
     */
    generateDataHash(data, salt = null) {
        try {
            let dataString;
            
            // Convert data to string if it's an object
            if (typeof data === 'object') {
                // Sort object keys for consistent hashing
                dataString = JSON.stringify(this.sortObjectKeys(data));
            } else {
                dataString = String(data);
            }

            // Generate salt if not provided
            if (!salt) {
                salt = crypto.randomBytes(this.saltLength).toString('hex');
            }

            // Create hash with salt
            const hash = crypto.createHash(this.defaultAlgorithm);
            hash.update(dataString);
            hash.update(salt);
            
            const hashValue = hash.digest('hex');

            return {
                hash: hashValue,
                algorithm: this.defaultAlgorithm,
                salt: salt,
                dataSize: Buffer.byteLength(dataString, 'utf8'),
                timestamp: new Date().toISOString(),
                version: this.proofVersion
            };
        } catch (error) {
            throw new Error(`Data hashing failed: ${error.message}`);
        }
    }

    /**
     * Verify data integrity by comparing hashes
     * @param {string|Object} data - Original data to verify
     * @param {Object} hashRecord - Previously generated hash record
     */
    verifyDataIntegrity(data, hashRecord) {
        try {
            const newHashRecord = this.generateDataHash(data, hashRecord.salt);
            
            const isValid = newHashRecord.hash === hashRecord.hash;
            
            return {
                isValid: isValid,
                originalHash: hashRecord.hash,
                computedHash: newHashRecord.hash,
                algorithm: hashRecord.algorithm,
                verificationTimestamp: new Date().toISOString(),
                dataModified: !isValid
            };
        } catch (error) {
            throw new Error(`Data integrity verification failed: ${error.message}`);
        }
    }

    /**
     * Generate hash for patient medical record
     * Includes additional metadata for medical context
     */
    generatePatientRecordHash(patientData, providerId, recordType = 'general') {
        try {
            // Create comprehensive record for hashing
            const recordForHashing = {
                patientData: this.sortObjectKeys(patientData),
                providerId: providerId,
                recordType: recordType,
                timestamp: new Date().toISOString(),
                version: this.proofVersion
            };

            const hashRecord = this.generateDataHash(recordForHashing);
            
            return {
                ...hashRecord,
                patientId: patientData.patientId || 'unknown',
                providerId: providerId,
                recordType: recordType,
                medicalRecordHash: true
            };
        } catch (error) {
            throw new Error(`Patient record hashing failed: ${error.message}`);
        }
    }

    /**
     * Generate batch hash for multiple medical records
     * Used for bulk operations and batch verification
     */
    generateBatchHash(dataArray, batchId = null) {
        try {
            if (!Array.isArray(dataArray) || dataArray.length === 0) {
                throw new Error('Invalid data array for batch hashing');
            }

            // Generate individual hashes first
            const individualHashes = dataArray.map((item, index) => {
                const itemHash = this.generateDataHash(item);
                return {
                    index: index,
                    hash: itemHash.hash,
                    salt: itemHash.salt,
                    dataSize: itemHash.dataSize
                };
            });

            // Create batch hash from individual hashes
            const batchString = individualHashes
                .map(h => h.hash)
                .sort() // Sort for consistency
                .join('');

            const batchHashRecord = this.generateDataHash(batchString);
            
            return {
                batchHash: batchHashRecord.hash,
                batchId: batchId || this.generateBatchId(),
                itemCount: dataArray.length,
                individualHashes: individualHashes,
                algorithm: this.defaultAlgorithm,
                batchSalt: batchHashRecord.salt,
                timestamp: new Date().toISOString(),
                totalDataSize: individualHashes.reduce((sum, h) => sum + h.dataSize, 0)
            };
        } catch (error) {
            throw new Error(`Batch hashing failed: ${error.message}`);
        }
    }

    /**
     * Verify batch integrity
     */
    verifyBatchIntegrity(dataArray, batchHashRecord) {
        try {
            const newBatchRecord = this.generateBatchHash(dataArray, batchHashRecord.batchId);
            
            const isBatchValid = newBatchRecord.batchHash === batchHashRecord.batchHash;
            const itemsValid = [];
            const itemsInvalid = [];

            // Check individual items if batch hash fails
            if (!isBatchValid && batchHashRecord.individualHashes) {
                dataArray.forEach((item, index) => {
                    if (index < batchHashRecord.individualHashes.length) {
                        const originalHash = batchHashRecord.individualHashes[index];
                        const verification = this.verifyDataIntegrity(item, {
                            hash: originalHash.hash,
                            salt: originalHash.salt,
                            algorithm: this.defaultAlgorithm
                        });
                        
                        if (verification.isValid) {
                            itemsValid.push(index);
                        } else {
                            itemsInvalid.push({
                                index: index,
                                expectedHash: originalHash.hash,
                                computedHash: verification.computedHash
                            });
                        }
                    }
                });
            }

            return {
                batchValid: isBatchValid,
                batchId: batchHashRecord.batchId,
                originalBatchHash: batchHashRecord.batchHash,
                computedBatchHash: newBatchRecord.batchHash,
                itemCount: dataArray.length,
                validItems: itemsValid.length,
                invalidItems: itemsInvalid,
                verificationTimestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Batch integrity verification failed: ${error.message}`);
        }
    }

    /**
     * Generate cryptographic proof for data authenticity
     * Creates a tamper-evident proof that data hasn't been modified
     */
    generateCryptographicProof(data, privateKey = null, additionalMetadata = {}) {
        try {
            const dataHash = this.generateDataHash(data);
            
            // Create proof structure
            const proofData = {
                dataHash: dataHash.hash,
                dataSalt: dataHash.salt,
                algorithm: dataHash.algorithm,
                timestamp: new Date().toISOString(),
                metadata: additionalMetadata,
                version: this.proofVersion
            };

            // Create digital signature if private key provided
            let signature = null;
            if (privateKey) {
                const sign = crypto.createSign('RSA-SHA256');
                sign.update(JSON.stringify(proofData));
                signature = sign.sign(privateKey, 'hex');
            }

            // Generate proof hash
            const proofString = JSON.stringify(this.sortObjectKeys(proofData));
            const proofHash = crypto.createHash('sha256').update(proofString).digest('hex');

            return {
                proof: {
                    ...proofData,
                    proofHash: proofHash,
                    signature: signature,
                    signatureAlgorithm: signature ? 'RSA-SHA256' : null
                },
                verification: {
                    canVerify: true,
                    requiresSignature: !!signature,
                    proofGenerated: new Date().toISOString()
                }
            };
        } catch (error) {
            throw new Error(`Cryptographic proof generation failed: ${error.message}`);
        }
    }

    /**
     * Verify cryptographic proof
     */
    verifyCryptographicProof(data, proof, publicKey = null) {
        try {
            // Verify data hash
            const dataVerification = this.verifyDataIntegrity(data, {
                hash: proof.dataHash,
                salt: proof.dataSalt,
                algorithm: proof.algorithm
            });

            // Verify proof hash
            const proofDataForHashing = {
                dataHash: proof.dataHash,
                dataSalt: proof.dataSalt,
                algorithm: proof.algorithm,
                timestamp: proof.timestamp,
                metadata: proof.metadata,
                version: proof.version
            };
            
            const proofString = JSON.stringify(this.sortObjectKeys(proofDataForHashing));
            const computedProofHash = crypto.createHash('sha256').update(proofString).digest('hex');
            const proofValid = computedProofHash === proof.proofHash;

            // Verify digital signature if present
            let signatureValid = null;
            if (proof.signature && publicKey) {
                try {
                    const verify = crypto.createVerify('RSA-SHA256');
                    verify.update(JSON.stringify(proofDataForHashing));
                    signatureValid = verify.verify(publicKey, proof.signature, 'hex');
                } catch (error) {
                    signatureValid = false;
                }
            }

            return {
                isValid: dataVerification.isValid && proofValid && (signatureValid !== false),
                dataIntegrityValid: dataVerification.isValid,
                proofIntegrityValid: proofValid,
                signatureValid: signatureValid,
                timestamp: proof.timestamp,
                verificationTimestamp: new Date().toISOString(),
                details: {
                    originalDataHash: proof.dataHash,
                    computedDataHash: dataVerification.computedHash,
                    originalProofHash: proof.proofHash,
                    computedProofHash: computedProofHash
                }
            };
        } catch (error) {
            throw new Error(`Cryptographic proof verification failed: ${error.message}`);
        }
    }

    /**
     * Generate hash chain for audit trail
     * Creates a blockchain-like chain of hashes for audit purposes
     */
    generateHashChain(dataArray, previousChainHash = null) {
        try {
            const chainEntries = [];
            let currentHash = previousChainHash;

            dataArray.forEach((data, index) => {
                const dataHash = this.generateDataHash(data);
                
                // Create chain entry
                const chainEntry = {
                    index: index,
                    dataHash: dataHash.hash,
                    dataSalt: dataHash.salt,
                    previousHash: currentHash,
                    timestamp: new Date().toISOString()
                };

                // Generate chain hash
                const chainString = JSON.stringify(this.sortObjectKeys(chainEntry));
                chainEntry.chainHash = crypto.createHash('sha256').update(chainString).digest('hex');
                
                chainEntries.push(chainEntry);
                currentHash = chainEntry.chainHash;
            });

            return {
                chainEntries: chainEntries,
                chainLength: chainEntries.length,
                finalHash: currentHash,
                startHash: previousChainHash,
                createdAt: new Date().toISOString(),
                algorithm: this.defaultAlgorithm
            };
        } catch (error) {
            throw new Error(`Hash chain generation failed: ${error.message}`);
        }
    }

    /**
     * Verify hash chain integrity
     */
    verifyHashChain(dataArray, chainRecord) {
        try {
            if (dataArray.length !== chainRecord.chainEntries.length) {
                return {
                    isValid: false,
                    error: 'Data array length mismatch',
                    expectedLength: chainRecord.chainEntries.length,
                    actualLength: dataArray.length
                };
            }

            const verificationResults = [];
            let chainValid = true;

            for (let i = 0; i < dataArray.length; i++) {
                const data = dataArray[i];
                const chainEntry = chainRecord.chainEntries[i];

                // Verify data hash
                const dataVerification = this.verifyDataIntegrity(data, {
                    hash: chainEntry.dataHash,
                    salt: chainEntry.dataSalt,
                    algorithm: this.defaultAlgorithm
                });

                // Verify chain hash
                const expectedChainData = {
                    index: chainEntry.index,
                    dataHash: chainEntry.dataHash,
                    dataSalt: chainEntry.dataSalt,
                    previousHash: chainEntry.previousHash,
                    timestamp: chainEntry.timestamp
                };

                const expectedChainString = JSON.stringify(this.sortObjectKeys(expectedChainData));
                const computedChainHash = crypto.createHash('sha256').update(expectedChainString).digest('hex');
                const chainHashValid = computedChainHash === chainEntry.chainHash;

                verificationResults.push({
                    index: i,
                    dataValid: dataVerification.isValid,
                    chainHashValid: chainHashValid,
                    dataHash: dataVerification.computedHash,
                    chainHash: computedChainHash
                });

                if (!dataVerification.isValid || !chainHashValid) {
                    chainValid = false;
                }
            }

            return {
                isValid: chainValid,
                chainLength: chainRecord.chainLength,
                verificationResults: verificationResults,
                finalHash: chainRecord.finalHash,
                verifiedAt: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Hash chain verification failed: ${error.message}`);
        }
    }

    /**
     * Sort object keys recursively for consistent hashing
     */
    sortObjectKeys(obj) {
        if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sortObjectKeys(item));
        }

        const sortedKeys = Object.keys(obj).sort();
        const sortedObj = {};
        
        sortedKeys.forEach(key => {
            sortedObj[key] = this.sortObjectKeys(obj[key]);
        });

        return sortedObj;
    }

    normalizeDataForHash(data) {
        if (data === undefined) return 'undefined';
        if (data === null) return 'null';
        if (typeof data === 'object') {
            return JSON.stringify(this.sortObjectKeys(data));
        }
        return String(data);
    }

    /**
     * Generate unique batch ID
     */
    generateBatchId() {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(4).toString('hex');
        return `batch_${timestamp}_${random}`;
    }

    /**
     * Generate hash for file content
     * Useful for medical documents and images
     */
    generateFileHash(buffer, filename = null, metadata = {}) {
        try {
            if (!Buffer.isBuffer(buffer)) {
                throw new Error('Input must be a Buffer');
            }

            const hash = crypto.createHash('sha256');
            hash.update(buffer);
            const fileHash = hash.digest('hex');

            // Generate metadata hash
            const fileMetadata = {
                filename: filename,
                size: buffer.length,
                ...metadata,
                timestamp: new Date().toISOString()
            };

            const metadataHash = this.generateDataHash(fileMetadata);

            return {
                fileHash: fileHash,
                metadataHash: metadataHash.hash,
                metadata: fileMetadata,
                algorithm: 'sha256',
                fileSize: buffer.length,
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`File hashing failed: ${error.message}`);
        }
    }

    /**
     * Get hash utilities statistics
     */
    getHashStats() {
        return {
            defaultAlgorithm: this.defaultAlgorithm,
            saltLength: this.saltLength,
            proofVersion: this.proofVersion,
            supportedAlgorithms: ['sha256', 'sha512', 'sha3-256'],
            features: [
                'Data integrity verification',
                'Batch hashing',
                'Cryptographic proofs',
                'Hash chains',
                'File hashing',
                'Digital signatures'
            ]
        };
    }
}

module.exports = MedicalHashUtils;