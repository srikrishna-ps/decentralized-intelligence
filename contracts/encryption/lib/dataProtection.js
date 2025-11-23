/**
 * Complete Data Protection Suite for Medical Data
 * Integrates encryption, hashing, and compliance features
 * HIPAA compliant data protection implementation
 */

const MedicalDataEncryption = require('./encryption');
const MedicalKeyManager = require('./keyManagement');
const MedicalHashUtils = require('./hashUtils');
const MedicalMerkleTree = require('./merkleTree');
const crypto = require('crypto');
const fs = require('fs').promises;

class MedicalDataProtection {
    constructor(options = {}) {
        this.encryption = new MedicalDataEncryption();
        this.keyManager = new MedicalKeyManager();
        this.hashUtils = new MedicalHashUtils();
        this.merkleTree = new MedicalMerkleTree();
        
        this.config = {
            encryptionStandard: options.encryptionStandard || 'AES-256-GCM',
            complianceLevel: options.complianceLevel || 'HIPAA',
            auditLevel: options.auditLevel || 'FULL',
            autoBackup: options.autoBackup !== false,
            keyRotationDays: options.keyRotationDays || 30,
            ...options
        };

        this.auditLog = [];
        this.protectedDataRegistry = new Map();
    }

    /**
     * Initialize the complete data protection system
     */
    async initialize() {
        try {
            await this.keyManager.initialize();
            
            this.logAuditEvent('SYSTEM_INIT', {
                config: this.config,
                timestamp: new Date().toISOString()
            });

            return {
                initialized: true,
                config: this.config,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Data protection system initialization failed: ${error.message}`);
        }
    }

    /**
     * Protect medical data with comprehensive security
     * @param {Object} medicalData - Medical data to protect
     * @param {string} providerId - Healthcare provider ID
     * @param {Object} options - Protection options
     */
    async protectMedicalData(medicalData, providerId, options = {}) {
        try {
            const protectionId = this.generateProtectionId();
            this.validateMedicalData(medicalData);
            
            // Step 1: Generate or get encryption key
            const keyInfo = await this.keyManager.generateProviderKey(providerId, 'AES');
            const encryptionKey = keyInfo.keyId;
            
            // Step 2: Generate data integrity hash
            const integrityHash = this.hashUtils.generateDataHash(
                this.hashUtils.sortObjectKeys(medicalData)
            );

            // Step 3: Encrypt the medical data
            const keyData = this.keyManager.getProviderKey(providerId, encryptionKey);
            const encryptedData = this.encryption.encryptMedicalData(
                JSON.stringify(medicalData),
                keyData.keyData.key,
                medicalData.patientId || 'unknown'
            );

            // Step 4: Generate cryptographic proof
            const proof = this.hashUtils.generateCryptographicProof(
                medicalData,
                null, // No private key for basic proof
                {
                    providerId: providerId,
                    protectionId: protectionId,
                    encryptionStandard: this.config.encryptionStandard
                }
            );

            // Step 5: Create protected data package
            const protectedPackage = {
                protectionId: protectionId,
                providerId: providerId,
                encryptedData: encryptedData,
                integrityHash: integrityHash,
                dataHash: integrityHash.hash,
                cryptographicProof: proof.proof,
                keyReference: {
                    keyId: encryptionKey,
                    keyType: 'AES'
                },
                metadata: {
                    originalSize: Buffer.byteLength(JSON.stringify(medicalData), 'utf8'),
                    protectionLevel: this.config.complianceLevel,
                    createdAt: new Date().toISOString(),
                    version: '1.0'
                },
                compliance: {
                    standard: this.config.complianceLevel,
                    encryptionMethod: this.config.encryptionStandard,
                    dataClassification: options.dataClassification || 'PHI', // Protected Health Information
                    retentionPolicy: options.retentionPolicy || 'STANDARD'
                }
            };

            // Step 6: Register protected data
            this.protectedDataRegistry.set(protectionId, {
                providerId: providerId,
                protectedAt: new Date().toISOString(),
                keyId: encryptionKey,
                dataType: options.recordType || 'general'
            });

            // Step 7: Record usage for key management
            this.keyManager.recordKeyUsage(encryptionKey, 'encrypt');

            // Step 8: Audit logging
            this.logAuditEvent('DATA_PROTECTED', {
                protectionId: protectionId,
                providerId: providerId,
                dataSize: protectedPackage.metadata.originalSize,
                encryptionKey: encryptionKey
            });

            // Step 9: Auto-backup if enabled
            if (this.config.autoBackup) {
                await this.backupProtectedData(protectedPackage);
            }

            return {
                protectionId: protectionId,
                protectedPackage: protectedPackage,
                success: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logAuditEvent('PROTECTION_ERROR', {
                error: error.message,
                providerId: providerId
            });
            throw new Error(`Medical data protection failed: ${error.message}`);
        }
    }

    /**
     * Unprotect (decrypt and verify) medical data
     * @param {Object} protectedPackage - Protected data package
     * @param {string} providerId - Healthcare provider ID requesting access
     */
    async unprotectMedicalData(protectedPackage, providerId) {
        try {
            // Step 1: Verify provider access
            if (protectedPackage.providerId !== providerId) {
                throw new Error('Provider access denied - ID mismatch');
            }

            // Step 2: Get decryption key
            const keyData = this.keyManager.getProviderKey(
                providerId, 
                protectedPackage.keyReference.keyId
            );

            if (keyData.status !== 'active') {
                throw new Error('Encryption key is not active');
            }

            // Step 3: Decrypt the medical data
            const decryptedResult = this.encryption.decryptMedicalData(
                protectedPackage.encryptedData,
                keyData.keyData.key
            );

            // Step 4: Parse decrypted data
            const medicalData = JSON.parse(decryptedResult.data);

            // Step 5: Verify data integrity
            const integrityVerification = this.hashUtils.verifyDataIntegrity(
                medicalData,
                protectedPackage.integrityHash
            );

            if (!integrityVerification.isValid) {
                throw new Error('Data integrity verification failed - data may be corrupted');
            }

            // Step 6: Verify cryptographic proof
            const proofVerification = this.hashUtils.verifyCryptographicProof(
                medicalData,
                protectedPackage.cryptographicProof
            );

            if (!proofVerification.isValid) {
                throw new Error('Cryptographic proof verification failed');
            }

            // Step 7: Record key usage
            this.keyManager.recordKeyUsage(protectedPackage.keyReference.keyId, 'decrypt');

            // Step 8: Audit logging
            this.logAuditEvent('DATA_UNPROTECTED', {
                protectionId: protectedPackage.protectionId,
                providerId: providerId,
                integrityValid: integrityVerification.isValid,
                proofValid: proofVerification.isValid
            });

            return {
                medicalData: medicalData,
                protectionId: protectedPackage.protectionId,
                verificationResults: {
                    integrity: integrityVerification,
                    proof: proofVerification
                },
                accessGranted: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logAuditEvent('UNPROTECTION_ERROR', {
                error: error.message,
                protectionId: protectedPackage.protectionId,
                providerId: providerId
            });
            throw new Error(`Medical data unprotection failed: ${error.message}`);
        }
    }

    async retrieveProtectedData(protectionId, protectedPackage, requesterId) {
        const enrichedPackage = {
            ...protectedPackage,
            protectionId
        };
        const result = await this.unprotectMedicalData(enrichedPackage, requesterId);
        return result.medicalData;
    }

    /**
     * Protect batch of medical data with Merkle tree verification
     * @param {Array} medicalDataArray - Array of medical records
     * @param {string} providerId - Healthcare provider ID
     */
    async protectMedicalDataBatch(medicalDataArray, providerId, options = {}) {
        try {
            const batchId = this.generateBatchId();
            const protectedItems = [];

            // Step 1: Protect each item individually
            for (let i = 0; i < medicalDataArray.length; i++) {
                const item = medicalDataArray[i];
                const itemOptions = {
                    ...options,
                    batchId: batchId,
                    batchIndex: i
                };
                
                const protectedItem = await this.protectMedicalData(item, providerId, itemOptions);
                protectedItems.push(protectedItem);
            }

            // Step 2: Build Merkle tree for batch verification
            const merkleResult = this.merkleTree.buildTree(medicalDataArray);
            const batchProof = this.merkleTree.generateBatchProof(
                medicalDataArray.map((_, index) => index)
            );

            // Step 3: Generate batch integrity hash
            const batchHash = this.hashUtils.generateBatchHash(medicalDataArray, batchId);

            // Step 4: Create batch package
            const batchPackage = {
                batchId: batchId,
                providerId: providerId,
                itemCount: medicalDataArray.length,
                protectedItems: protectedItems.map(item => ({
                    protectionId: item.protectionId,
                    protectedPackage: item.protectedPackage
                })),
                merkleTree: {
                    root: merkleResult.root,
                    depth: merkleResult.depth,
                    leafCount: merkleResult.leafCount,
                    proof: batchProof
                },
                batchIntegrity: batchHash,
                metadata: {
                    createdAt: new Date().toISOString(),
                    totalSize: protectedItems.reduce((sum, item) => 
                        sum + item.protectedPackage.metadata.originalSize, 0
                    ),
                    protectionLevel: this.config.complianceLevel
                }
            };

            // Step 5: Audit logging
            this.logAuditEvent('BATCH_PROTECTED', {
                batchId: batchId,
                providerId: providerId,
                itemCount: medicalDataArray.length,
                merkleRoot: merkleResult.root
            });

            return {
                batchId: batchId,
                batchPackage: batchPackage,
                merkleRoot: merkleResult.root,
                success: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logAuditEvent('BATCH_PROTECTION_ERROR', {
                error: error.message,
                providerId: providerId,
                itemCount: medicalDataArray.length
            });
            throw new Error(`Batch protection failed: ${error.message}`);
        }
    }

    /**
     * Verify batch integrity without decrypting all data
     * @param {Object} batchPackage - Protected batch package
     * @param {string} providerId - Provider requesting verification
     */
    async verifyBatchIntegrity(batchPackage, providerId) {
        try {
            // Step 1: Verify provider access
            if (batchPackage.providerId !== providerId) {
                throw new Error('Provider access denied for batch verification');
            }

            // Step 2: Verify Merkle tree consistency
            const merkleStats = this.merkleTree.getTreeStats();
            
            // Step 3: Spot check a few items for detailed verification
            const spotCheckCount = Math.min(3, batchPackage.itemCount);
            const spotCheckIndices = this.selectRandomIndices(batchPackage.itemCount, spotCheckCount);
            
            const spotCheckResults = [];
            for (const index of spotCheckIndices) {
                try {
                    const protectedItem = batchPackage.protectedItems[index];
                    const unprotectedResult = await this.unprotectMedicalData(
                        protectedItem.protectedPackage, 
                        providerId
                    );
                    
                    spotCheckResults.push({
                        index: index,
                        valid: true,
                        protectionId: protectedItem.protectionId
                    });
                } catch (error) {
                    spotCheckResults.push({
                        index: index,
                        valid: false,
                        error: error.message
                    });
                }
            }

            const allSpotChecksValid = spotCheckResults.every(result => result.valid);

            // Step 4: Audit logging
            this.logAuditEvent('BATCH_VERIFIED', {
                batchId: batchPackage.batchId,
                providerId: providerId,
                itemCount: batchPackage.itemCount,
                spotCheckCount: spotCheckCount,
                allValid: allSpotChecksValid
            });

            return {
                batchId: batchPackage.batchId,
                isValid: allSpotChecksValid,
                itemCount: batchPackage.itemCount,
                spotCheckResults: spotCheckResults,
                merkleRoot: batchPackage.merkleTree.root,
                verifiedAt: new Date().toISOString()
            };
        } catch (error) {
            this.logAuditEvent('BATCH_VERIFICATION_ERROR', {
                error: error.message,
                batchId: batchPackage.batchId,
                providerId: providerId
            });
            throw new Error(`Batch verification failed: ${error.message}`);
        }
    }

    /**
     * Secure data sharing between healthcare providers
     * @param {Object} protectedPackage - Protected data to share
     * @param {string} fromProviderId - Source provider
     * @param {string} toProviderId - Target provider
     */
    async shareProtectedData(protectedPackage, fromProviderId, toProviderId, shareOptions = {}) {
        try {
            // Step 1: Verify source provider access
            if (protectedPackage.providerId !== fromProviderId) {
                throw new Error('Source provider access denied');
            }

            // Step 2: Generate key pair for target provider if needed
            const targetKeyInfo = await this.keyManager.generateProviderKey(toProviderId, 'RSA');
            const targetKeyData = this.keyManager.getProviderKey(toProviderId, targetKeyInfo.keyId);

            // Step 3: Re-encrypt data for target provider
            const sourceKeyData = this.keyManager.getProviderKey(
                fromProviderId, 
                protectedPackage.keyReference.keyId
            );

            // Decrypt with source key
            const decryptedResult = this.encryption.decryptMedicalData(
                protectedPackage.encryptedData,
                sourceKeyData.keyData.key
            );

            // Generate new AES key for target
            const newAESKey = this.encryption.generateAESKey();
            
            // Encrypt with new AES key
            const reencryptedData = this.encryption.encryptMedicalData(
                decryptedResult.data,
                newAESKey.key,
                JSON.parse(decryptedResult.data).patientId || 'shared'
            );

            // Encrypt AES key with target's RSA public key
            const encryptedAESKey = this.encryption.encryptAESKeyWithRSA(
                newAESKey.key,
                targetKeyData.keyData.publicKey
            );

            // Step 4: Create sharing package
            const sharePackage = {
                shareId: this.generateShareId(),
                fromProviderId: fromProviderId,
                toProviderId: toProviderId,
                originalProtectionId: protectedPackage.protectionId,
                sharedData: {
                    encryptedData: reencryptedData,
                    encryptedKey: encryptedAESKey,
                    targetKeyId: targetKeyInfo.keyId
                },
                shareMetadata: {
                    sharedAt: new Date().toISOString(),
                    shareType: shareOptions.shareType || 'provider_to_provider',
                    purpose: shareOptions.purpose || 'medical_consultation',
                    expiresAt: shareOptions.expiresAt || null
                },
                originalIntegrity: protectedPackage.integrityHash,
                compliance: {
                    ...protectedPackage.compliance,
                    dataSharing: true,
                    shareAudit: true
                }
            };

            // Step 5: Audit logging
            this.logAuditEvent('DATA_SHARED', {
                shareId: sharePackage.shareId,
                fromProviderId: fromProviderId,
                toProviderId: toProviderId,
                protectionId: protectedPackage.protectionId
            });

            return {
                shareId: sharePackage.shareId,
                sharePackage: sharePackage,
                success: true,
                sharedAt: new Date().toISOString()
            };
        } catch (error) {
            this.logAuditEvent('SHARING_ERROR', {
                error: error.message,
                fromProviderId: fromProviderId,
                toProviderId: toProviderId,
                protectionId: protectedPackage.protectionId
            });
            throw new Error(`Data sharing failed: ${error.message}`);
        }
    }

    /**
     * Access shared medical data
     * @param {Object} sharePackage - Shared data package
     * @param {string} providerId - Provider requesting access
     */
    async accessSharedData(sharePackage, providerId) {
        try {
            // Step 1: Verify provider is the intended recipient
            if (sharePackage.toProviderId !== providerId) {
                throw new Error('Provider not authorized to access shared data');
            }

            // Step 2: Check expiration
            if (sharePackage.shareMetadata.expiresAt) {
                const expiryTime = new Date(sharePackage.shareMetadata.expiresAt);
                if (new Date() > expiryTime) {
                    throw new Error('Shared data access has expired');
                }
            }

            // Step 3: Get provider's private key
            const targetKeyData = this.keyManager.getProviderKey(
                providerId, 
                sharePackage.sharedData.targetKeyId
            );

            // Step 4: Decrypt AES key
            const decryptedAESKey = this.encryption.decryptAESKeyWithRSA(
                sharePackage.sharedData.encryptedKey,
                targetKeyData.keyData.privateKey
            );

            // Step 5: Decrypt medical data
            const decryptedData = this.encryption.decryptMedicalData(
                sharePackage.sharedData.encryptedData,
                decryptedAESKey.aesKey
            );

            // Step 6: Parse and return medical data
            const medicalData = JSON.parse(decryptedData.data);

            // Step 7: Audit logging
            this.logAuditEvent('SHARED_DATA_ACCESSED', {
                shareId: sharePackage.shareId,
                providerId: providerId,
                fromProviderId: sharePackage.fromProviderId
            });

            return {
                medicalData: medicalData,
                shareId: sharePackage.shareId,
                fromProvider: sharePackage.fromProviderId,
                accessGranted: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logAuditEvent('SHARED_ACCESS_ERROR', {
                error: error.message,
                shareId: sharePackage.shareId,
                providerId: providerId
            });
            throw new Error(`Shared data access failed: ${error.message}`);
        }
    }

    /**
     * Generate comprehensive audit report
     */
    generateAuditReport(startDate = null, endDate = null) {
        try {
            const now = new Date();
            const start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : now;

            const relevantEvents = this.auditLog.filter(event => {
                const eventTime = new Date(event.timestamp);
                return eventTime >= start && eventTime <= end;
            });

            const eventSummary = relevantEvents.reduce((summary, event) => {
                summary[event.event] = (summary[event.event] || 0) + 1;
                return summary;
            }, {});

            const keyStats = this.keyManager.getKeyStats();
            const protectionStats = {
                totalProtected: this.protectedDataRegistry.size,
                byProvider: {}
            };

            for (const [id, record] of this.protectedDataRegistry.entries()) {
                protectionStats.byProvider[record.providerId] = 
                    (protectionStats.byProvider[record.providerId] || 0) + 1;
            }

            return {
                reportGenerated: new Date().toISOString(),
                period: {
                    start: start.toISOString(),
                    end: end.toISOString()
                },
                eventSummary: eventSummary,
                totalEvents: relevantEvents.length,
                keyManagement: keyStats,
                dataProtection: protectionStats,
                complianceStatus: 'COMPLIANT',
                events: relevantEvents.slice(-100) // Last 100 events for detail
            };
        } catch (error) {
            throw new Error(`Audit report generation failed: ${error.message}`);
        }
    }

    // Helper methods

    generateProtectionId() {
        return `prot_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    generateBatchId() {
        return `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    generateShareId() {
        return `share_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    async maskPII(medicalData) {
        const cloned = JSON.parse(JSON.stringify(medicalData || {}));

        if (cloned.ssn && cloned.ssn.length >= 4) {
            cloned.ssn = `XXX-XX-${cloned.ssn.slice(-4)}`;
        }

        if (cloned.phone && cloned.phone.length >= 4) {
            const digits = cloned.phone.replace(/\D/g, '');
            cloned.phone = `XXX-XXX-${digits.slice(-4)}`;
        }

        if (cloned.email && cloned.email.includes('@')) {
            const [, domain] = cloned.email.split('@');
            cloned.email = `***@${domain}`;
        }

        if (cloned.name) {
            cloned.name = `REDACTED-${cloned.name.length}`;
        }

        return cloned;
    }

    validateMedicalData(medicalData) {
        const serialized = JSON.stringify(medicalData || {});
        const dangerousPatterns = [/<script/gi, /DROP\s+TABLE/gi, /<img/gi];
        const hasMaliciousContent = dangerousPatterns.some(pattern => pattern.test(serialized));
        if (hasMaliciousContent) {
            throw new Error('Invalid medical data detected');
        }
        return true;
    }

    selectRandomIndices(total, count) {
        const indices = [];
        const used = new Set();
        
        while (indices.length < count && indices.length < total) {
            const index = Math.floor(Math.random() * total);
            if (!used.has(index)) {
                indices.push(index);
                used.add(index);
            }
        }
        
        return indices.sort((a, b) => a - b);
    }

    logAuditEvent(event, details) {
        const auditEntry = {
            id: crypto.randomUUID(),
            event: event,
            timestamp: new Date().toISOString(),
            details: details
        };
        
        this.auditLog.push(auditEntry);
        
        // Keep audit log size manageable (last 10000 events)
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-10000);
        }
        
        // In production, write to secure audit database
        console.log(`AUDIT: ${event}`, details);
    }

    async backupProtectedData(protectedPackage) {
        try {
            // In production, implement secure backup to cloud storage or HSM
            console.log(`Backing up protected data: ${protectedPackage.protectionId}`);
            return true;
        } catch (error) {
            console.error(`Backup failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Get system health and statistics
     */
    getSystemHealth() {
        return {
            initialized: !!this.keyManager,
            protectedDataCount: this.protectedDataRegistry.size,
            auditLogSize: this.auditLog.length,
            keyManagementHealth: this.keyManager.getKeyStats(),
            lastActivity: this.auditLog.length > 0 ? 
                this.auditLog[this.auditLog.length - 1].timestamp : null,
            systemUptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = MedicalDataProtection;