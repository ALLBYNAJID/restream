import http from 'http';
import https from 'https';
import { URL } from 'url';

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug || slug.length === 0) {
    res.status(400).send("❌ Missing stream ID");
    return;
  }

  // Support URLs like /api/wi/803 or /api/wi/803.m3u8
  const filename = slug.join('/');
  const id = filename.replace(/\.(m3u8|ts)$/i, ''); // Remove extensions if present

  const streamUrl = `http://watchindia.net:8880/live/40972/04523/${id}.ts`;

  const client = streamUrl.startsWith('https') ? https : http;

  const fetchStream = (url, redirects = 0) => {
    if (redirects > 5) {
      res.status(508).send("❌ Too many redirects");
      return;
    }

    client.get(url, {
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      }
    }, (streamRes) => {
      if ([301, 302].includes(streamRes.statusCode)) {
        const redirect = streamRes.headers.location;
        if (!redirect) return res.status(502).send("❌ Redirect with no location");
        return fetchStream(redirect, redirects + 1);
      }

      if (streamRes.statusCode !== 200) {
        return res.status(502).send(`❌ Upstream error: ${streamRes.statusCode}`);
      }

      res.writeHead(200, {
        'Content-Type': 'video/MP2T',
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
      });

      streamRes.pipe(res);
    }).on('error', () => {
      res.status(500).send("❌ Stream fetch error");
    });
  };

  fetchStream(streamUrl);
}
