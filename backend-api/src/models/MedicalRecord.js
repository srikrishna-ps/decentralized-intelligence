const mongoose = require('mongoose');

// Medical Record Schema for Fabric data
const medicalRecordSchema = new mongoose.Schema({
    recordId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['lab_report', 'prescription', 'imaging', 'clinical_note', 'other'],
        default: 'other'
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
        index: true
    },
    medicalData: {
        cid: String,
        filename: String,
        mimetype: String,
        size: Number,
        ipfsHash: String,
        timestamp: String
    },
    providerId: {
        type: String,
        required: true,
        index: true
    },
    patientId: {
        type: String,
        required: true,
        index: true
    },
    protectionId: {
        type: String,
        required: true
    },
    blockchainTxHash: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
medicalRecordSchema.index({ patientId: 1, status: 1, createdAt: -1 });
medicalRecordSchema.index({ providerId: 1, createdAt: -1 });

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

module.exports = { MedicalRecord };
