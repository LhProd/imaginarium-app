const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('Client connected');
});

// Ensure thoughts table
pool.query(`
  CREATE TABLE IF NOT EXISTS thoughts (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    sentiment REAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(err => console.error('Error creating thoughts table:', err));

// Ensure prompt table
pool.query(`
  CREATE TABLE IF NOT EXISTS prompt (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL
  );
`).catch(err => console.error('Error creating prompt table:', err));

// Ensure default prompt row
pool.query(`
  INSERT INTO prompt (id, text)
  VALUES (1, 'prompt question')
  ON CONFLICT (id) DO NOTHING;
`).catch(err => console.error('Error ensuring default prompt:', err));

/* === PROMPT ROUTES === */

// Get current prompt
app.get('/api/prompt', async (req, res) => {
  try {
    const result = await pool.query('SELECT text FROM prompt WHERE id = 1');
    res.json({ text: result.rows[0]?.text || '' });
  } catch (err) {
    console.error('Failed to get prompt:', err);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Update prompt
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

/* === THOUGHT ROUTES === */

// Add new thought
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
    console.error('Error inserting thought:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all thoughts
app.get('/api/thoughts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM thoughts ORDER BY timestamp DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching thoughts:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete all thoughts
app.delete('/api/thoughts', async (req, res) => {
  try {
    await pool.query('DELETE FROM thoughts');
    io.emit('all-thoughts-cleared');
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting all thoughts:', err);
    res.status(500).json({ error: 'Failed to clear thoughts' });
  }
});

// Delete a single thought by ID
app.delete('/api/thoughts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM thoughts WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Thought not found' });
    }

    io.emit('thought-deleted', parseInt(id));
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting thought:', err);
    res.status(500).json({ success: false, error: 'Failed to delete thought' });
  }
});

// Get average sentiment
app.get('/api/sentiment-avg', async (req, res) => {
  try {
    const result = await pool.query('SELECT AVG(sentiment) FROM thoughts');
    res.json({ avg: result.rows[0].avg || 0 });
  } catch (err) {
    console.error('Error calculating sentiment average:', err);
    res.status(500).json({ error: 'Failed to calculate sentiment average' });
  }
});

/* === START SERVER === */
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});