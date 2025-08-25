require('dotenv').config();
const express = require('express');
const telegramRoutes = require('./routes/telegram');
const { createClient } = require('@supabase/supabase-js');


const app = express();
app.use(express.json());

// CORS middleware for local frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

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
  const supabaseTest = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const { data, error } = await supabaseTest.from('pony_messages').select('*');
  if (error) {
    console.error('Supabase test error for pony_messages:', JSON.stringify(error, null, 2));
    return res.status(500).json({ error: JSON.stringify(error) });
  }
  console.log('Supabase test success for pony_messages:', data);
  res.json(data);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // Uncomment to set webhook on startup (optional)
  // const telegramService = require('./services/telegram');
  // telegramService.setWebhook();
});