const connectDB = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.signup = async (req, res) => {
    try {
        await connectDB();

        const { email, name, password, role } = req.body;
        console.log('Signup Request:', { email, role });

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

        // Determine initial status
        // Patients are active by default. Professionals need admin approval.
        // NOTE: The User model also enforces this in the pre-save hook as a failsafe.
        const normalizedRole = role ? role.toLowerCase().trim() : 'patient';
        let initialStatus = 'active';
        if (['doctor', 'diagnostic', 'insurer'].includes(normalizedRole)) {
            initialStatus = 'pending';
        }

        console.log('Determined Status:', { normalizedRole, initialStatus });

        // Create user
        const user = await User.create({
            email,
            name,
            password: hashedPassword,
            role: normalizedRole,
            status: initialStatus
        });

        res.status(201).json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
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

        // Check Account Status
        if (user.status === 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Your account is currently pending admin approval. You will be notified once verified.'
            });
        }

        if (user.status === 'rejected') {
            return res.status(403).json({
                success: false,
                message: 'Your account registration was rejected. Please contact support for assistance.'
            });
        }

        // SPECIAL ADMIN OVERRIDE
        // If the user is the designated test admin, force the role to 'admin'
        // This ensures they get admin access even if the DB record says 'patient'
        if (user.email === 'test.medichain@gmail.com') {
            user.role = 'admin';
            user.status = 'active'; // Ensure admin is always active
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
