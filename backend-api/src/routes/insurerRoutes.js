const express = require('express');
const router = express.Router();
const insurerController = require('../controllers/insurerController');

router.post('/request-access', insurerController.requestAccess);
router.get('/access-requests/:insurerId', insurerController.getAccessRequests);
router.get('/granted-records/:insurerId', insurerController.getGrantedRecords);
router.get('/activity/:insurerId', insurerController.getActivityLog);

module.exports = router;
