const express = require('express');
const router = express.Router();
const multer = require('multer');
const patientController = require('../controllers/patientController');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// All routes require authentication and patient role
router.use(authenticateToken);
router.use(requireRole('patient', 'admin'));

// Routes with ownership verification
router.post('/upload', upload.single('file'), patientController.uploadRecord);
router.get('/records/:patientId', requireOwnership('patientId'), patientController.getRecords);
router.put('/records/:recordId', patientController.updateRecord);
router.patch('/records/:recordId/archive', patientController.toggleArchiveRecord);
router.delete('/records/:recordId', patientController.deleteRecord);
router.get('/activity/:patientId', requireOwnership('patientId'), patientController.getActivityLog);
router.post('/consent', patientController.grantConsent);
router.get('/access-grants/:patientId', requireOwnership('patientId'), patientController.getAccessGrants);
router.delete('/access-grants/:grantId', patientController.revokeAccess);
router.get('/incoming-requests/:patientId', requireOwnership('patientId'), patientController.getIncomingRequests);
router.post('/approve-request', patientController.approveRequest);
router.post('/reject-request', patientController.rejectRequest);

module.exports = router;
