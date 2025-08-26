import express from 'express';
import telegramController from '../controllers/telegram.js';

const router = express.Router();

// Telegram webhook for incoming messages
router.post('/webhook', telegramController.handleWebhook);

// Send message endpoint
router.post('/send', telegramController.sendMessage);

// Get unread counts for admin dashboard
router.get('/unread-count', telegramController.getUnreadCount);

// Mark messages from a sender as read
router.post('/mark-read', telegramController.markRead);

// Add to routes/telegram.js
router.get('/get-user-name', telegramController.getUserName);

export default router;