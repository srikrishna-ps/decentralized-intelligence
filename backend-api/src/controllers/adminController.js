const mongoose = require('mongoose');
const { MedicalRecord } = require('../models/MedicalRecord');
const { ActivityLog } = require('../models/ActivityLog');
const { AccessGrant } = require('../models/AccessGrant');
const { AccessRequest } = require('../models/AccessRequest');
const User = require('../models/User');

const handleError = (res, error) => {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
}
const adminController = {
    async getAllUsers(req, res) {
        try {
            const User = mongoose.model('User');
            // Exclude the specific admin email
            const users = await User.find({ email: { $ne: 'test.medichain@gmail.com' } }, '-password');
            res.json({
                success: true,
                users: users.map(u => ({
                    id: u._id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    status: u.status,
                    createdAt: u.createdAt
                }))
            });
        } catch (error) {
            handleError(res, error);
        }
    },

    async updateUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const User = mongoose.model('User');

            const user = await User.findByIdAndUpdate(
                id,
                { status },
                { new: true }
            );

            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            res.json({ success: true, user });
        } catch (error) {
            handleError(res, error);
        }
    },

    async getAllRecords(req, res) {
        try {
            const records = await MedicalRecord.find().sort({ createdAt: -1 });
            res.json({ success: true, records });
        } catch (error) {
            handleError(res, error);
        }
    },

    async getSystemStats(req, res) {
        try {
            const User = mongoose.model('User');
            // Exclude admin from count
            const totalUsers = await User.countDocuments({ email: { $ne: 'test.medichain@gmail.com' } });
            const totalRecords = await MedicalRecord.countDocuments();
            const totalAccessGrants = await AccessGrant.countDocuments({ status: 'active' });
            const totalAccessRequests = await AccessRequest.countDocuments({ status: 'pending' });
            // Using ActivityLog as a proxy for system transactions since we are in mock mode
            const totalTransactions = await ActivityLog.countDocuments();

            console.log('System Stats Debug:', { totalUsers, totalRecords, totalAccessGrants, totalAccessRequests, totalTransactions });

            const usersByRole = await User.aggregate([
                { $match: { email: { $ne: 'test.medichain@gmail.com' } } },
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
                    usersByRole
                }
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
