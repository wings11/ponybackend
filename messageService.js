const supabase = require('./supabaseClient');

async function saveFacebookMessage({ sender, recipient, text, messageType = 'text', mediaUrl = null }) {
  try {
    const { error } = await supabase.from('pony.messages').insert({
      sender,
      recipient,
      platform: 'facebook',
      message: text || '',
      message_type: messageType,
      media_url: mediaUrl
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error saving message to Supabase:', err.message);
    return false;
  }
}

module.exports = { saveFacebookMessage };
