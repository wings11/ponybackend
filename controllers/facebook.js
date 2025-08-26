import facebookService from '../services/facebook.js';

class FacebookController {
  // webhook verification (GET) and event receiver (POST)
  async webhook(req, res) {
    // Verification: GET with hub.mode, hub.verify_token, hub.challenge
    if (req.method === 'GET') {
      const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'verify_token_here';
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      if (mode && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
      }
      return res.sendStatus(403);
    }

    // POST - process events
    try {
      await facebookService.processIncoming(req.body);
      res.json({ status: 'ok' });
    } catch (err) {
      console.error('facebook webhook error', err);
      res.status(500).json({ error: 'internal' });
    }
  }

  async sendMessage(req, res) {
    try {
      const { recipient, message, message_type, media_url, adminEmail } = req.body;
      const data = await facebookService.sendMessage({ recipient, message, message_type, media_url, adminEmail });
      res.json({ status: 'ok', data });
    } catch (err) {
      console.error('facebook send error', err);
      res.status(500).json({ error: err.message || 'send failed' });
    }
  }

  async getUnreadCount(req, res) {
    try {
      const { data, error } = await (await import('../supabaseClient.js')).default
        .from('pony_messages')
        .select('*')
        .eq('platform', 'facebook')
        .is('admin_read', false);
      if (error) return res.status(500).json({ error: 'db error' });
      // aggregate counts per platform_user_id
      const counts = {};
      (data || []).forEach(r => { const id = r.platform_user_id || r.sender; counts[id] = (counts[id] || 0) + 1; });
      res.json({ counts });
    } catch (err) {
      console.error('getUnreadCount facebook error', err);
      res.status(500).json({ error: 'internal' });
    }
  }

  async markRead(req, res) {
    try {
      const { platform_user_id } = req.body;
      if (!platform_user_id) return res.status(400).json({ error: 'missing platform_user_id' });
      const { error } = await (await import('../supabaseClient.js')).default
        .from('pony_messages')
        .update({ admin_read: true })
        .eq('platform', 'facebook')
        .eq('platform_user_id', platform_user_id);
      if (error) return res.status(500).json({ error: 'db error' });
      res.json({ status: 'ok' });
    } catch (err) {
      console.error('markRead facebook error', err);
      res.status(500).json({ error: 'internal' });
    }
  }
}

export default new FacebookController();
