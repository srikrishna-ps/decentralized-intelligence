const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        await mongoose.connect(mongoURI);

        console.log('✅ MongoDB connected successfully');
        console.log('📊 Database:', mongoose.connection.db.databaseName);
        console.log('🔗 Host:', mongoose.connection.host);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
