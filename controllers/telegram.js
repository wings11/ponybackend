
import telegramService from '../services/telegram.js';

class TelegramController {
  async handleWebhook(req, res) {
    try {
      console.log('Webhook received:', JSON.stringify(req.body, null, 2));
      const update = req.body;
      if (update.message) {
        await telegramService.processIncomingMessage(update.message);
      }
      res.sendStatus(200);
    } catch (err) {
      console.error('Webhook error:', err.message, err.stack);
      res.sendStatus(200); // Telegram requires 200 OK
    }
  }

  async sendMessage(req, res) {
    console.log('Send request received:', JSON.stringify(req.body, null, 2));
    const { recipient, message, message_type, media_url, platform } = req.body;
    if (!recipient || !platform || platform !== 'telegram') {
      console.log('Validation failed: Invalid recipient or platform');
      return res.status(400).json({ error: 'Invalid recipient or platform' });
    }
    if (!['text', 'image', 'video', 'audio', 'file'].includes(message_type)) {
      console.log('Validation failed: Invalid message_type');
      return res.status(400).json({ error: 'Invalid message_type' });
    }
    if (message_type !== 'text' && !media_url) {
      console.log('Validation failed: media_url required for non-text messages');
      return res.status(400).json({ error: 'media_url required for non-text messages' });
    }

    try {
      await telegramService.sendMessage({
        recipient,
        message: message || '',
        message_type,
        media_url,
      });
      console.log('Message sent successfully to:', recipient);
      // Return a JSON response for frontend compatibility
      res.status(200).json({ status: 'ok', recipient, message, message_type, media_url });
    } catch (err) {
      console.error('Send message error:', err.message, err.stack);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  async getUnreadCount(req, res) {
    try {
      const { data, error } = await (await import('../supabaseClient.js')).default
        .from('pony_messages')
        .select('sender, count(*)', { count: 'exact' })
        .eq('platform', 'telegram')
        .eq('admin_read', false)
        .group('sender');
      if (error) {
        console.error('Unread count error:', error);
        return res.status(500).json({ error: 'Failed to get unread counts' });
      }
      // Convert to { sender: count }
      const counts = {};
      (data || []).forEach(row => { counts[row.sender] = Number(row.count); });
      res.json({ counts });
    } catch (err) {
      console.error('Unread count exception:', err.message, err.stack);
      res.status(500).json({ error: 'Failed to get unread counts' });
    }
  }

  async markRead(req, res) {
    try {
      const { sender } = req.body;
      if (!sender) return res.status(400).json({ error: 'sender required' });
      const supabase = (await import('../supabaseClient.js')).default;
      const { error } = await supabase
        .from('pony_messages')
        .update({ admin_read: true })
        .eq('platform', 'telegram')
        .eq('sender', sender)
        .eq('admin_read', false);
      if (error) {
        console.error('Mark read error:', error);
        return res.status(500).json({ error: 'Failed to mark read' });
      }
      res.json({ status: 'ok' });
    } catch (err) {
      console.error('Mark read exception:', err.message, err.stack);
      res.status(500).json({ error: 'Failed to mark read' });
    }
  }

  // Add to TelegramController class
async getUserName(req, res) {
  const { platform, id } = req.query;
  if (platform !== 'telegram') return res.status(400).json({ error: 'Platform not supported yet' });
  if (!id) return res.status(400).json({ error: 'ID required' });

  try {
    const token = await telegramService.getToken();
    const url = `https://api.telegram.org/bot${token}/getChat?chat_id=${id}`;
  const fetch = require('node-fetch');
  const response = await fetch(url);
    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    const name = data.result.first_name || data.result.username || 'Unknown User';
    res.json({ name });
  } catch (err) {
    console.error('Get user name error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch user name' });
  }
}


}

export default new TelegramController();