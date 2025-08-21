require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

const axios = require('axios');
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const { saveFacebookMessage } = require('./messageService');
const { handleTelegramWebhook, sendTelegramMessage } = require('./telegramService');
// Telegram Webhook Endpoint
app.post('/webhook/telegram', async (req, res) => {
  await handleTelegramWebhook(req, res);
});

// Endpoint to send Telegram message
app.post('/send/telegram', async (req, res) => {
  try {
    const { chatId, text } = req.body;
    if (!chatId || !text) {
      return res.status(400).json({ error: 'chatId and text are required.' });
    }
    await sendTelegramMessage(chatId, text);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Telegram send error:', error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.use(express.json());

// Facebook Messenger Webhook
app.get('/webhook/facebook', (req, res) => {
  const VERIFY_TOKEN = process.env.PONYCHAT_SECRET_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

app.post('/webhook/facebook', async (req, res) => {
  // Handle incoming messages here
  console.log('Received Facebook webhook:', JSON.stringify(req.body));
  try {
    const entries = req.body.entry || [];
    for (const entry of entries) {
      const messagingEvents = entry.messaging || [];
      for (const event of messagingEvents) {
        if (event.message && event.sender && event.recipient) {
          const { text, attachments } = event.message;
          let messageType = 'text';
          let mediaUrl = null;
          if (attachments && attachments.length > 0) {
            messageType = attachments[0].type || 'file';
            mediaUrl = attachments[0].payload ? attachments[0].payload.url : null;
          }
          await saveFacebookMessage({
            sender: event.sender.id,
            recipient: event.recipient.id,
            text,
            messageType,
            mediaUrl
          });
        }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Error saving message to Supabase:', err.message);
    res.sendStatus(500);
  }
});

// Production-ready endpoint to send Facebook Page messages
app.post('/send/facebook', async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    if (!recipientId || !message) {
      return res.status(400).json({ error: 'recipientId and message are required.' });
    }

    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
    const payload = {
      recipient: { id: recipientId },
      message: { text: message }
    };

    const fbRes = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (fbRes.data && fbRes.data.message_id) {
      return res.status(200).json({ success: true, message_id: fbRes.data.message_id });
    } else {
      return res.status(500).json({ error: 'Message not sent', details: fbRes.data });
    }
  } catch (error) {
    console.error('Facebook send error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.response?.data || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});