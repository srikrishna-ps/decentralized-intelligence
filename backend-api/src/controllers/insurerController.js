const crypto = require('crypto');
const mongoose = require('mongoose');
const { MedicalRecord } = require('../models/MedicalRecord');
const { ActivityLog } = require('../models/ActivityLog');
const { AccessGrant } = require('../models/AccessGrant');
const { AccessRequest } = require('../models/AccessRequest');

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

const insurerController = {
    async requestAccess(req, res) {
        try {
            const { insurerId, patientId, reason } = req.body;

            if (!insurerId || !patientId || !reason) {
                return res.status(400).json({ success: false, error: 'Insurer ID, Patient ID, and reason are required' });
            }

            const User = mongoose.model('User');
            const insurer = await User.findOne({ providerId: insurerId });
            const requestId = crypto.randomUUID();

            const accessRequest = new AccessRequest({
                requestId,
                requesterId: insurerId,
                requesterRole: 'insurer',
                requesterName: insurer ? insurer.name : insurerId,
                patientId,
                reason,
                status: 'pending'
            });

            await accessRequest.save();
            await logActivity(insurerId, 'insurer', 'request_access', 'access', patientId, { reason, patientId });

            res.json({ success: true, message: 'Access request sent successfully', requestId });
        } catch (error) {
            handleError(res, error);
        }
    },

    async getAccessRequests(req, res) {
        try {
            const { insurerId } = req.params;
            const { status } = req.query;

            const query = { requesterId: insurerId };
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

    async getGrantedRecords(req, res) {
        try {
            const { insurerId } = req.params;

            const grants = await AccessGrant.find({ providerId: insurerId, status: 'active' }).lean();
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
            const { insurerId } = req.params;
            const { action } = req.query;

            const query = { userId: insurerId };
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

module.exports = insurerController;
