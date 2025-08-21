require('dotenv').config();
const express = require('express');
const telegramRoutes = require('./routes/telegram');

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

app.get('/test-supabase', async (req, res) => {
  const { data, error } = await require('@supabase/supabase-js')
    .createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    .from('pony.messages')
    .select('*');
  if (error) {
    console.error('Supabase test error:', error);
    return res.status(500).json({ error: JSON.stringify(error) });
  }
  res.json(data);
});



const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // Optionally set webhook on startup (uncomment after testing)
  // const telegramService = require('./services/telegram');
  // telegramService.setWebhook();
});