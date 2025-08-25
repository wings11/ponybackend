const express = require('express');
const router = express.Router();
const telegramController = require('../controllers/telegram');

// Telegram webhook for incoming messages
router.post('/webhook', telegramController.handleWebhook);

// Send message endpoint
router.post('/send', telegramController.sendMessage);

// Add to routes/telegram.js
router.get('/get-user-name', telegramController.getUserName);

module.exports = router;