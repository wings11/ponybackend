const express = require('express');
const router = express.Router();
const telegramController = require('../controllers/telegram');

// Telegram webhook for incoming messages
router.post('/webhook', telegramController.handleWebhook);

// Send message endpoint
router.post('/send', telegramController.sendMessage);

module.exports = router;