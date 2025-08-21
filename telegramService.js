const TelegramBot = require('node-telegram-bot-api');
const supabase = require('./supabaseClient');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// Set webhook (call this once after deployment)
async function setWebhook(webhookUrl) {
  await bot.setWebHook(webhookUrl);
}

// Handle incoming Telegram webhook
async function handleTelegramWebhook(req, res) {
  const update = req.body;
  if (update && update.message) {
    const msg = update.message;
    const sender = msg.from.id;
    const recipient = msg.chat.id;
    const text = msg.text || '';
    let messageType = 'text';
    let mediaUrl = null;
    // Handle media (photo, document, etc.)
    if (msg.photo) {
      messageType = 'image';
      mediaUrl = msg.photo[msg.photo.length - 1].file_id;
    } else if (msg.document) {
      messageType = 'file';
      mediaUrl = msg.document.file_id;
    }
    await supabase.from('pony.messages').insert({
      sender,
      recipient,
      platform: 'telegram',
      message: text,
      message_type: messageType,
      media_url: mediaUrl
    });
  }
  res.sendStatus(200);
}

// Send reply to Telegram user
async function sendTelegramMessage(chatId, text) {
  return bot.sendMessage(chatId, text);
}

module.exports = { setWebhook, handleTelegramWebhook, sendTelegramMessage };
