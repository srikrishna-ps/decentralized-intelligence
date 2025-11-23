const mongoose = require('mongoose');

const accessGrantSchema = new mongoose.Schema({
    grantId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    patientId: {
        type: String,
        required: true,
        index: true
    },
    providerId: {
        type: String,
        required: true,
        index: true
    },
    providerRole: {
        type: String,
        required: true,
        enum: ['doctor', 'diagnostic', 'insurer']
    },
    providerName: {
        type: String
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'revoked'],
        default: 'active',
        index: true
    },
    grantedAt: {
        type: Date,
        default: Date.now
    },
    revokedAt: {
        type: Date
    },
    blockchainTxHash: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
accessGrantSchema.index({ patientId: 1, status: 1, grantedAt: -1 });
accessGrantSchema.index({ providerId: 1, status: 1 });

const AccessGrant = mongoose.model('AccessGrant', accessGrantSchema);

module.exports = { AccessGrant };
