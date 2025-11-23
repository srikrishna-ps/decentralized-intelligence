/**
 * Core Encryption Module for Decentralized Medical Contracts
 * Implements AES-256 encryption, RSA key pairs, and data protection
 * Author: Medical Blockchain Team
 * Date: 2025
 */

const CryptoJS = require('crypto-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.crypto' });

class MedicalDataEncryption {
    constructor() {
        this.aesKeySize = 256; // AES-256
        this.rsaKeySize = 2048; // RSA-2048
    }

    /**
     * Generate AES-256 symmetric key
     * Used for encrypting large medical data files
     */
    generateAESKey() {
        try {
            const key = CryptoJS.lib.WordArray.random(32); // 256 bits
            return {
                key: key.toString(CryptoJS.enc.Hex),
                timestamp: new Date().toISOString(),
                algorithm: 'AES-256-GCM'
            };
        } catch (error) {
            throw new Error(`AES key generation failed: ${error.message}`);
        }
    }

    /**
     * Encrypt data using Node crypto AES-256-GCM
     * @param {string} data - plaintext string
     * @param {Buffer|Uint8Array} key - 32-byte key
     * @returns {{encryptedData:string, iv:string, tag:string}}
     */
    encryptData(data, key) {
        if (typeof data !== 'string' || !key || key.length !== 32) {
            throw new Error('Invalid encryption parameters');
        }

        const iv = crypto.randomBytes(12); // 96-bit IV for GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), iv);
        const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();

        return {
            encryptedData: encrypted.toString('base64'),
            iv: iv.toString('hex'),
            tag: tag.toString('hex')
        };
    }

