const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
    if (isConnected) {
        console.log('Using existing database connection');
        return;
    }

    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-blockchain';

        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        isConnected = true;
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        // For development, continue without MongoDB
        if (process.env.NODE_ENV === 'development') {
            console.log('⚠️  Continuing without MongoDB (development mode)');
        } else {
            throw error;
        }
    }
}

module.exports = { connectDB };
