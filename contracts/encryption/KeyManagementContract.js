/**
 * Hyperledger Fabric Smart Contract for Key Management
 * Manages encryption keys, key rotation, and access control
 * Provides secure key storage and retrieval for medical data encryption
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const KeyManager = require('../network/crypto/keyManagement');
const crypto = require('crypto');

class KeyManagementContract extends Contract {
    constructor() {
        super('KeyManagementContract');
        this.keyManager = null;
    }

    /**
     * Initialize the key management contract
     */
    async initLedger(ctx) {
        try {
            // Initialize key manager
            this.keyManager = new KeyManager({
                keySize: 256,
                keyType: 'AES',
                rotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
                complianceLevel: 'HIPAA'
            });

            await this.keyManager.initialize();

            // Create master key registry
            const masterRegistry = {
                contractName: 'KeyManagementContract',
                version: '1.0',
                initializedAt: new Date().toISOString(),
                totalKeys: 0,
                activeKeys: 0,
                rotatedKeys: 0,
                revokedKeys: 0
            };

            await ctx.stub.putState('MASTER_KEY_REGISTRY', Buffer.from(JSON.stringify(masterRegistry)));

            return JSON.stringify({
                success: true,
                message: 'Key management contract initialized successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Key management initialization failed: ${error.message}`);
        }
    }

    /**
     * Generate RSA key pair for a user
     * @param {Object} ctx - Transaction context
     * @param {string} userId - User identifier
     * @param {string} userType - Type of user (patient, provider, admin)
     * @param {number} keySize - RSA key size (default 2048)
     */
    async generateRSAKeyPair(ctx, userId, userType, keySize = 2048) {
        try {
            // Validate inputs
            if (!userId || !userType) {
                throw new Error('Missing required parameters');
            }

            // Check if user already has keys
            const existingKeys = await ctx.stub.getState(`RSA_KEYS_${userId}`);
            if (existingKeys && existingKeys.length > 0) {
                throw new Error(`RSA key pair already exists for user ${userId}`);
            }

            // Generate RSA key pair
            const keyPair = await this.keyManager.generateRSAKeyPair(userId, parseInt(keySize));

            // Create key record
            const keyRecord = {
                userId: userId,
                userType: userType,
                keyId: keyPair.keyId,
                publicKey: keyPair.publicKey,
                privateKeyHash: keyPair.privateKeyHash, // Only hash, not actual private key
                keySize: parseInt(keySize),
                createdAt: new Date().toISOString(),
                status: 'active',
                usage: {
                    encryptionCount: 0,
                    decryptionCount: 0,
                    lastUsed: null
                },
                metadata: {
                    algorithm: 'RSA',
                    purpose: 'data_encryption',
                    complianceLevel: 'HIPAA'
                }
            };

            // Store key record on blockchain
            await ctx.stub.putState(`RSA_KEYS_${userId}`, Buffer.from(JSON.stringify(keyRecord)));

            // Create user index
            const userIndexKey = ctx.stub.createCompositeKey('user-keys', [userType, userId]);
            await ctx.stub.putState(userIndexKey, Buffer.from(`RSA_KEYS_${userId}`));

            // Update master registry
            await this._updateMasterRegistry(ctx, 'KEY_GENERATED');

            // Emit key generation event
            ctx.stub.setEvent('RSAKeyPairGenerated', Buffer.from(JSON.stringify({
                userId: userId,
                keyId: keyPair.keyId,
                userType: userType,
                timestamp: new Date().toISOString()
            })));

            return JSON.stringify({
                success: true,
                userId: userId,
                keyId: keyPair.keyId,
                publicKey: keyPair.publicKey,
                message: 'RSA key pair generated successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to generate RSA key pair: ${error.message}`);
        }
    }

    /**
     * Generate symmetric encryption key for data protection
     * @param {Object} ctx - Transaction context
     * @param {string} dataOwnerId - Owner of the data (patient ID)
     * @param {string} purpose - Purpose of the key (medical_record, communication, etc.)
     * @param {string} providerId - Healthcare provider ID
     */
    async generateSymmetricKey(ctx, dataOwnerId, purpose, providerId) {
        try {
            // Validate inputs
            if (!dataOwnerId || !purpose || !providerId) {
                throw new Error('Missing required parameters');
            }

            // Generate unique key ID
            const keyId = `SYM_${dataOwnerId}_${purpose}_${Date.now()}`;

            // Generate symmetric key
            const symmetricKey = await this.keyManager.generateSymmetricKey(keyId, {
                owner: dataOwnerId,
                purpose: purpose,
                provider: providerId
            });

            // Create key record (store encrypted key, not plaintext)
            const keyRecord = {
                keyId: keyId,
                dataOwnerId: dataOwnerId,
                providerId: providerId,
                purpose: purpose,
                encryptedKey: symmetricKey.encryptedKey,
                keyHash: symmetricKey.keyHash,
                algorithm: 'AES-256-GCM',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                status: 'active',
                rotationHistory: [],
                usage: {
                    encryptionCount: 0,
                    decryptionCount: 0,
                    lastUsed: null
                }
            };

            // Store key record
            await ctx.stub.putState(keyId, Buffer.from(JSON.stringify(keyRecord)));

            // Create owner index
            const ownerIndexKey = ctx.stub.createCompositeKey('owner-keys', [dataOwnerId, keyId]);
            await ctx.stub.putState(ownerIndexKey, Buffer.from(keyId));

            // Create provider index
            const providerIndexKey = ctx.stub.createCompositeKey('provider-keys', [providerId, keyId]);
            await ctx.stub.putState(providerIndexKey, Buffer.from(keyId));

            // Update master registry
            await this._updateMasterRegistry(ctx, 'KEY_GENERATED');

            // Emit key generation event
            ctx.stub.setEvent('SymmetricKeyGenerated', Buffer.from(JSON.stringify({
                keyId: keyId,
                dataOwnerId: dataOwnerId,
                providerId: providerId,
                purpose: purpose,
                timestamp: new Date().toISOString()
            })));

            return JSON.stringify({
                success: true,
                keyId: keyId,
                keyHash: symmetricKey.keyHash,
                expiresAt: keyRecord.expiresAt,
                message: 'Symmetric key generated successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to generate symmetric key: ${error.message}`);
        }
    }

    /**
     * Rotate an existing symmetric key
     * @param {Object} ctx - Transaction context
     * @param {string} keyId - Key identifier to rotate
     * @param {string} requesterId - ID of entity requesting rotation
     */
    async rotateSymmetricKey(ctx, keyId, requesterId) {
        try {
            // Validate inputs
            if (!keyId || !requesterId) {
                throw new Error('Missing required parameters');
            }

            // Get existing key record
            const keyBuffer = await ctx.stub.getState(keyId);
            if (!keyBuffer || keyBuffer.length === 0) {
                throw new Error(`Key ${keyId} not found`);
            }

            const keyRecord = JSON.parse(keyBuffer.toString());

            // Verify permissions (data owner or provider can rotate)
            if (keyRecord.dataOwnerId !== requesterId && keyRecord.providerId !== requesterId) {
                throw new Error('Access denied: Insufficient permissions to rotate key');
            }

            // Check if key is active
            if (keyRecord.status !== 'active') {
                throw new Error(`Cannot rotate key with status: ${keyRecord.status}`);
            }

            // Generate new key
            const newKey = await this.keyManager.rotateSymmetricKey(keyId, keyRecord.encryptedKey);

            // Update key record
            keyRecord.rotationHistory.push({
                oldKeyHash: keyRecord.keyHash,
                rotatedAt: new Date().toISOString(),
                rotatedBy: requesterId,
                reason: 'scheduled_rotation'
            });

            keyRecord.encryptedKey = newKey.encryptedKey;
            keyRecord.keyHash = newKey.keyHash;
            keyRecord.rotatedAt = new Date().toISOString();
            keyRecord.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            // Store updated record
            await ctx.stub.putState(keyId, Buffer.from(JSON.stringify(keyRecord)));

            // Update master registry
            await this._updateMasterRegistry(ctx, 'KEY_ROTATED');

            // Emit rotation event
            ctx.stub.setEvent('SymmetricKeyRotated', Buffer.from(JSON.stringify({
                keyId: keyId,
                dataOwnerId: keyRecord.dataOwnerId,
                providerId: keyRecord.providerId,
                rotatedBy: requesterId,
                timestamp: new Date().toISOString()
            })));

            return JSON.stringify({
                success: true,
                keyId: keyId,
                newKeyHash: newKey.keyHash,
                expiresAt: keyRecord.expiresAt,
                message: 'Key rotated successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to rotate key: ${error.message}`);
        }
    }

    /**
     * Revoke a key
     * @param {Object} ctx - Transaction context
     * @param {string} keyId - Key identifier to revoke
     * @param {string} requesterId - ID of entity requesting revocation
     * @param {string} reason - Reason for revocation
     */
    async revokeKey(ctx, keyId, requesterId, reason) {
        try {
            // Validate inputs
            if (!keyId || !requesterId || !reason) {
                throw new Error('Missing required parameters');
            }

            // Get key record
            const keyBuffer = await ctx.stub.getState(keyId);
            if (!keyBuffer || keyBuffer.length === 0) {
                throw new Error(`Key ${keyId} not found`);
            }

            const keyRecord = JSON.parse(keyBuffer.toString());

            // Verify permissions
            if (keyRecord.dataOwnerId !== requesterId && keyRecord.providerId !== requesterId) {
                throw new Error('Access denied: Insufficient permissions to view key info');
            }

            // Return key metadata (no sensitive data)
            const keyInfo = {
                keyId: keyRecord.keyId,
                dataOwnerId: keyRecord.dataOwnerId,
                providerId: keyRecord.providerId,
                purpose: keyRecord.purpose,
                algorithm: keyRecord.algorithm,
                createdAt: keyRecord.createdAt,
                expiresAt: keyRecord.expiresAt,
                status: keyRecord.status,
                usage: keyRecord.usage,
                rotationHistory: keyRecord.rotationHistory.map(h => ({
                    rotatedAt: h.rotatedAt,
                    rotatedBy: h.rotatedBy,
                    reason: h.reason
                }))
            };

            return JSON.stringify({
                success: true,
                keyInfo: keyInfo,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to get key info: ${error.message}`);
        }
    }

    /**
     * Get all keys for a data owner
     * @param {Object} ctx - Transaction context
     * @param {string} dataOwnerId - Data owner identifier
     * @param {string} requesterId - ID of entity requesting keys list
     */
    async getOwnerKeys(ctx, dataOwnerId, requesterId) {
        try {
            // Validate inputs
            if (!dataOwnerId || !requesterId) {
                throw new Error('Missing required parameters');
            }

            // Verify permissions (only data owner can view their keys)
            if (dataOwnerId !== requesterId) {
                throw new Error('Access denied: Can only view own keys');
            }

            // Get owner keys using composite key
            const ownerKeysIterator = await ctx.stub.getStateByPartialCompositeKey(
                'owner-keys',
                [dataOwnerId]
            );

            const ownerKeys = [];
            let result = await ownerKeysIterator.next();

            while (!result.done) {
                const keyId = result.value.value.toString();
                const keyBuffer = await ctx.stub.getState(keyId);

                if (keyBuffer && keyBuffer.length > 0) {
                    const keyRecord = JSON.parse(keyBuffer.toString());

                    ownerKeys.push({
                        keyId: keyRecord.keyId,
                        purpose: keyRecord.purpose,
                        algorithm: keyRecord.algorithm,
                        createdAt: keyRecord.createdAt,
                        expiresAt: keyRecord.expiresAt,
                        status: keyRecord.status,
                        usage: keyRecord.usage
                    });
                }

                result = await ownerKeysIterator.next();
            }

            await ownerKeysIterator.close();

            return JSON.stringify({
                success: true,
                dataOwnerId: dataOwnerId,
                totalKeys: ownerKeys.length,
                keys: ownerKeys,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to get owner keys: ${error.message}`);
        }
    }

    /**
     * Check if keys need rotation based on expiry
     * @param {Object} ctx - Transaction context
     * @param {string} providerId - Provider checking for key rotation
     */
    async checkKeyRotationNeeded(ctx, providerId) {
        try {
            // Validate input
            if (!providerId) {
                throw new Error('Missing provider ID');
            }

            // Get provider keys
            const providerKeysIterator = await ctx.stub.getStateByPartialCompositeKey(
                'provider-keys',
                [providerId]
            );

            const keysNeedingRotation = [];
            const currentTime = new Date();
            let result = await providerKeysIterator.next();

            while (!result.done) {
                const keyId = result.value.value.toString();
                const keyBuffer = await ctx.stub.getState(keyId);

                if (keyBuffer && keyBuffer.length > 0) {
                    const keyRecord = JSON.parse(keyBuffer.toString());

                    // Check if key is active and expires soon (within 7 days)
                    if (keyRecord.status === 'active') {
                        const expiryTime = new Date(keyRecord.expiresAt);
                        const sevenDaysFromNow = new Date(currentTime.getTime() + 7 * 24 * 60 * 60 * 1000);

                        if (expiryTime <= sevenDaysFromNow) {
                            keysNeedingRotation.push({
                                keyId: keyRecord.keyId,
                                dataOwnerId: keyRecord.dataOwnerId,
                                purpose: keyRecord.purpose,
                                expiresAt: keyRecord.expiresAt,
                                daysUntilExpiry: Math.ceil((expiryTime - currentTime) / (24 * 60 * 60 * 1000))
                            });
                        }
                    }
                }

                result = await providerKeysIterator.next();
            }

            await providerKeysIterator.close();

            return JSON.stringify({
                success: true,
                providerId: providerId,
                keysNeedingRotation: keysNeedingRotation.length,
                keys: keysNeedingRotation,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to check key rotation: ${error.message}`);
        }
    }

    /**
     * Get master key registry statistics
     * @param {Object} ctx - Transaction context
     * @param {string} requesterId - ID of entity requesting statistics
     */
    async getKeyStatistics(ctx, requesterId) {
        try {
            // Validate input
            if (!requesterId) {
                throw new Error('Missing requester ID');
            }

            // Only admins can view full statistics
            // For demo purposes, we'll allow any requester
            const registryBuffer = await ctx.stub.getState('MASTER_KEY_REGISTRY');
            if (!registryBuffer || registryBuffer.length === 0) {
                throw new Error('Master registry not found');
            }

            const registry = JSON.parse(registryBuffer.toString());

            return JSON.stringify({
                success: true,
                statistics: {
                    totalKeys: registry.totalKeys,
                    activeKeys: registry.activeKeys,
                    rotatedKeys: registry.rotatedKeys,
                    revokedKeys: registry.revokedKeys,
                    lastUpdated: registry.lastUpdated || registry.initializedAt
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(`Failed to get key statistics: ${error.message}`);
        }
    }

    /**
     * Update usage statistics for a key
     * @param {Object} ctx - Transaction context
     * @param {string} keyId - Key identifier
     * @param {string} operation - Operation type (encrypt/decrypt)
     * @param {string} userId - User performing operation
     */
    async updateKeyUsage(ctx, keyId, operation, userId) {
        try {
            // Validate inputs
            if (!keyId || !operation || !userId) {
                throw new Error('Missing required parameters');
            }

            // Get key record
            const keyBuffer = await ctx.stub.getState(keyId);
            if (!keyBuffer || keyBuffer.length === 0) {
                throw new Error(`Key ${keyId} not found`);
            }

            const keyRecord = JSON.parse(keyBuffer.toString());

            // Update usage statistics
            const currentTime = new Date().toISOString();
            if (operation === 'encrypt') {
                keyRecord.usage.encryptionCount++;
            } else if (operation === 'decrypt') {
                keyRecord.usage.decryptionCount++;
            }
            keyRecord.usage.lastUsed = currentTime;

            // Store updated record
            await ctx.stub.putState(keyId, Buffer.from(JSON.stringify(keyRecord)));

            return JSON.stringify({
                success: true,
                keyId: keyId,
                operation: operation,
                timestamp: currentTime
            });
        } catch (error) {
            throw new Error(`Failed to update key usage: ${error.message}`);
        }
    }

    /**
     * Private method to update master registry
     * @param {Object} ctx - Transaction context
     * @param {string} operation - Operation type
     */
    async _updateMasterRegistry(ctx, operation) {
        try {
            const registryBuffer = await ctx.stub.getState('MASTER_KEY_REGISTRY');
            if (!registryBuffer || registryBuffer.length === 0) {
                return;
            }

            const registry = JSON.parse(registryBuffer.toString());

            switch (operation) {
                case 'KEY_GENERATED':
                    registry.totalKeys++;
                    registry.activeKeys++;
                    break;
                case 'KEY_ROTATED':
                    registry.rotatedKeys++;
                    break;
                case 'KEY_REVOKED':
                    registry.activeKeys--;
                    registry.revokedKeys++;
                    break;
            }

            registry.lastUpdated = new Date().toISOString();

            await ctx.stub.putState('MASTER_KEY_REGISTRY', Buffer.from(JSON.stringify(registry)));
        } catch (error) {
            console.error('Failed to update master registry:', error);
        }
    }
}

module.exports = KeyManagementContract; 