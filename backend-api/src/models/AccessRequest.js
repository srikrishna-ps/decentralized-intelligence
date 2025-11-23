const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    requesterId: {
        type: String,
        required: true,
        index: true
    },
    requesterRole: {
        type: String,
        required: true,
        enum: ['doctor', 'diagnostic', 'insurer']
    },
    requesterName: {
        type: String
    },
    patientId: {
        type: String,
        required: true,
        index: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    respondedAt: {
        type: Date
    }
}, {
    timestamps: true
});

accessRequestSchema.index({ patientId: 1, status: 1, requestedAt: -1 });
accessRequestSchema.index({ requesterId: 1, status: 1 });

const AccessRequest = mongoose.model('AccessRequest', accessRequestSchema);

module.exports = { AccessRequest };
