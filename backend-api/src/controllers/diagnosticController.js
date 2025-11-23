const crypto = require('crypto');
const mongoose = require('mongoose');
const { MedicalRecord } = require('../models/MedicalRecord');
const { ActivityLog } = require('../models/ActivityLog');
const { AccessGrant } = require('../models/AccessGrant');
const { AccessRequest } = require('../models/AccessRequest');
const { getContract: getFabricContract } = require('../fabric/gateway');
const { uploadFile } = require('../ipfs/client');

const FABRIC_CHANNEL = process.env.FABRIC_CHANNEL || 'medical-channel';
const FABRIC_CHAINCODE = process.env.FABRIC_CHAINCODE || 'encryption';

const handleError = (res, error) => {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
};

const logActivity = async (userId, userRole, action, resourceType, resourceId, details = {}) => {
    try {
        await ActivityLog.create({ userId, userRole, action, resourceType, resourceId, details });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};

const diagnosticController = {
    async requestAccess(req, res) {
        try {
            const { diagnosticId, patientId, reason } = req.body;

            if (!diagnosticId || !patientId || !reason) {
                return res.status(400).json({ success: false, error: 'Diagnostic ID, Patient ID, and reason are required' });
            }

            const User = mongoose.model('User');
            const diagnostic = await User.findOne({ providerId: diagnosticId });
            const requestId = crypto.randomUUID();

            const accessRequest = new AccessRequest({
                requestId,
                requesterId: diagnosticId,
                requesterRole: 'diagnostic',
                requesterName: diagnostic ? diagnostic.name : diagnosticId,
                patientId,
                reason,
                status: 'pending'
            });

            await accessRequest.save();
            await logActivity(diagnosticId, 'diagnostic', 'request_access', 'access', patientId, { reason, patientId });

            res.json({ success: true, message: 'Access request sent successfully', requestId });
        } catch (error) {
            handleError(res, error);
        }
    },

    async getAccessRequests(req, res) {
        try {
            const { diagnosticId } = req.params;
            const { status } = req.query;

            const query = { requesterId: diagnosticId };
            if (status) query.status = status;

            const requests = await AccessRequest.find(query).sort({ requestedAt: -1 }).lean();

            res.json({
                success: true,
                requests: requests.map(r => ({
                    id: r.requestId,
                    patientId: r.patientId,
                    reason: r.reason,
                    status: r.status,
                    requestedAt: r.requestedAt
                }))
            });
        } catch (error) {
            handleError(res, error);
        }
    },

    async uploadTestResult(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            const { diagnosticId, patientId, title, description, testType } = req.body;

            if (!title || !description || !patientId) {
                return res.status(400).json({ success: false, error: 'Title, description, and patient ID are required' });
            }

            const cid = await uploadFile(req.file.buffer);
            const recordId = crypto.randomUUID();
            const medicalData = {
                cid,
                ipfsHash: cid,
                filename: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                timestamp: new Date().toISOString()
            };

            const contract = await getFabricContract(FABRIC_CHANNEL, FABRIC_CHAINCODE);
            const transaction = await contract.submitTransaction(
                'storeProtectedMedicalData',
                recordId,
                JSON.stringify(medicalData),
                diagnosticId,
                patientId
            );

            const fabricResult = JSON.parse(new TextDecoder().decode(transaction));

            const record = new MedicalRecord({
                recordId,
                title,
                description,
                type: testType || 'lab_report',
                status: 'active',
                medicalData,
                providerId: diagnosticId,
                patientId,
                protectionId: fabricResult.protectionId,
                blockchainTxHash: fabricResult.protectionId
            });

            await record.save();
            await logActivity(diagnosticId, 'diagnostic', 'upload', 'record', recordId, { title, patientId, filename: req.file.originalname });

            res.json({ success: true, message: 'Test result uploaded successfully', record: { id: record.recordId, title: record.title } });
        } catch (error) {
            handleError(res, error);
        }
    },

    async getGrantedRecords(req, res) {
        try {
            const { diagnosticId } = req.params;

            const grants = await AccessGrant.find({ providerId: diagnosticId, status: 'active' }).lean();
            const patientIds = grants.map(g => g.patientId);

            const records = await MedicalRecord.find({ patientId: { $in: patientIds }, status: 'active' })
                .sort({ createdAt: -1 })
                .lean();

            res.json({
                success: true,
                records: records.map(r => ({
                    id: r.recordId,
                    title: r.title,
                    description: r.description,
                    type: r.type,
                    patientId: r.patientId,
                    fileName: r.medicalData?.filename,
                    ipfsHash: r.medicalData?.ipfsHash,
                    createdAt: r.createdAt
                }))
            });
        } catch (error) {
            handleError(res, error);
        }
    },

    async getActivityLog(req, res) {
        try {
            const { diagnosticId } = req.params;
            const { action } = req.query;

            const query = { userId: diagnosticId };
            if (action && action !== 'all') query.action = action;

            const activities = await ActivityLog.find(query).sort({ timestamp: -1 }).limit(100).lean();

            res.json({
                success: true,
                activities: activities.map(a => ({
                    id: a._id,
                    action: a.action,
                    resourceType: a.resourceType,
                    resourceId: a.resourceId,
                    details: a.details,
                    timestamp: a.timestamp
                }))
            });
        } catch (error) {
            handleError(res, error);
        }
    },

    async getMyUploads(req, res) {
        try {
            const { diagnosticId } = req.params;

            const records = await MedicalRecord.find({ providerId: diagnosticId })
                .sort({ createdAt: -1 })
                .lean();

            res.json({
                success: true,
                records: records.map(r => ({
                    id: r.recordId,
                    title: r.title,
                    description: r.description,
                    type: r.type,
                    patientId: r.patientId,
                    fileName: r.medicalData?.filename,
                    ipfsHash: r.medicalData?.ipfsHash,
                    createdAt: r.createdAt
                }))
            });
        } catch (error) {
            handleError(res, error);
        }
    }
};

module.exports = diagnosticController;
