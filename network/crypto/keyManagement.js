/**
 * Key Management System for Medical Data
 * Handles key rotation, recovery, and lifecycle management
 * Compliant with HIPAA security requirements
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const MedicalDataEncryption = require('./encryption');

class MedicalKeyManager {
    constructor() {
        this.encryptor = new MedicalDataEncryption();
        this.keyStore = new Map(); // In-memory key store
        this.keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        this.maxKeyAge = 90 * 24 * 60 * 60 * 1000; // 90 days maximum key age
        this.keyBackupPath = process.env.KEY_BACKUP_PATH || './keys/backup';
    }

    /**
     * Initialize key management system
     */
    async initialize() {
        try {
            // Ensure backup directory exists
            await this.ensureDirectoryExists(this.keyBackupPath);
            
            // Load existing keys from secure storage
            await this.loadExistingKeys();
            
            // Start automatic key rotation scheduler
            this.startKeyRotationScheduler();
            
            console.log('Medical Key Manager initialized successfully');
            return true;
        } catch (error) {
            throw new Error(`Key manager initialization failed: ${error.message}`);
        }
    }

    /**
     * Generate new encryption key for a healthcare provider
     */
    async generateProviderKey(providerId, keyType = 'AES') {
        try {
            let keyData;
            
            if (keyType === 'AES') {
                keyData = this.encryptor.generateAESKey();
            } else if (keyType === 'RSA') {
                keyData = this.encryptor.generateRSAKeyPair();
            } else {
                throw new Error(`Unsupported key type: ${keyType}`);
            }

            const keyRecord = {
                keyId: this.generateKeyId(),
                providerId: providerId,
                keyType: keyType,
                keyData: keyData,
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString(),
                status: 'active',
                rotationSchedule: new Date(Date.now() + this.keyRotationInterval).toISOString(),
                usage: {
                    encryptionCount: 0,
                    decryptionCount: 0,
                    lastOperation: null
                },
                version: 1
            };

            // Store in memory
            this.keyStore.set(keyRecord.keyId, keyRecord);
            
            // Backup to secure storage
            await this.backupKey(keyRecord);
            
            return {
                keyId: keyRecord.keyId,
                keyType: keyType,
                status: 'active',
                createdAt: keyRecord.createdAt,
                rotationSchedule: keyRecord.rotationSchedule
            };
        } catch (error) {
            throw new Error(`Provider key generation failed: ${error.message}`);
        }
    }

    /**
     * Generate RSA key pair for a specific user/provider
     */
    async generateRSAKeyPair(ownerId, keySize = 2048) {
        try {
            const keyId = this.generateKeyId();
            const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: keySize,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            });

            const privateKeyHash = crypto.createHash('sha256')
                .update(privateKey)
                .digest('hex');

            const keyRecord = {
                keyId,
                keyType: 'RSA',
                ownerId,
                keyData: {
                    publicKey,
                    privateKey,
                    privateKeyHash,
                    keySize
                },
                status: 'active',
                createdAt: new Date().toISOString(),
                lastUsed: null,
                usage: {
                    encryptionCount: 0,
                    decryptionCount: 0,
                    lastOperation: null
                }
            };

            this.keyStore.set(keyId, keyRecord);
            await this.backupKey(keyRecord);

            return {
                keyId,
                publicKey,
                privateKey,
                privateKeyHash,
                keySize,
                algorithm: 'RSA-OAEP',
                ownerId,
                createdAt: keyRecord.createdAt
            };
        } catch (error) {
            throw new Error(`RSA key pair generation failed: ${error.message}`);
        }
    }

    /**
     * Generate and store symmetric key material
     */
    async generateSymmetricKey(keyId = null, options = {}) {
        try {
            const actualKeyId = keyId || this.generateKeyId();
            const rawKey = crypto.randomBytes(32);
            const encryptedKey = rawKey.toString('base64');
            const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

            const keyRecord = {
                keyId: actualKeyId,
                keyType: 'SYMMETRIC',
                owner: options.owner || 'unknown',
                purpose: options.purpose || 'general',
                provider: options.provider || null,
                keyData: {
                    rawKey: rawKey.toString('hex'),
                    encryptedKey,
                    keyHash
                },
                createdAt: new Date().toISOString(),
                status: 'active',
                version: 1,
                metadata: options
            };

            this.keyStore.set(actualKeyId, keyRecord);
            await this.backupKey(keyRecord);

            return {
                keyId: actualKeyId,
                encryptedKey,
                keyHash,
                algorithm: 'AES-256',
                createdAt: keyRecord.createdAt,
                metadata: options
            };
        } catch (error) {
            throw new Error(`Symmetric key generation failed: ${error.message}`);
        }
    }

    /**
     * Rotate symmetric key and return the new material
     */
    async rotateSymmetricKey(keyId, previousEncryptedKey = null) {
        try {
            const keyRecord = this.keyStore.get(keyId);
            if (!keyRecord || keyRecord.keyType !== 'SYMMETRIC') {
                throw new Error('Symmetric key not found');
            }

            const newKey = crypto.randomBytes(32);
            const encryptedKey = newKey.toString('base64');
            const keyHash = crypto.createHash('sha256').update(newKey).digest('hex');

            keyRecord.keyData = {
                rawKey: newKey.toString('hex'),
                encryptedKey,
                keyHash,
                previousKeySnapshot: previousEncryptedKey || keyRecord.keyData.encryptedKey
            };
            keyRecord.version += 1;
            keyRecord.rotatedAt = new Date().toISOString();

            this.keyStore.set(keyId, keyRecord);
            await this.backupKey(keyRecord);

            return {
                keyId,
                encryptedKey,
                keyHash,
                rotatedAt: keyRecord.rotatedAt,
                version: keyRecord.version
            };
        } catch (error) {
            throw new Error(`Symmetric key rotation failed: ${error.message}`);
        }
    }

    /**
     * Rotate encryption key for a provider
     */
    async rotateProviderKey(providerId, oldKeyId) {
        try {
            const oldKeyRecord = this.keyStore.get(oldKeyId);
            if (!oldKeyRecord) {
                throw new Error('Old key not found');
            }

            if (oldKeyRecord.providerId !== providerId) {
                throw new Error('Provider ID mismatch');
            }

            // Generate new key
            const newKeyInfo = await this.generateProviderKey(providerId, oldKeyRecord.keyType);
            
            // Mark old key as deprecated (don't delete immediately for recovery)
            oldKeyRecord.status = 'deprecated';
            oldKeyRecord.deprecatedAt = new Date().toISOString();
            oldKeyRecord.replacedBy = newKeyInfo.keyId;
            
            // Schedule old key for deletion after grace period
            setTimeout(() => {
                this.scheduleKeyDeletion(oldKeyId);
            }, 7 * 24 * 60 * 60 * 1000); // 7 days grace period
            
            await this.backupKey(oldKeyRecord);
            
            return {
                oldKeyId: oldKeyId,
                newKeyId: newKeyInfo.keyId,
                rotatedAt: new Date().toISOString(),
                status: 'rotation_complete'
            };
        } catch (error) {
            throw new Error(`Key rotation failed: ${error.message}`);
        }
    }

    /**
     * Get active key for a provider
     */
    getProviderKey(providerId, keyId = null) {
        try {
            if (keyId) {
                const keyRecord = this.keyStore.get(keyId);
                if (!keyRecord || keyRecord.providerId !== providerId) {
                    throw new Error('Key not found or access denied');
                }
                
                // Update usage statistics
                keyRecord.lastUsed = new Date().toISOString();
                keyRecord.usage.lastOperation = 'retrieve';
                
                return {
                    keyId: keyRecord.keyId,
                    keyData: keyRecord.keyData,
                    keyType: keyRecord.keyType,
                    status: keyRecord.status
                };
            }

            // Find the most recent active key for this provider
            let latestKey = null;
            let latestTimestamp = 0;

            for (const [id, record] of this.keyStore.entries()) {
                if (record.providerId === providerId && record.status === 'active') {
                    const timestamp = new Date(record.createdAt).getTime();
                    if (timestamp > latestTimestamp) {
                        latestTimestamp = timestamp;
                        latestKey = record;
                    }
                }
            }

            if (!latestKey) {
                throw new Error('No active key found for provider');
            }

            // Update usage statistics
            latestKey.lastUsed = new Date().toISOString();
            latestKey.usage.lastOperation = 'retrieve';

            return {
                keyId: latestKey.keyId,
                keyData: latestKey.keyData,
                keyType: latestKey.keyType,
                status: latestKey.status
            };
        } catch (error) {
            throw new Error(`Key retrieval failed: ${error.message}`);
        }
    }

    /**
     * Record key usage for audit and rotation purposes
     */
    recordKeyUsage(keyId, operation) {
        try {
            const keyRecord = this.keyStore.get(keyId);
            if (!keyRecord) {
                throw new Error('Key not found');
            }

            keyRecord.lastUsed = new Date().toISOString();
            keyRecord.usage.lastOperation = operation;
            
            if (operation === 'encrypt') {
                keyRecord.usage.encryptionCount++;
            } else if (operation === 'decrypt') {
                keyRecord.usage.decryptionCount++;
            }

            // Check if key needs rotation based on usage or age
            this.checkKeyRotationNeeds(keyRecord);
            
            return true;
        } catch (error) {
            console.error(`Key usage recording failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Emergency key recovery system
     */
    async emergencyKeyRecovery(providerId, recoveryCode) {
        try {
            // In a real system, this would involve secure multi-party recovery
            // For now, we'll implement a simplified version
            
            const recoveryHash = crypto.createHash('sha256')
                .update(providerId + recoveryCode + process.env.MASTER_RECOVERY_SALT)
                .digest('hex');
            
            // Find all keys for this provider
            const providerKeys = [];
            for (const [keyId, record] of this.keyStore.entries()) {
                if (record.providerId === providerId) {
                    providerKeys.push({
                        keyId: keyId,
                        keyType: record.keyType,
                        status: record.status,
                        createdAt: record.createdAt
                    });
                }
            }

            if (providerKeys.length === 0) {
                throw new Error('No keys found for provider');
            }

            // Log emergency access
            console.log(`Emergency key recovery initiated for provider: ${providerId}`);
            
            return {
                providerId: providerId,
                availableKeys: providerKeys,
                recoveryTimestamp: new Date().toISOString(),
                recoveryHash: recoveryHash.substring(0, 8) // Only show partial hash for security
            };
        } catch (error) {
            throw new Error(`Emergency key recovery failed: ${error.message}`);
        }
    }

    /**
     * Generate master recovery keys for the system
     */
    generateMasterRecoveryKeys() {
        try {
            const masterKeys = {
                primary: crypto.randomBytes(32).toString('hex'),
                secondary: crypto.randomBytes(32).toString('hex'),
                emergency: crypto.randomBytes(32).toString('hex'),
                timestamp: new Date().toISOString(),
                version: '1.0'
            };

            // In production, these should be stored in a Hardware Security Module (HSM)
            return masterKeys;
        } catch (error) {
            throw new Error(`Master key generation failed: ${error.message}`);
        }
    }

    /**
     * Check if any keys need rotation
     */
    checkKeyRotationNeeds(keyRecord) {
        try {
            const now = Date.now();
            const keyAge = now - new Date(keyRecord.createdAt).getTime();
            const rotationDue = new Date(keyRecord.rotationSchedule).getTime();

            if (now >= rotationDue || keyAge >= this.maxKeyAge) {
                console.log(`Key ${keyRecord.keyId} requires rotation`);
                // In a production system, this would trigger an automated rotation workflow
                this.scheduleKeyRotation(keyRecord.keyId);
            }

            // Check usage-based rotation (high-frequency usage)
            const totalUsage = keyRecord.usage.encryptionCount + keyRecord.usage.decryptionCount;
            if (totalUsage > 10000) { // Rotate after 10k operations
                console.log(`Key ${keyRecord.keyId} requires rotation due to high usage`);
                this.scheduleKeyRotation(keyRecord.keyId);
            }
        } catch (error) {
            console.error(`Key rotation check failed: ${error.message}`);
        }
    }

    /**
     * Start automatic key rotation scheduler
     */
    startKeyRotationScheduler() {
        setInterval(() => {
            for (const [keyId, keyRecord] of this.keyStore.entries()) {
                if (keyRecord.status === 'active') {
                    this.checkKeyRotationNeeds(keyRecord);
                }
            }
        }, 24 * 60 * 60 * 1000); // Check daily
    }

    /**
     * Schedule key for rotation
     */
    scheduleKeyRotation(keyId) {
        console.log(`Scheduling rotation for key: ${keyId}`);
        // In production, this would add to a job queue
    }

    /**
     * Schedule key for deletion
     */
    scheduleKeyDeletion(keyId) {
        console.log(`Scheduling deletion for deprecated key: ${keyId}`);
        // In production, this would securely delete the key after backup retention
    }

    /**
     * Generate unique key ID
     */
    generateKeyId() {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(8).toString('hex');
        return `med_key_${timestamp}_${random}`;
    }

    /**
     * Backup key to secure storage
     */
    async backupKey(keyRecord) {
        try {
            const backupData = {
                ...keyRecord,
                backupTimestamp: new Date().toISOString()
            };

            const filename = `${keyRecord.keyId}_backup.json`;
            const filepath = path.join(this.keyBackupPath, filename);
            
            // Encrypt the backup data
            const masterBackupKey = process.env.MASTER_BACKUP_KEY || 'default_backup_key_change_in_production';
            const masterKeyBuffer = crypto.createHash('sha256').update(masterBackupKey).digest();
            const encryptedBackup = this.encryptor.encryptMedicalData(
                JSON.stringify(backupData),
                masterKeyBuffer,
                keyRecord.providerId || keyRecord.ownerId || 'system'
            );

            await fs.writeFile(filepath, JSON.stringify(encryptedBackup, null, 2));
            
            return true;
        } catch (error) {
            console.error(`Key backup failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Load existing keys from storage
     */
    async loadExistingKeys() {
        try {
            // In production, this would load from secure database
            // For now, we'll load from backup files if they exist
            
            const files = await fs.readdir(this.keyBackupPath).catch(() => []);
            
            for (const file of files) {
                if (file.endsWith('_backup.json')) {
                    try {
                        const filepath = path.join(this.keyBackupPath, file);
                        const encryptedData = await fs.readFile(filepath, 'utf8');
                        
                        // In production, decrypt and load the key
                        console.log(`Found backup key file: ${file}`);
                    } catch (error) {
                        console.error(`Failed to load backup key ${file}: ${error.message}`);
                    }
                }
            }
        } catch (error) {
            console.error(`Loading existing keys failed: ${error.message}`);
        }
    }

    /**
     * Ensure directory exists
     */
    async ensureDirectoryExists(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Get key management statistics
     */
    getKeyStats() {
        const stats = {
            totalKeys: this.keyStore.size,
            activeKeys: 0,
            deprecatedKeys: 0,
            keysByProvider: new Map(),
            keysByType: new Map()
        };

        for (const [keyId, record] of this.keyStore.entries()) {
            // Status counts
            if (record.status === 'active') stats.activeKeys++;
            if (record.status === 'deprecated') stats.deprecatedKeys++;
            
            // Provider counts
            const providerCount = stats.keysByProvider.get(record.providerId) || 0;
            stats.keysByProvider.set(record.providerId, providerCount + 1);
            
            // Type counts
            const typeCount = stats.keysByType.get(record.keyType) || 0;
            stats.keysByType.set(record.keyType, typeCount + 1);
        }

        return {
            ...stats,
            keysByProvider: Object.fromEntries(stats.keysByProvider),
            keysByType: Object.fromEntries(stats.keysByType),
            generatedAt: new Date().toISOString()
        };
    }
}

module.exports = MedicalKeyManager;