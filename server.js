const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

pool.query(`
  CREATE TABLE IF NOT EXISTS thoughts (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    sentiment REAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.error('Error creating table:', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS prompt (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL
);
`).catch(err => console.error('Error creating prompt table:', err));

pool.query(`
  INSERT INTO prompt (id, text)
  VALUES (1, 'prompt question')
  ON CONFLICT (id) DO NOTHING
`).catch(err => console.error('Error ensuring default prompt:', err));

app.get('/api/prompt', async (req, res) => {
  try {
    const result = await pool.query('SELECT text FROM prompt LIMIT 1');
    res.json({ text: result.rows[0]?.text || '' });
  } catch (err) {
    console.error('Failed to get prompt:', err);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

app.post('/api/prompt', async (req, res) => {
  const { text } = req.body;
  try {
    await pool.query('UPDATE prompt SET text = $1 WHERE id = 1', [text]);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update prompt:', err);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

app.post('/api/thoughts', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'No content provided' });

  const result = sentiment.analyze(content);
  const sentimentScore = result.score;

  try {
    const insert = await pool.query(
      'INSERT INTO thoughts (content, sentiment) VALUES ($1, $2) RETURNING id',
      [content, sentimentScore]
    );
    res.json({ success: true, id: insert.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/thoughts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM thoughts ORDER BY timestamp DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/sentiment-avg', async (req, res) => {
  try {
    const result = await pool.query('SELECT AVG(sentiment) FROM thoughts');
    res.json({ avg: result.rows[0].avg || 0 });
  } catch (err) {
    console.error('Error calculating sentiment average:', err);
    res.status(500).json({ error: 'Failed to calculate sentiment average' });
  }
});

app.delete('/api/thoughts', async (req, res) => {
  try {
    await pool.query('DELETE FROM thoughts');
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting thoughts:', err);
    res.status(500).json({ error: 'Failed to clear thoughts' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});