    /**
     * Decrypt data using Node crypto AES-256-GCM
     * @param {string} encryptedData - base64 ciphertext
     * @param {Buffer|Uint8Array} key - 32-byte key
     * @param {string} ivHex - hex IV
     * @param {string} tagHex - hex auth tag
     * @returns {string}
     */
    decryptData(encryptedData, key, ivHex, tagHex) {
        if (!key) {
            throw new Error('Invalid decryption parameters: key');
        }
        const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(key);
        if (keyBuf.length !== 32) {
            throw new Error('Invalid decryption parameters: key');
        }
        if (typeof ivHex !== 'string' || typeof tagHex !== 'string') {
            throw new Error('Invalid decryption parameters: iv/tag');
        }

        try {
            const iv = Buffer.from(ivHex, 'hex');
            const tag = Buffer.from(tagHex, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
            decipher.setAuthTag(tag);
            const decrypted = Buffer.concat([
                decipher.update(Buffer.from(encryptedData || '', 'base64')),
                decipher.final()
            ]);
            return decrypted.toString('utf8');
        } catch (error) {
            throw new Error(`decrypt failed: ${error.message}`);
        }
    }

    /**
     * RSA encrypt string with a PEM public key
     * @param {string} data
     * @param {string} publicKeyPem
     * @returns {string} base64
     */
    rsaEncrypt(data, publicKeyPem) {
        const encrypted = crypto.publicEncrypt(
            {
                key: publicKeyPem,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            },
            Buffer.from(data, 'utf8')
        );
        return encrypted.toString('base64');
    }

    /**
     * RSA decrypt base64 with a PEM private key
     * @param {string} encryptedBase64
     * @param {string} privateKeyPem
     * @returns {string}
     */
    rsaDecrypt(encryptedBase64, privateKeyPem) {
        const decrypted = crypto.privateDecrypt(
            {
                key: privateKeyPem,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            },
            Buffer.from(encryptedBase64, 'base64')
        );
        return decrypted.toString('utf8');
    }

    /**
     * Encrypt sensitive medical data using AES-256-GCM
     * @param {string} data - The medical data to encrypt
     * @param {string} key - AES key in hex format
     * @param {string} patientId - Patient identifier for additional entropy
     */
    encryptMedicalData(data, key, patientId = '') {
        try {
            if (typeof data !== 'string') {
                data = JSON.stringify(data);
            }

            const keyBuffer = Buffer.isBuffer(key)
                ? key
                : Buffer.from(key, /^[0-9a-fA-F]+$/.test(key || '') ? 'hex' : 'utf8');

            if (keyBuffer.length !== 32) {
                throw new Error('Invalid AES key length');
            }

            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
            if (patientId) {
                cipher.setAAD(Buffer.from(String(patientId), 'utf8'));
            }

            const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
            const authTag = cipher.getAuthTag();

            return {
                encryptedData: encrypted.toString('base64'),
                iv: iv.toString('hex'),
                tag: authTag.toString('hex'),
                algorithm: 'AES-256-GCM',
                timestamp: new Date().toISOString(),
                patientId: patientId || null,
                dataLength: Buffer.byteLength(data, 'utf8')
            };
        } catch (error) {
            throw new Error(`Medical data encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt medical data using AES-256-GCM
     * @param {Object} encryptedPackage - Package containing encrypted data and metadata
     * @param {string} key - AES key in hex format
     */
    decryptMedicalData(encryptedPackage, key) {
        try {
            if (!encryptedPackage || !encryptedPackage.encryptedData) {
                throw new Error('Invalid encrypted package');
            }

            const keyBuffer = Buffer.isBuffer(key)
                ? key
                : Buffer.from(key, /^[0-9a-fA-F]+$/.test(key || '') ? 'hex' : 'utf8');

            if (keyBuffer.length !== 32) {
                throw new Error('Invalid AES key length');
            }

            const iv = Buffer.from(encryptedPackage.iv, 'hex');
            const tag = Buffer.from(encryptedPackage.tag || encryptedPackage.authTag || '', 'hex');
            const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);

            if (encryptedPackage.patientId) {
                decipher.setAAD(Buffer.from(String(encryptedPackage.patientId), 'utf8'));
            }

            if (tag.length) {
                decipher.setAuthTag(tag);
            }

            const decrypted = Buffer.concat([
                decipher.update(Buffer.from(encryptedPackage.encryptedData, 'base64')),
                decipher.final()
            ]);

            return {
                data: decrypted.toString('utf8'),
                verified: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Medical data decryption failed: ${error.message}`);
        }
    }

    /**
     * Generate RSA key pair for asymmetric encryption
     * Used for secure key exchange between healthcare providers
     */
    generateRSAKeyPair() {
        try {
            const keyPair = crypto.generateKeyPairSync('rsa', {
                modulusLength: this.rsaKeySize,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });

            return {
                publicKey: keyPair.publicKey,
                privateKey: keyPair.privateKey,
                keySize: this.rsaKeySize,
                algorithm: 'RSA-OAEP',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`RSA key pair generation failed: ${error.message}`);
        }
    }

    /**
     * Encrypt AES key using RSA public key
     * Used for secure key distribution
     */
    encryptAESKeyWithRSA(aesKey, rsaPublicKey) {
        try {
            const encrypted = crypto.publicEncrypt(
                {
                    key: rsaPublicKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                Buffer.from(aesKey, 'hex')
            );

            return {
                encryptedKey: encrypted.toString('base64'),
                algorithm: 'RSA-OAEP-SHA256',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`AES key RSA encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt AES key using RSA private key
     */
    decryptAESKeyWithRSA(encryptedKeyPackage, rsaPrivateKey) {
        try {
            const decrypted = crypto.privateDecrypt(
                {
                    key: rsaPrivateKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                Buffer.from(encryptedKeyPackage.encryptedKey, 'base64')
            );

            return {
                aesKey: decrypted.toString('hex'),
                verified: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`AES key RSA decryption failed: ${error.message}`);
        }
    }

    /**
     * Mask PII (Personally Identifiable Information) in medical data
     * Replaces sensitive information with masked values for logging/display
     */
    maskPII(medicalData) {
        try {
            if (!medicalData || typeof medicalData !== 'object') {
                return medicalData;
            }

            let maskedData = JSON.stringify(medicalData, null, 2);

            const piiPatterns = [
                { pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g, replacement: 'XXX-XX-XXXX' },
                { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: 'XXX-XXX-XXXX' },
                { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '***@***.***' },
                { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: 'XXXX-XXXX-XXXX-XXXX' }
            ];

            piiPatterns.forEach(({ pattern, replacement }) => {
                maskedData = maskedData.replace(pattern, replacement);
            });

            const nameFields = ['name', 'firstName', 'lastName', 'patientName', 'doctorName', 'physicianName'];
            nameFields.forEach(field => {
                const namePattern = new RegExp(`("${field}"\\s*:\\s*)"([^"]+)"`, 'gi');
                maskedData = maskedData.replace(namePattern, `$1"REDACTED"`);
            });

            const parsed = JSON.parse(maskedData);
            return parsed;
        } catch (error) {
            throw new Error(`PII masking failed: ${error.message}`);
        }
    }

    /**
     * Generate secure random salt for password hashing
     */
    generateSalt(length = 32) {
        try {
            return crypto.randomBytes(length).toString('hex');
        } catch (error) {
            throw new Error(`Salt generation failed: ${error.message}`);
        }
    }

    /**
     * Create encrypted backup of sensitive data
     * Used for disaster recovery
     */
    createEncryptedBackup(dataArray, masterKey) {
        try {
            const backup = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                dataCount: dataArray.length,
                encryptedItems: []
            };

            dataArray.forEach((item, index) => {
                const itemKey = this.generateAESKey();
                const encryptedItem = this.encryptMedicalData(
                    JSON.stringify(item),
                    itemKey.key,
                    `backup_item_${index}`
                );

                // Encrypt the item key with master key
                const encryptedKey = this.encryptMedicalData(
                    itemKey.key,
                    masterKey,
                    `backup_key_${index}`
                );

                backup.encryptedItems.push({
                    id: index,
                    data: encryptedItem,
                    key: encryptedKey
                });
            });

            return backup;
        } catch (error) {
            throw new Error(`Encrypted backup creation failed: ${error.message}`);
        }
    }

    /**
     * Restore data from encrypted backup
     */
    restoreFromEncryptedBackup(backup, masterKey) {
        try {
            const restoredData = [];

            backup.encryptedItems.forEach(item => {
                // Decrypt the item key
                const decryptedKey = this.decryptMedicalData(item.key, masterKey);

                // Decrypt the actual data
                const decryptedData = this.decryptMedicalData(item.data, decryptedKey.data);

                restoredData.push(JSON.parse(decryptedData.data));
            });

            return {
                data: restoredData,
                version: backup.version,
                originalTimestamp: backup.timestamp,
                restoredTimestamp: new Date().toISOString(),
                itemCount: restoredData.length
            };
        } catch (error) {
            throw new Error(`Backup restoration failed: ${error.message}`);
        }
    }
}

module.exports = MedicalDataEncryption;