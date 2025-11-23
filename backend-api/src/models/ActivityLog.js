const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    userRole: {
        type: String,
        required: true,
        enum: ['patient', 'doctor', 'diagnostic', 'insurer', 'admin']
    },
    action: {
        type: String,
        required: true,
        enum: ['upload', 'edit', 'delete', 'archive', 'unarchive', 'grant_access', 'revoke_access', 'request_access', 'view']
    },
    resourceType: {
        type: String,
        required: true,
        enum: ['record', 'access', 'user']
    },
    resourceId: {
        type: String
    },
    details: {
        type: Object
    },
    ipAddress: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = { ActivityLog };
