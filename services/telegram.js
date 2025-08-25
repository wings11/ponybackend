const { createClient } = require('@supabase/supabase-js');
let fetch;
try {
  fetch = require('node-fetch');
} catch (e) {
  fetch = global.fetch;
}
const { handleMedia } = require('../utils/media');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const admin_email = process.env.ADMIN_EMAIL;

class TelegramService {
  async getToken() {
    console.log('Fetching token for admin_email:', admin_email);
    const { data, error } = await supabase
      .from('pony_platform_connections')
      .select('access_token')
      .eq('platform', 'telegram')
      .eq('admin_email', admin_email)
      .single();
    if (error) {
      console.error('Token fetch error:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to get token: ${JSON.stringify(error)}`);
    }
    if (!data) {
      console.error('No token found for telegram and admin_email:', admin_email);
      throw new Error('No token found');
    }
    return data.access_token;
  }

  async processIncomingMessage(msg) {
    const sender = msg.from.id.toString();
    const recipient = admin_email;
    const platform = 'telegram';
    let message = msg.text || '';
    let message_type = 'text';
    let media_url = null;

    // Extract metadata
    const first_name = msg.from.first_name || null;
    const last_name = msg.from.last_name || null;
    const username = msg.from.username || null;

    console.log('Processing message from:', sender, 'type:', message_type);

    if (msg.photo) {
      message_type = 'image';
      const photo = msg.photo[msg.photo.length - 1];
      media_url = await handleMedia(this.getToken.bind(this), photo.file_id, 'image/jpeg');
    } else if (msg.video) {
      message_type = 'video';
      media_url = await handleMedia(this.getToken.bind(this), msg.video.file_id, msg.video.mime_type || 'video/mp4');
    } else if (msg.document) {
      message_type = 'file';
      media_url = await handleMedia(this.getToken.bind(this), msg.document.file_id, msg.document.mime_type || 'application/octet-stream');
    } else if (msg.audio) {
      message_type = 'audio';
      media_url = await handleMedia(this.getToken.bind(this), msg.audio.file_id, msg.audio.mime_type || 'audio/mpeg');
    } else if (msg.voice) {
      message_type = 'audio';
      media_url = await handleMedia(this.getToken.bind(this), msg.voice.file_id, msg.voice.mime_type || 'audio/ogg');
    }

    const payload = { sender, recipient, platform, message, message_type, media_url, first_name, last_name, username };
    console.log('Inserting message into pony_messages:', payload);
    const { error } = await supabase.from('pony_messages').insert(payload);
    if (error) {
      console.error('DB insert error for pony_messages:', JSON.stringify(error, null, 2));
      throw new Error(`DB insert failed: ${JSON.stringify(error)}`);
    }
    console.log('Message inserted into pony_messages successfully');
  }

  async sendMessage({ recipient, message, message_type, media_url }) {
    console.log('Sending message to:', recipient, 'type:', message_type);
    const token = await this.getToken();
    let method = 'sendMessage';
    const params = { chat_id: recipient, text: message };

    if (message_type === 'image') {
      method = 'sendPhoto';
      params.photo = media_url;
      params.caption = message;
      delete params.text;
    } else if (message_type === 'video') {
      method = 'sendVideo';
      params.video = media_url;
      params.caption = message;
      delete params.text;
    } else if (message_type === 'audio') {
      method = 'sendAudio';
      params.audio = media_url;
      params.caption = message;
      delete params.text;
    } else if (message_type === 'file') {
      method = 'sendDocument';
      params.document = media_url;
      params.caption = message;
      delete params.text;
    }

    const sendUrl = `https://api.telegram.org/bot${token}/${method}`;
    console.log('Sending to Telegram API:', sendUrl, params);
    const res = await fetch(sendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram API error:', JSON.stringify(data, null, 2));
      throw new Error(`Telegram send failed: ${data.description}`);
    }

    const payload = { sender: admin_email, recipient, platform: 'telegram', message, message_type, media_url };
    console.log('Inserting sent message into pony_messages:', payload);
    const { error } = await supabase.from('pony_messages').insert(payload);
    if (error) {
      console.error('DB insert error for pony_messages:', JSON.stringify(error, null, 2));
      throw new Error(`DB insert failed: ${JSON.stringify(error)}`);
    }
    console.log('Sent message inserted into pony_messages successfully');
  }

  async setWebhook() {
    try {
      const token = await this.getToken();
      const webhookUrl = 'https://ponywardobe.onrender.com/telegram/webhook';
      const url = `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`;
      console.log('Setting webhook:', url);
      const res = await fetch(url);
      const data = await res.json();
      if (!data.ok) console.error('Webhook set failed:', JSON.stringify(data, null, 2));
      else console.log('Telegram webhook set successfully');
    } catch (err) {
      console.error('Webhook setup error:', err.message, err.stack);
    }
  }
}

module.exports = new TelegramService();