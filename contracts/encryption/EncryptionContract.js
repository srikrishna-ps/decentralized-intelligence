/**
 * Hyperledger Fabric Smart Contract for Medical Data Encryption
 * Manages encrypted medical data on the blockchain
 * Integrates with the data protection system
 */

'use strict';

const { Contract, Context } = require('fabric-contract-api');
const MedicalDataProtection = require('../network/crypto/dataProtection');

class EncryptionContract extends Contract {
    constructor() {
        super('EncryptionContract');
        this.dataProtection = null;
    }

    /**
     * Initialize the contract
     */
    async initLedger(ctx) {
        try {
            // Initialize data protection system
            this.dataProtection = new MedicalDataProtection({
                encryptionStandard: 'AES-256-GCM',
                complianceLevel: 'HIPAA',
                auditLevel: 'FULL'
            });

            await this.dataProtection.initialize();

            // Create initial system record
            const initRecord = {
                contractName: 'EncryptionContract',
                version: '1.0',
                initializedAt: new Date().toISOString(),
                complianceLevel: 'HIPAA',
                encryptionStandard: 'AES-256-GCM'
            };

            await ctx.stub.putState('CONTRACT_INIT', Buffer.from(JSON.stringify(initRecord)));

            return JSON.stringify({
                success: true,
                message: 'Encryption contract initialized successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Contract initialization failed: ${error.message}`);
        }
    }

    /**
     * Store protected medical data on the blockchain
     * @param {Object} ctx - Transaction context
     * @param {string} recordId - Unique record identifier
     * @param {string} medicalDataJson - Medical data as JSON string
     * @param {string} providerId - Healthcare provider ID
     * @param {string} patientId - Patient identifier
     */
    async storeProtectedMedicalData(ctx, recordId, medicalDataJson, providerId, patientId) {
        try {
            // Validate inputs
            if (!recordId || !medicalDataJson || !providerId || !patientId) {
                throw new Error('Missing required parameters');
            }

            // Check if record already exists
            const existingRecord = await ctx.stub.getState(recordId);
            if (existingRecord && existingRecord.length > 0) {
                throw new Error(`Medical record ${recordId} already exists`);
            }

            // Parse medical data
            const medicalData = JSON.parse(medicalDataJson);
            medicalData.patientId = patientId; // Ensure patient ID is included

            // Protect the medical data
            const protectionResult = await this.dataProtection.protectMedicalData(
                medicalData,
                providerId,
                {
                    recordType: 'blockchain_stored',
                    dataClassification: 'PHI',
                    retentionPolicy: 'LONG_TERM'
                }
            );

            // Create blockchain record
            const blockchainRecord = {
                recordId: recordId,
                patientId: patientId,
                providerId: providerId,
                protectionId: protectionResult.protectionId,
                protectedPackage: protectionResult.protectedPackage,
                metadata: {
                    createdAt: new Date().toISOString(),
                    createdBy: providerId,
                    dataSize: Buffer.byteLength(medicalDataJson, 'utf8'),
                    version: '1.0',
                    status: 'active'
                },
                auditTrail: [{
                    action: 'CREATED',
                    timestamp: new Date().toISOString(),
                    providerId: providerId,
                    details: 'Medical record created and stored on blockchain'
                }]
            };

            // Store on blockchain
            await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(blockchainRecord)));

            // Create index for patient queries
            const patientIndexKey = ctx.stub.createCompositeKey('patient-records', [patientId, recordId]);
            await ctx.stub.putState(patientIndexKey, Buffer.from(recordId));

            // Create index for provider queries
            const providerIndexKey = ctx.stub.createCompositeKey('provider-records', [providerId, recordId]);
            await ctx.stub.putState(providerIndexKey, Buffer.from(recordId));

            // Emit event
            ctx.stub.setEvent('MedicalDataStored', Buffer.from(JSON.stringify({
                recordId: recordId,
                patientId: patientId,
                providerId: providerId,
                protectionId: protectionResult.protectionId,
                timestamp: new Date().toISOString()
            })));

            return JSON.stringify({
                success: true,
                recordId: recordId,
                protectionId: protectionResult.protectionId,
                message: 'Medical data stored successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to store medical data: ${error.message}`);
        }
    }

    /**
     * Retrieve and decrypt protected medical data
     * @param {Object} ctx - Transaction context
     * @param {string} recordId - Record identifier
     * @param {string} requesterId - ID of entity requesting data
     * @param {string} accessToken - Access token for authorization
     */
    async retrieveProtectedMedicalData(ctx, recordId, requesterId, accessToken) {
        try {
            // Validate inputs
            if (!recordId || !requesterId || !accessToken) {
                throw new Error('Missing required parameters');
            }

            // Get record from blockchain
            const recordBuffer = await ctx.stub.getState(recordId);
            if (!recordBuffer || recordBuffer.length === 0) {
                throw new Error(`Medical record ${recordId} not found`);
            }

            const blockchainRecord = JSON.parse(recordBuffer.toString());

            // Verify access permissions
            const hasAccess = await this._verifyAccess(ctx, recordId, requesterId, accessToken);
            if (!hasAccess) {
                throw new Error('Access denied: Insufficient permissions');
            }

            // Decrypt medical data
            const decryptedData = await this.dataProtection.retrieveProtectedData(
                blockchainRecord.protectionId,
                blockchainRecord.protectedPackage,
                requesterId
            );

            // Update audit trail
            blockchainRecord.auditTrail.push({
                action: 'ACCESSED',
                timestamp: new Date().toISOString(),
                requesterId: requesterId,
                details: 'Medical record accessed and decrypted'
            });

            // Update record on blockchain
            await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(blockchainRecord)));

            // Emit access event
            ctx.stub.setEvent('MedicalDataAccessed', Buffer.from(JSON.stringify({
                recordId: recordId,
                patientId: blockchainRecord.patientId,
                requesterId: requesterId,
                timestamp: new Date().toISOString()
            })));

            return JSON.stringify({
                success: true,
                recordId: recordId,
                data: decryptedData,
                metadata: blockchainRecord.metadata,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to retrieve medical data: ${error.message}`);
        }
    }

    /**
     * Update existing medical record
     * @param {Object} ctx - Transaction context
     * @param {string} recordId - Record identifier
     * @param {string} updatedDataJson - Updated medical data
     * @param {string} providerId - Provider making the update
     */
    async updateMedicalRecord(ctx, recordId, updatedDataJson, providerId) {
        try {
            // Validate inputs
            if (!recordId || !updatedDataJson || !providerId) {
                throw new Error('Missing required parameters');
            }

            // Get existing record
            const recordBuffer = await ctx.stub.getState(recordId);
            if (!recordBuffer || recordBuffer.length === 0) {
                throw new Error(`Medical record ${recordId} not found`);
            }

            const blockchainRecord = JSON.parse(recordBuffer.toString());

            // Verify provider has update permissions
            if (blockchainRecord.providerId !== providerId) {
                throw new Error('Access denied: Only original provider can update record');
            }

            // Parse updated data
            const updatedData = JSON.parse(updatedDataJson);
            updatedData.patientId = blockchainRecord.patientId;

            // Create new protection for updated data
            const protectionResult = await this.dataProtection.protectMedicalData(
                updatedData,
                providerId,
                {
                    recordType: 'blockchain_updated',
                    dataClassification: 'PHI',
                    retentionPolicy: 'LONG_TERM'
                }
            );

            // Update blockchain record
            blockchainRecord.protectionId = protectionResult.protectionId;
            blockchainRecord.protectedPackage = protectionResult.protectedPackage;
            blockchainRecord.metadata.updatedAt = new Date().toISOString();
            blockchainRecord.metadata.updatedBy = providerId;
            blockchainRecord.metadata.version = (parseFloat(blockchainRecord.metadata.version) + 0.1).toFixed(1);

            // Add to audit trail
            blockchainRecord.auditTrail.push({
                action: 'UPDATED',
                timestamp: new Date().toISOString(),
                providerId: providerId,
                details: 'Medical record updated with new data'
            });

            // Store updated record
            await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(blockchainRecord)));

            // Emit update event
            ctx.stub.setEvent('MedicalDataUpdated', Buffer.from(JSON.stringify({
                recordId: recordId,
                patientId: blockchainRecord.patientId,
                providerId: providerId,
                version: blockchainRecord.metadata.version,
                timestamp: new Date().toISOString()
            })));

            return JSON.stringify({
                success: true,
                recordId: recordId,
                version: blockchainRecord.metadata.version,
                message: 'Medical record updated successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to update medical record: ${error.message}`);
        }
    }

    /**
     * Get all records for a patient
     * @param {Object} ctx - Transaction context
     * @param {string} patientId - Patient identifier
     * @param {string} requesterId - ID of entity requesting data
     */
    async getPatientRecords(ctx, patientId, requesterId) {
        try {
            // Validate inputs
            if (!patientId || !requesterId) {
                throw new Error('Missing required parameters');
            }

            // Get patient records using composite key
            const patientRecordsIterator = await ctx.stub.getStateByPartialCompositeKey(
                'patient-records',
                [patientId]
            );

            const patientRecords = [];
            let result = await patientRecordsIterator.next();

            while (!result.done) {
                const recordId = result.value.value.toString();
                const recordBuffer = await ctx.stub.getState(recordId);

                if (recordBuffer && recordBuffer.length > 0) {
                    const record = JSON.parse(recordBuffer.toString());

                    // Only return metadata and audit info, not encrypted data
                    patientRecords.push({
                        recordId: record.recordId,
                        providerId: record.providerId,
                        protectionId: record.protectionId,
                        metadata: record.metadata,
                        auditTrail: record.auditTrail
                    });
                }

                result = await patientRecordsIterator.next();
            }

            await patientRecordsIterator.close();

            return JSON.stringify({
                success: true,
                patientId: patientId,
                totalRecords: patientRecords.length,
                records: patientRecords,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to retrieve patient records: ${error.message}`);
        }
    }

    /**
     * Revoke access to a medical record
     * @param {Object} ctx - Transaction context
     * @param {string} recordId - Record identifier
     * @param {string} patientId - Patient identifier (only patient can revoke)
     */
    async revokeRecordAccess(ctx, recordId, patientId) {
        try {
            // Validate inputs
            if (!recordId || !patientId) {
                throw new Error('Missing required parameters');
            }

            // Get record
            const recordBuffer = await ctx.stub.getState(recordId);
            if (!recordBuffer || recordBuffer.length === 0) {
                throw new Error(`Medical record ${recordId} not found`);
            }

            const blockchainRecord = JSON.parse(recordBuffer.toString());

            // Verify patient owns the record
            if (blockchainRecord.patientId !== patientId) {
                throw new Error('Access denied: Only patient can revoke access');
            }

            // Update record status
            blockchainRecord.metadata.status = 'revoked';
            blockchainRecord.metadata.revokedAt = new Date().toISOString();

            // Add to audit trail
            blockchainRecord.auditTrail.push({
                action: 'REVOKED',
                timestamp: new Date().toISOString(),
                patientId: patientId,
                details: 'Access to medical record revoked by patient'
            });

            // Store updated record
            await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(blockchainRecord)));

            // Emit revocation event
            ctx.stub.setEvent('MedicalDataRevoked', Buffer.from(JSON.stringify({
                recordId: recordId,
                patientId: patientId,
                timestamp: new Date().toISOString()
            })));

            return JSON.stringify({
                success: true,
                recordId: recordId,
                message: 'Record access revoked successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to revoke record access: ${error.message}`);
        }
    }

    /**
     * Get audit trail for a record
     * @param {Object} ctx - Transaction context
     * @param {string} recordId - Record identifier
     * @param {string} requesterId - ID of entity requesting audit trail
     */
    async getRecordAuditTrail(ctx, recordId, requesterId) {
        try {
            // Validate inputs
            if (!recordId || !requesterId) {
                throw new Error('Missing required parameters');
            }

            // Get record
            const recordBuffer = await ctx.stub.getState(recordId);
            if (!recordBuffer || recordBuffer.length === 0) {
                throw new Error(`Medical record ${recordId} not found`);
            }

            const blockchainRecord = JSON.parse(recordBuffer.toString());

            // Verify access (patient or provider can view audit trail)
            if (blockchainRecord.patientId !== requesterId &&
                blockchainRecord.providerId !== requesterId) {
                throw new Error('Access denied: Insufficient permissions for audit trail');
            }

            return JSON.stringify({
                success: true,
                recordId: recordId,
                auditTrail: blockchainRecord.auditTrail,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to retrieve audit trail: ${error.message}`);
        }
    }

    /**
     * Private method to verify access permissions
     * @param {Object} ctx - Transaction context
     * @param {string} recordId - Record identifier
     * @param {string} requesterId - ID of entity requesting access
     * @param {string} accessToken - Access token
     */
    async _verifyAccess(ctx, recordId, requesterId, accessToken) {
        try {
            // Get record
            const recordBuffer = await ctx.stub.getState(recordId);
            if (!recordBuffer || recordBuffer.length === 0) {
                return false;
            }

            const blockchainRecord = JSON.parse(recordBuffer.toString());

            // Check if record is revoked
            if (blockchainRecord.metadata.status === 'revoked') {
                return false;
            }

            // Patient always has access to their own data
            if (blockchainRecord.patientId === requesterId) {
                return true;
            }

            // Original provider has access
            if (blockchainRecord.providerId === requesterId) {
                return true;
            }

            // For other requesters, verify access token
            // This would integrate with your access control system
            // For now, we'll do basic token validation
            if (accessToken && accessToken.length > 0) {
                // Implement your token validation logic here
                return true;
            }

            return false;
        } catch (error) {
            console.error('Access verification failed:', error);
            return false;
        }
    }
}

module.exports = EncryptionContract;