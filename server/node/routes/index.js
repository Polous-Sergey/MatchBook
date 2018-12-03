const express = require('express');
const router = express.Router();
const jwt = require('express-jwt');

const auth = jwt({
    secret: 'MY_SECRET',
    userProperty: 'payload'
});

const ctrlMatchbook = require('../controllers/matchbook');

// profile
router.get('/matchbook', ctrlMatchbook.get);
router.get('/json-list', ctrlMatchbook.getJsonList);
router.get('/json', ctrlMatchbook.getJson);
router.delete('/json', ctrlMatchbook.deleteEventsByDate);

module.exports = router;
