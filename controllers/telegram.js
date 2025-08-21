const telegramService = require('../services/telegram');

class TelegramController {
  async handleWebhook(req, res) {
    try {
      const update = req.body;
      if (update.message) {
        await telegramService.processIncomingMessage(update.message);
      }
      res.sendStatus(200); // Telegram requires 200 OK
    } catch (err) {
      console.error('Webhook error:', err);
      res.sendStatus(200); // Still return 200 to avoid Telegram retries
    }
  }

  async sendMessage(req, res) {
    const { recipient, message, message_type, media_url, platform } = req.body;
    if (!recipient || !platform || platform !== 'telegram') {
      return res.status(400).json({ error: 'Invalid recipient or platform' });
    }
    if (!['text', 'image', 'video', 'audio', 'file'].includes(message_type)) {
      return res.status(400).json({ error: 'Invalid message_type' });
    }
    if (message_type !== 'text' && !media_url) {
      return res.status(400).json({ error: 'media_url required for non-text messages' });
    }

    try {
      await telegramService.sendMessage({
        recipient,
        message: message || '',
        message_type,
        media_url,
      });
      res.sendStatus(200);
    } catch (err) {
      console.error('Send message error:', err);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
}

module.exports = new TelegramController();