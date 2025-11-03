// server.js
import express from 'express';
import fetch from 'node-fetch'; // or global fetch in Node 18+
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.FREEPIK_API_KEY;

if (!API_KEY) {
  console.error('ERROR: set FREEPIK_API_KEY in environment before running.');
  process.exit(1);
}

app.use(express.static('public')); // put index.html in ./public

// simple search proxy: /api/search?q=your+query
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    // call Freepik resources endpoint
    const url = new URL('https://api.freepik.com/v1/resources');
    url.searchParams.set('query', q);
    url.searchParams.set('per_page', '20');

    const r = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-freepik-api-key': API_KEY
      }
    });

    const json = await r.json();
    // forward the response to client (you can shape it if you want)
    res.status(r.status).json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'proxy_error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
