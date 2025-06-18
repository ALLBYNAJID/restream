import http from 'http';
import https from 'https';
import { parse } from 'url';

function fetchWithRedirect(url, res) {
  const client = url.startsWith('https') ? https : http;

  client.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'http://watchindia.net/'
    }
  }, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
      const redirectUrl = response.headers.location;
      if (redirectUrl) {
        fetchWithRedirect(redirectUrl, res); // Recursively follow redirect
        return;
      }
    }

    if (response.statusCode !== 200) {
      res.status(502).send(`❌ Error: ${response.statusCode}`);
      return;
    }

    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.end(data);
    });
  }).on('error', () => {
    res.status(500).send("❌ Fetch failed");
  });
}

export default function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send("❌ Missing stream ID");

  const url = `http://watchindia.net:8880/live/40972/04523/${id}.m3u8`;
  fetchWithRedirect(url, res);
}