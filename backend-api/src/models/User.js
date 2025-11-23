const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    name: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        // Optional for Google OAuth users
    },
    role: {
        type: String,
        enum: ['patient', 'doctor', 'diagnostic', 'insurer', 'admin'],
        required: true,
        default: 'patient',
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    patientId: {
        type: String,
        unique: true,
        sparse: true,
    },
    providerId: {
        type: String,
        unique: true,
        sparse: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Generate unique IDs on creation
UserSchema.pre('save', async function () {
    if (this.isNew) {
        if (this.role === 'patient' && !this.patientId) {
            this.patientId = `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        } else if (['doctor', 'diagnostic', 'insurer'].includes(this.role) && !this.providerId) {
            this.providerId = `PRV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        }
    }
    this.updatedAt = new Date();
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
