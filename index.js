require('dotenv').config();
const express = require('express');
const telegramRoutes = require('./routes/telegram');

const app = express();
app.use(express.json());

// Mount routes
app.use('/telegram', telegramRoutes);

// Basic health check
app.get('/', (req, res) => res.send('Backend running'));

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});