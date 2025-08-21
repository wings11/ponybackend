const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const { handleMedia } = require('../utils/media');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const admin_email = process.env.ADMIN_EMAIL;

class TelegramService {
  async getToken() {
    const { data, error } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('platform', 'telegram')
      .eq('admin_email', admin_email)
      .single();
    if (error) throw new Error(`Failed to get token: ${error.message}`);
    return data.access_token;
  }

  async processIncomingMessage(msg) {
    const sender = msg.from.id.toString();
    const recipient = admin_email;
    const platform = 'telegram';
    let message = msg.text || '';
    let message_type = 'text';
    let media_url = null;

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

    const { error } = await supabase.from('messages').insert({
      sender,
      recipient,
      platform,
      message,
      message_type,
      media_url,
    });
    if (error) throw new Error(`DB insert failed: ${error.message}`);
  }

  async sendMessage({ recipient, message, message_type, media_url }) {
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
    const res = await fetch(sendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(`Telegram send failed: ${data.description}`);

    const { error } = await supabase.from('messages').insert({
      sender: admin_email,
      recipient,
      platform: 'telegram',
      message,
      message_type,
      media_url,
    });
    if (error) throw new Error(`DB insert failed: ${error.message}`);
  }

  async setWebhook() {
    try {
      const token = await this.getToken();
      const webhookUrl = 'YOUR_PUBLIC_URL/telegram/webhook'; // Replace with your domain/ngrok
      const url = `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.ok) console.error('Webhook set failed:', data);
      else console.log('Telegram webhook set successfully');
    } catch (err) {
      console.error('Webhook setup error:', err);
    }
  }
}

module.exports = new TelegramService();