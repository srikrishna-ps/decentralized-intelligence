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
router.post('/consent', patientController.grantConsent);

module.exports = router;
