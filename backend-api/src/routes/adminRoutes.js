const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/users', adminController.getAllUsers);
router.put('/users/:id/status', adminController.updateUserStatus);
router.get('/stats', adminController.getSystemStats);
router.get('/records', adminController.getAllRecords);
router.get('/activity', adminController.getAllActivity);

module.exports = router;
