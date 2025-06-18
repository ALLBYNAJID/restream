// File: /api/wi/[id].js
import http from 'http';
import https from 'https';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    res.status(400).send('Missing stream ID');
    return;
  }

  const remoteUrl = `http://watchindia.net:8880/live/40972/04523/${id}.ts`;

  const client = remoteUrl.startsWith('https') ? https : http;

  client.get(remoteUrl, (streamRes) => {
    if (streamRes.statusCode !== 200) {
      res.status(502).send(`❌ Error: Upstream returned ${streamRes.statusCode}`);
      return;
    }

    // Set headers for HLS .ts streaming
    res.setHeader('Content-Type', 'video/MP2T');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Connection', 'keep-alive');

    streamRes.pipe(res);
  }).on('error', (err) => {
    res.status(502).send('❌ Failed to fetch stream.');
  });
}