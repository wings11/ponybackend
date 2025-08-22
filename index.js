require('dotenv').config();
const express = require('express');
const telegramRoutes = require('./routes/telegram');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount routes
app.use('/telegram', telegramRoutes);

// Basic health check
app.get('/', (req, res) => res.send('Backend running'));

// Test Supabase connection
app.get('/test-supabase', async (req, res) => {
  const supabaseTest = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    db: { schema: 'pony' }
  });
  const { data, error } = await supabaseTest.from('messages').select('*');
  if (error) {
    console.error('Supabase test error for pony.messages:', JSON.stringify(error, null, 2));
    return res.status(500).json({ error: JSON.stringify(error) });
  }
  console.log('Supabase test success for pony.messages:', data);
  res.json(data);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // Uncomment to set webhook on startup (optional)
  // const telegramService = require('./services/telegram');
  // telegramService.setWebhook();
});