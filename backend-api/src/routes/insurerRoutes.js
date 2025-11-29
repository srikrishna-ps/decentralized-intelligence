const express = require('express');
const router = express.Router();
const insurerController = require('../controllers/insurerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication and insurer role
router.use(authenticateToken);
router.use(requireRole('insurer', 'admin'));

router.post('/request-access', insurerController.requestAccess);
router.get('/access-requests/:insurerId', insurerController.getAccessRequests);
router.get('/granted-records/:insurerId', insurerController.getGrantedRecords);
router.get('/activity/:insurerId', insurerController.getActivityLog);

module.exports = router;
