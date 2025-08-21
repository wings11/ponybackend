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

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // Optionally set webhook on startup (uncomment after testing)
  // const telegramService = require('./services/telegram');
  // telegramService.setWebhook();
});