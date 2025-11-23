const express = require('express');
const router = express.Router();
const multer = require('multer');
const patientController = require('../controllers/patientController');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Routes
router.post('/upload', upload.single('file'), patientController.uploadRecord);
router.get('/records/:patientId', patientController.getRecords);
router.put('/records/:recordId', patientController.updateRecord);
router.patch('/records/:recordId/archive', patientController.toggleArchiveRecord);
router.delete('/records/:recordId', patientController.deleteRecord);
router.get('/activity/:patientId', patientController.getActivityLog);
router.post('/consent', patientController.grantConsent);
router.get('/access-grants/:patientId', patientController.getAccessGrants);
router.delete('/access-grants/:grantId', patientController.revokeAccess);
router.get('/incoming-requests/:patientId', patientController.getIncomingRequests);
router.post('/approve-request', patientController.approveRequest);
router.post('/reject-request', patientController.rejectRequest);

module.exports = router;
