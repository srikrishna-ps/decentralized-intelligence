const mongoose = require('mongoose');

// Medical Record Schema
const medicalRecordSchema = new mongoose.Schema({
    recordId: { type: String, required: true, unique: true, index: true },
    medicalData: {
        cid: String,
        filename: String,
        mimetype: String,
        size: Number,
        description: String,
        timestamp: String
    },
    providerId: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    protectionId: String,
    timestamp: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// User Schema (for authentication)
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
    name: String,
    walletAddress: String,
    createdAt: { type: Date, default: Date.now }
});

// Consent Log Schema (for audit trail)
const consentLogSchema = new mongoose.Schema({
    consentId: String,
    patientAddress: { type: String, required: true, index: true },
    providerAddress: { type: String, required: true, index: true },
    category: Number,
    purpose: String,
    transactionHash: String,
    blockNumber: Number,
    timestamp: { type: Date, default: Date.now }
});

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);
const User = mongoose.model('User', userSchema);
const ConsentLog = mongoose.model('ConsentLog', consentLogSchema);

module.exports = {
    MedicalRecord,
    User,
    ConsentLog
};
