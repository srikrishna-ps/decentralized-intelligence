const connectDB = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.signup = async (req, res) => {
    try {
        await connectDB();

        const { email, name, password, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            email,
            name,
            password: hashedPassword,
            role: role || 'patient',
        });

        res.status(201).json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                patientId: user.patientId,
                providerId: user.providerId,
            },
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getUser = async (req, res) => {
    try {
        await connectDB();

        const { email } = req.query;
        const user = await User.findOne({ email }).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                patientId: user.patientId,
                providerId: user.providerId,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
