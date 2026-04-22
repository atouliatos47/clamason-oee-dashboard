require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { initDB, pool } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3011;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders(res, filePath) {
        if (filePath.endsWith('.js')) {
            res.set('Cache-Control', 'no-store');
        }
    }
}));

// API Routes
app.use('/api/oee',         require('./routes/oee'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/upload',      require('./routes/upload'));

// Combined data endpoint for frontend state
app.get('/api/data', async (req, res) => {
  try {
    const weeksRes = await pool.query(
      `SELECT DISTINCT week_label FROM oee_data ORDER BY week_label ASC`
    );
    const weeks = weeksRes.rows.map(r => r.week_label);

    const oeeData = {};
    for (const week of weeks) {
      const r = await pool.query(
        `SELECT * FROM oee_data WHERE week_label = $1 ORDER BY machine ASC`,
        [week]
      );
      oeeData[week] = r.rows;
    }

    const maintRes = await pool.query(
      `SELECT * FROM agility_data WHERE period_label = (
        SELECT period_label FROM agility_data ORDER BY uploaded_at DESC LIMIT 1
      ) ORDER BY downtime_hrs DESC`
    );

    res.json({ weeks, oeeData, maintData: maintRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all → PWA shell (must stay last)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Clamason OEE Dashboard running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ DB init failed:', err.message);
  process.exit(1);
});