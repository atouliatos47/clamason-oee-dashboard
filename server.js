require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { initDB } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3011;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/oee',         require('./routes/oee'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/upload',      require('./routes/upload'));

// Catch-all → PWA shell
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Clamason OEE Dashboard running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ DB init failed:', err.message);
  process.exit(1);
});
