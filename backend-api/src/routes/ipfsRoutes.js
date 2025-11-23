const express = require('express');
const router = express.Router();
const ipfsController = require('../controllers/ipfsController');

router.get('/file/:ipfsHash', ipfsController.getFile);

module.exports = router;
