const mongoose = require('mongoose');
const { MedicalRecord } = require('../models/MedicalRecord');
const { ActivityLog } = require('../models/ActivityLog');
const { AccessGrant } = require('../models/AccessGrant');
const { AccessRequest } = require('../models/AccessRequest');
const User = require('../models/User');

const handleError = (res, error) => {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
};

const adminController = {
    async getAllUsers(req, res) {
        try {
            const User = mongoose.model('User');
            const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();

            res.json({
                success: true,
                users: users.map(u => ({
                    id: u._id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    patientId: u.patientId,
                    providerId: u.providerId,
                    createdAt: u.createdAt
                }))
            });
        } catch (error) {
            handleError(res, error);
        }
    },

    async getSystemStats(req, res) {
        try {
            const User = mongoose.model('User');
            const totalUsers = await User.countDocuments();
            const totalRecords = await MedicalRecord.countDocuments();
            const totalAccessGrants = await AccessGrant.countDocuments({ status: 'active' });
            const totalAccessRequests = await AccessRequest.countDocuments({ status: 'pending' });
            // Using ActivityLog as a proxy for system transactions since we are in mock mode
            const totalTransactions = await ActivityLog.countDocuments();

            console.log('System Stats Debug:', { totalUsers, totalRecords, totalAccessGrants, totalAccessRequests, totalTransactions });

            const usersByRole = await User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ]);

            res.json({
                success: true,
                stats: {
                    totalUsers,
                    totalRecords,
                    totalAccessGrants,
                    totalAccessRequests,
                    totalTransactions,
                    usersByRole: usersByRole.reduce((acc, item) => {
                        acc[item._id] = item.count;
                        return acc;
                    }, {})
                }
            });
        } catch (error) {
            handleError(res, error);
        }
    },

    async getAllRecords(req, res) {
        try {
            const records = await MedicalRecord.find({}).sort({ createdAt: -1 }).limit(100).lean();

            res.json({
                success: true,
                records: records.map(r => ({
                    id: r.recordId,
                    title: r.title,
                    type: r.type,
                    patientId: r.patientId,
                    providerId: r.providerId,
                    status: r.status,
                    createdAt: r.createdAt
                }))
            });
        } catch (error) {
            handleError(res, error);
        }
    },

    async getAllActivity(req, res) {
        try {
            const { action } = req.query;

            const query = {};
            if (action && action !== 'all') query.action = action;

            const activities = await ActivityLog.find(query).sort({ timestamp: -1 }).limit(200).lean();

            res.json({
                success: true,
                activities: activities.map(a => ({
                    id: a._id,
                    userId: a.userId,
                    userRole: a.userRole,
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

module.exports = adminController;
