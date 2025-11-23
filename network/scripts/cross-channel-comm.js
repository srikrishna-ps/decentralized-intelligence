/**
 * Cross-Channel Communication Protocol
 * Handles secure data transfer between different medical channels
 */

const { Gateway, Wallets, TxEventHandler, GatewayOptions } = require('fabric-network');
const path = require('path');
const fs = require('fs');

class CrossChannelCommunicator {
    constructor() {
        this.gateway = new Gateway();
        this.wallet = null;
        this.channels = new Map();
    }

    /**
     * Initialize the cross-channel communicator
     */
    async initialize() {
        // Create wallet instance
        const walletPath = path.join(process.cwd(), 'wallet');
        this.wallet = await Wallets.newFileSystemWallet(walletPath);

        // Connection profile
        const ccpPath = path.resolve(__dirname, '..', 'connection-hospital.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Gateway options
        const gatewayOpts = {
            wallet: this.wallet,
            identity: 'hospitalAdmin',
            discovery: { enabled: true, asLocalhost: true }
        };

        // Connect to gateway
        await this.gateway.connect(ccp, gatewayOpts);
        console.log('Cross-channel communicator initialized successfully');
    }

    /**
     * Get network instance for a specific channel
     */
    async getChannelNetwork(channelName) {
        if (!this.channels.has(channelName)) {
            const network = await this.gateway.getNetwork(channelName);
            this.channels.set(channelName, network);
        }
        return this.channels.get(channelName);
    }

    /**
     * Transfer consent data from private channel to insurance channel
     */
    async transferConsentToInsurance(patientId, consentData) {
        try {
            // Get private data channel
            const privateNetwork = await this.getChannelNetwork('private-data-channel');
            const privateContract = privateNetwork.getContract('ConsentManagement');

            // Get insurance channel
            const insuranceNetwork = await this.getChannelNetwork('insurance-channel');
            const insuranceContract = insuranceNetwork.getContract('ConsentManagement');

            // Verify consent exists and is valid
            const consentResult = await privateContract.evaluateTransaction(
                'getConsent', patientId
            );
            const consent = JSON.parse(consentResult.toString());

            if (!consent.isActive || !consent.permissions.includes('INSURANCE_ACCESS')) {
                throw new Error('Invalid or inactive consent for insurance access');
            }

            // Create sanitized consent record for insurance channel
            const sanitizedConsent = {
                patientId: consent.patientId,
                insuranceAccess: true,
                accessLevel: consent.accessLevel,
                expiryDate: consent.expiryDate,
                restrictions: consent.restrictions,
                timestamp: new Date().toISOString()
            };

            // Submit to insurance channel
            await insuranceContract.submitTransaction(
                'createInsuranceConsent',
                JSON.stringify(sanitizedConsent)
            );

            console.log(`Consent transferred successfully for patient: ${patientId}`);
            return true;

        } catch (error) {
            console.error('Cross-channel consent transfer failed:', error);
            throw error;
        }
    }

    /**
     * Sync regulatory compliance data across channels
     */
    async syncRegulatoryCompliance(complianceData) {
        try {
            const channels = ['medical-channel', 'private-data-channel'];
            const promises = [];

            for (const channelName of channels) {
                await this.monitorChannel(channelName);
            }

            this.isMonitoring = true;
            this.logger.info('Blockchain monitoring started', {
                channels: channels
            });

        } catch (error) {
            this.logger.error('Failed to start monitoring:', error);
            throw error;
        }
    }

    /**
     * Monitor a specific channel for events
     */
    async monitorChannel(channelName) {
        try {
            const network = await this.gateway.getNetwork(channelName);

            // Block listener for transaction events
            const blockListener = async (event) => {
                await this.processBlockEvent(channelName, event);
            };

            // Contract events for specific chaincode events
            const contractListener = async (event) => {
                await this.processContractEvent(channelName, event);
            };

            // Transaction events for detailed transaction monitoring
            const txListener = async (event) => {
                await this.processTransactionEvent(channelName, event);
            };

            // Register listeners
            await network.addBlockListener(blockListener);
            this.eventListeners.set(`${channelName}-block`, blockListener);

            this.logger.info(`Channel monitoring started: ${channelName}`);

        } catch (error) {
            this.logger.error(`Failed to monitor channel ${channelName}:`, error);
        }
    }

    /**
     * Process block events
     */
    async processBlockEvent(channelName, event) {
        const blockData = {
            channelName,
            blockNumber: event.blockNumber,
            transactionCount: event.blockData.data.data.length,
            timestamp: new Date().toISOString(),
            previousHash: event.blockData.header.previous_hash,
            dataHash: event.blockData.header.data_hash
        };

        this.logger.info('Block event processed', blockData);

        // Add to audit trail
        await this.addToAuditTrail('BLOCK_ADDED', blockData);

        // Check for suspicious patterns
        await this.checkSuspiciousActivity('BLOCK_EVENT', blockData);
    }

    /**
     * Process contract events
     */
    async processContractEvent(channelName, event) {
        const contractData = {
            channelName,
            eventName: event.eventName,
            chaincodeId: event.chaincodeId,
            txId: event.getTransactionEvent().transactionId,
            timestamp: new Date().toISOString(),
            payload: event.payload.toString()
        };

        this.logger.info('Contract event processed', contractData);

        // Parse payload for medical-specific events
        try {
            const payloadData = JSON.parse(contractData.payload);
            await this.processMedicalEvent(channelName, payloadData, contractData);
        } catch (error) {
            this.logger.warn('Could not parse contract event payload', {
                error: error.message,
                payload: contractData.payload
            });
        }

        // Add to audit trail
        await this.addToAuditTrail('CONTRACT_EVENT', contractData);
    }

    /**
     * Process transaction events
     */
    async processTransactionEvent(channelName, event) {
        const txData = {
            channelName,
            transactionId: event.transactionId,
            status: event.status,
            creator: event.creator,
            timestamp: new Date().toISOString(),
            validationCode: event.validationCode
        };

        this.logger.info('Transaction event processed', txData);

        // Check for failed transactions
        if (txData.validationCode !== 0) {
            await this.handleFailedTransaction(txData);
        }

        // Add to audit trail
        await this.addToAuditTrail('TRANSACTION_EVENT', txData);
    }

    /**
     * Process medical-specific events
     */
    async processMedicalEvent(channelName, payloadData, contractData) {
        switch (payloadData.eventType) {
            case 'CONSENT_GRANTED':
                await this.logConsentEvent('GRANTED', payloadData, contractData);
                break;

            case 'CONSENT_REVOKED':
                await this.logConsentEvent('REVOKED', payloadData, contractData);
                break;

            case 'DATA_ACCESSED':
                await this.logDataAccess(payloadData, contractData);
                await this.checkAccessPattern(payloadData);
                break;

            case 'DATA_EXPORTED':
                await this.logDataExport(payloadData, contractData);
                await this.checkLargeExport(payloadData);
                break;

            case 'ACCESS_DENIED':
                await this.logAccessDenial(payloadData, contractData);
                await this.checkMultipleFailures(payloadData);
                break;

            case 'EMERGENCY_ACCESS':
                await this.logEmergencyAccess(payloadData, contractData);
                break;

            default:
                this.logger.info('Unknown medical event type', payloadData);
        }
    }

    /**
     * Log consent events
     */
    async logConsentEvent(action, payloadData, contractData) {
        const consentLog = {
            action,
            patientId: payloadData.patientId,
            providerId: payloadData.providerId,
            consentType: payloadData.consentType,
            permissions: payloadData.permissions,
            timestamp: contractData.timestamp,
            transactionId: contractData.txId
        };

        this.logger.audit('Consent event logged', consentLog);

        // Regulatory compliance check
        await this.checkRegulatoryCompliance('CONSENT', consentLog);
    }

    /**
     * Log data access events
     */
    async logDataAccess(payloadData, contractData) {
        const accessLog = {
            patientId: payloadData.patientId,
            accessorId: payloadData.accessorId,
            dataType: payloadData.dataType,
            accessLevel: payloadData.accessLevel,
            purpose: payloadData.purpose,
            timestamp: contractData.timestamp,
            ipAddress: payloadData.ipAddress,
            transactionId: contractData.txId
        };

        this.logger.audit('Data access logged', accessLog);

        // Check for off-hours access
        await this.checkOffHoursAccess(accessLog);
    }

    /**
     * Check for suspicious access patterns
     */
    async checkAccessPattern(payloadData) {
        const userId = payloadData.accessorId;
        const timeWindow = 600000; // 10 minutes
        const currentTime = Date.now();

        // Get recent access events for this user
        const recentAccess = this.auditTrail.filter(event =>
            event.eventType === 'DATA_ACCESS' &&
            event.data.accessorId === userId &&
            (currentTime - new Date(event.timestamp).getTime()) < timeWindow
        );

        const rule = this.alertRules.get('UNUSUAL_ACCESS_PATTERN');
        if (recentAccess.length >= rule.threshold) {
            await this.triggerAlert('UNUSUAL_ACCESS_PATTERN', {
                userId,
                accessCount: recentAccess.length,
                timeWindow: timeWindow / 60000 + ' minutes',
                recentAccess
            });
        }
    }

    /**
     * Check for multiple access failures
     */
    async checkMultipleFailures(payloadData) {
        const userId = payloadData.accessorId;
        const timeWindow = 300000; // 5 minutes
        const currentTime = Date.now();

        const recentFailures = this.auditTrail.filter(event =>
            event.eventType === 'ACCESS_DENIED' &&
            event.data.accessorId === userId &&
            (currentTime - new Date(event.timestamp).getTime()) < timeWindow
        );

        const rule = this.alertRules.get('MULTIPLE_ACCESS_FAILURES');
        if (recentFailures.length >= rule.threshold) {
            await this.triggerAlert('MULTIPLE_ACCESS_FAILURES', {
                userId,
                failureCount: recentFailures.length,
                timeWindow: timeWindow / 60000 + ' minutes',
                action: rule.action
            });
        }
    }

    /**
     * Check for large data exports
     */
    async checkLargeExport(payloadData) {
        const recordCount = parseInt(payloadData.recordCount) || 0;
        const rule = this.alertRules.get('LARGE_DATA_EXPORT');

        if (recordCount >= rule.threshold) {
            await this.triggerAlert('LARGE_DATA_EXPORT', {
                userId: payloadData.accessorId,
                recordCount,
                threshold: rule.threshold,
                dataType: payloadData.dataType
            });
        }
    }

    /**
     * Check for off-hours access
     */
    async checkOffHoursAccess(accessLog) {
        const hour = new Date().getHours();
        const isOffHours = hour < 6 || hour > 22; // Outside 6 AM - 10 PM

        if (isOffHours) {
            await this.triggerAlert('OFF_HOURS_ACCESS', {
                userId: accessLog.accessorId,
                hour,
                accessDetails: accessLog
            });
        }
    }

    /**
     * Trigger security alert
     */
    async triggerAlert(alertType, alertData) {
        const alert = {
            alertType,
            severity: this.alertRules.get(alertType).severity,
            timestamp: new Date().toISOString(),
            data: alertData,
            status: 'ACTIVE'
        };

        this.logger.error('Security alert triggered', alert);

        // Add to audit trail
        await this.addToAuditTrail('SECURITY_ALERT', alert);

        // Execute alert action
        const rule = this.alertRules.get(alertType);
        await this.executeAlertAction(rule.action, alertData);

        // Notify administrators
        await this.notifyAdministrators(alert);
    }

    /**
     * Execute alert action
     */
    async executeAlertAction(action, alertData) {
        switch (action) {
            case 'BLOCK_USER':
                await this.blockUser(alertData.userId);
                break;

            case 'REQUIRE_ADDITIONAL_AUTH':
                await this.requireAdditionalAuth(alertData.userId);
                break;

            case 'NOTIFY_ADMIN':
                await this.notifyAdministrators(alertData);
                break;

            case 'LOG_ADDITIONAL_DETAILS':
                await this.logAdditionalDetails(alertData);
                break;

            default:
                this.logger.warn('Unknown alert action', { action });
        }
    }

    /**
     * Add event to audit trail
     */
    async addToAuditTrail(eventType, eventData) {
        const auditEntry = {
            id: this.generateAuditId(),
            eventType,
            timestamp: new Date().toISOString(),
            data: eventData,
            hash: this.generateEventHash(eventType, eventData)
        };

        this.auditTrail.push(auditEntry);

        // Keep only last 10000 entries in memory
        if (this.auditTrail.length > 10000) {
            this.auditTrail = this.auditTrail.slice(-10000);
        }

        // Write to persistent storage
        await this.persistAuditEntry(auditEntry);
    }

    /**
     * Generate unique audit ID
     */
    generateAuditId() {
        return `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate event hash for integrity
     */
    generateEventHash(eventType, eventData) {
        const crypto = require('crypto');
        const dataString = JSON.stringify({ eventType, eventData });
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Persist audit entry to file
     */
    async persistAuditEntry(auditEntry) {
        const auditFile = path.join(__dirname, 'logs', 'audit-trail.jsonl');
        const auditLine = JSON.stringify(auditEntry) + '\n';

        fs.appendFileSync(auditFile, auditLine);
    }

    /**
     * Get audit trail with filtering
     */
    async getAuditTrail(filters = {}) {
        let filteredTrail = [...this.auditTrail];

        if (filters.eventType) {
            filteredTrail = filteredTrail.filter(entry =>
                entry.eventType === filters.eventType
            );
        }

        if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            filteredTrail = filteredTrail.filter(entry =>
                new Date(entry.timestamp) >= startDate
            );
        }

        if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            filteredTrail = filteredTrail.filter(entry =>
                new Date(entry.timestamp) <= endDate
            );
        }

        if (filters.userId) {
            filteredTrail = filteredTrail.filter(entry =>
                entry.data.userId === filters.userId ||
                entry.data.accessorId === filters.userId
            );
        }

        return filteredTrail;
    }

    /**
     * Generate compliance report
     */
    async generateComplianceReport(startDate, endDate) {
        const filters = { startDate, endDate };
        const auditData = await this.getAuditTrail(filters);

        const report = {
            reportId: `COMPLIANCE_${Date.now()}`,
            period: { startDate, endDate },
            generatedAt: new Date().toISOString(),
            totalEvents: auditData.length,
            eventBreakdown: {},
            accessPatterns: {},
            securityAlerts: [],
            complianceMetrics: {}
        };

        // Event breakdown
        auditData.forEach(entry => {
            report.eventBreakdown[entry.eventType] =
                (report.eventBreakdown[entry.eventType] || 0) + 1;
        });

        // Security alerts
        report.securityAlerts = auditData.filter(entry =>
            entry.eventType === 'SECURITY_ALERT'
        );

        // Compliance metrics
        report.complianceMetrics = {
            dataAccessEvents: auditData.filter(e => e.eventType === 'DATA_ACCESS').length,
            consentEvents: auditData.filter(e => e.eventType.includes('CONSENT')).length,
            securityIncidents: report.securityAlerts.length,
            averageResponseTime: this.calculateAverageResponseTime(auditData)
        };

        return report;
    }

    /**
     * Notify administrators
     */
    async notifyAdministrators(alertData) {
        // In a real implementation, this would send emails, SMS, or push notifications
        this.logger.warn('Administrator notification sent', {
            alert: alertData,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Stop monitoring
     */
    async stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        // Remove all event listeners
        for (const [key, listener] of this.eventListeners) {
            // In a real implementation, you'd remove the specific listener
            this.logger.info(`Removed listener: ${key}`);
        }

        this.eventListeners.clear();
        this.isMonitoring = false;

        this.logger.info('Blockchain monitoring stopped');
    }

    /**
     * Disconnect and cleanup
     */
    async disconnect() {
        await this.stopMonitoring();
        await this.gateway.disconnect();
        this.logger.info('Blockchain Event Logger disconnected');
    }
}

module.exports = CrossChannelCommunicator;