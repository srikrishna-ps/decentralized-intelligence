const express = require('express');
const router = express.Router();
const multer = require('multer');
const diagnosticController = require('../controllers/diagnosticController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

// All routes require authentication and diagnostic role
router.use(authenticateToken);
router.use(requireRole('diagnostic', 'admin'));

router.post('/request-access', diagnosticController.requestAccess);
router.get('/access-requests/:diagnosticId', diagnosticController.getAccessRequests);
router.post('/upload-result', upload.single('file'), diagnosticController.uploadTestResult);
router.get('/granted-records/:diagnosticId', diagnosticController.getGrantedRecords);
router.get('/activity/:diagnosticId', diagnosticController.getActivityLog);
router.get('/my-uploads/:diagnosticId', diagnosticController.getMyUploads);

module.exports = router;
