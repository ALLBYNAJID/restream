// Vercel Serverless Function to proxy TS segment
import http from 'http';
import https from 'https';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    res.status(400).send("❌ Missing stream ID");
    return;
  }

  const remoteUrl = `http://watchindia.net:8880/live/40972/04523/${id}.ts`;
  const client = remoteUrl.startsWith('https') ? https : http;

  const options = {
    headers: {
      'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
      'Accept': '*/*',
      'Connection': 'keep-alive'
    }
  };

  client.get(remoteUrl, options, (streamRes) => {
    if (streamRes.statusCode !== 200) {
      res.status(502).send(`❌ Upstream error: ${streamRes.statusCode}`);
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'video/MP2T',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive',
    });

    streamRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).send("❌ Error fetching TS segment.");
  });
}