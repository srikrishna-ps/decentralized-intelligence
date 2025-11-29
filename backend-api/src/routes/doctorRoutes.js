const express = require('express');
const router = express.Router();
const multer = require('multer');
const doctorController = require('../controllers/doctorController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

// All routes require authentication and doctor role
router.use(authenticateToken);
router.use(requireRole('doctor', 'admin'));

router.post('/request-access', doctorController.requestAccess);
router.get('/access-requests/:doctorId', doctorController.getAccessRequests);
router.get('/granted-records/:doctorId', doctorController.getGrantedRecords);
router.post('/upload-note', upload.single('file'), doctorController.uploadClinicalNote);
router.get('/activity/:doctorId', doctorController.getActivityLog);

module.exports = router;
