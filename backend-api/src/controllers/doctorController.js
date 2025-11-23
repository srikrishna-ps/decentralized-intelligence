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

const doctorController = {
    // Request access to patient records
    async requestAccess(req, res) {
        try {
            const { doctorId, patientId, reason } = req.body;

            if (!doctorId || !patientId || !reason) {
                return res.status(400).json({ success: false, error: 'Doctor ID, Patient ID, and reason are required' });
            }

            const User = mongoose.model('User');
            const doctor = await User.findOne({ providerId: doctorId });
            const requestId = crypto.randomUUID();

            const accessRequest = new AccessRequest({
                requestId,
                requesterId: doctorId,
                requesterRole: 'doctor',
                requesterName: doctor ? doctor.name : doctorId,
                patientId,
                reason,
                status: 'pending'
            });

            await accessRequest.save();
            await logActivity(doctorId, 'doctor', 'request_access', 'access', patientId, { reason, patientId });

            res.json({ success: true, message: 'Access request sent successfully', requestId });
        } catch (error) {
            handleError(res, error);
        }
    },

    // Get access requests
    async getAccessRequests(req, res) {
        try {
            const { doctorId } = req.params;
            const { status } = req.query;

            const query = { requesterId: doctorId };
            if (status) query.status = status;

            const requests = await AccessRequest.find(query).sort({ requestedAt: -1 }).lean();

            res.json({
                success: true,
                requests: requests.map(r => ({
                    id: r.requestId,
                    patientId: r.patientId,
                    reason: r.reason,
                    status: r.status,
                    requestedAt: r.requestedAt,
                    respondedAt: r.respondedAt
                }))
            });
        } catch (error) {
            handleError(res, error);
        }
    },

    // Get granted records
    async getGrantedRecords(req, res) {
        try {
            const { doctorId } = req.params;

            const grants = await AccessGrant.find({ providerId: doctorId, status: 'active' }).lean();
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

    // Upload clinical note
    async uploadClinicalNote(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            const { doctorId, patientId, title, description } = req.body;

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
                doctorId,
                patientId
            );

            const fabricResult = JSON.parse(new TextDecoder().decode(transaction));

            const record = new MedicalRecord({
                recordId,
                title,
                description,
                type: 'clinical_note',
                status: 'active',
                medicalData,
                providerId: doctorId,
                patientId,
                protectionId: fabricResult.protectionId,
                blockchainTxHash: fabricResult.protectionId
            });

            await record.save();
            await logActivity(doctorId, 'doctor', 'upload', 'record', recordId, { title, patientId, filename: req.file.originalname });

            res.json({ success: true, message: 'Clinical note uploaded successfully', record: { id: record.recordId, title: record.title } });
        } catch (error) {
            handleError(res, error);
        }
    },

    // Get activity log
    async getActivityLog(req, res) {
        try {
            const { doctorId } = req.params;
            const { action } = req.query;

            const query = { userId: doctorId };
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
    }
};

module.exports = doctorController;
