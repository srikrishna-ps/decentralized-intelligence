const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/users', adminController.getAllUsers);
router.put('/users/:id/status', adminController.updateUserStatus);
router.get('/stats', adminController.getSystemStats);
router.get('/records', adminController.getAllRecords);
router.get('/activity', adminController.getAllActivity);

module.exports = router;
