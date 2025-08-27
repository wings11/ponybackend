import express from 'express';
import facebookController from '../controllers/facebook.js';

const router = express.Router();

// webhook (GET for verification, POST for events)
router.get('/webhook', facebookController.webhook.bind(facebookController));
router.post('/webhook', express.json(), facebookController.webhook.bind(facebookController));
router.post('/send', express.json(), facebookController.sendMessage.bind(facebookController));
router.get('/unread-count', facebookController.getUnreadCount.bind(facebookController));
router.post('/mark-read', express.json(), facebookController.markRead.bind(facebookController));

export default router;
