const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-here';

/**
 * Middleware to verify authentication 
 * TEMPORARY: Accepts session info from headers until proper JWT is implemented
 */
const authenticateToken = async (req, res, next) => {
    try {
        // TEMPORARY SOLUTION: Accept user info from headers (sent by frontend)
        // TODO: Replace with proper JWT token verification in production
        const userEmail = req.headers['x-user-email'];
        const userRole = req.headers['x-user-role'];
        const patientId = req.headers['x-patient-id'];
        const providerId = req.headers['x-provider-id'];

        if (!userEmail || !userRole) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required. No user session found.'
            });
        }

        // Attach user info to request
        req.user = {
            email: userEmail,
            role: userRole,
            patientId: patientId || null,
            providerId: providerId || null
        };

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Authentication verification failed.'
        });
    }
};

/**
 * Middleware to verify user has specific role
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
            });
        }

        next();
    };
};

/**
 * Middleware to verify user owns the resource (for patients)
 */
const requireOwnership = (idParamName = 'patientId') => {
    return (req, res, next) => {
        const resourcePatientId = req.params[idParamName] || req.body[idParamName];

        if (req.user.role === 'admin') {
            // Admins can access any resource
            return next();
        }

        if (req.user.role === 'patient' && req.user.patientId !== resourcePatientId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only access your own records.'
            });
        }

        next();
    };
};

/**
 * Optional authentication - attaches user if token exists, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = {
                email: decoded.email,
                role: decoded.role,
                patientId: decoded.patientId,
                providerId: decoded.providerId
            };
        }
    } catch (error) {
        // Silently fail for optional auth
    }

    next();
};

module.exports = {
    authenticateToken,
    requireRole,
    requireOwnership,
    optionalAuth
};
