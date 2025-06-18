import http from 'http';
import https from 'https';
import { URL } from 'url';

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug || slug.length === 0) {
    res.status(400).send("❌ Missing stream ID");
    return;
  }

  const filename = slug.join('/'); // supports nested slug (e.g., wi/folder/803.m3u8)

  // Remove .m3u8 extension if present
  const id = filename.replace(/\.m3u8$/i, '').replace(/\.ts$/i, '');

  const originalUrl = `http://watchindia.net:8880/live/40972/04523/${id}.ts`;

  function fetchStream(url, redirectCount = 0) {
    if (redirectCount > 5) {
      res.status(508).send("❌ Too many redirects");
      return;
    }

    const client = url.startsWith('https') ? https : http;

    client.get(url, {
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      }
    }, (streamRes) => {
      if ([301, 302].includes(streamRes.statusCode)) {
        const redirectUrl = streamRes.headers.location;
        if (!redirectUrl) {
          res.status(502).send("❌ Redirect with no location");
          return;
        }
        fetchStream(redirectUrl, redirectCount + 1);
        return;
      }

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
    }).on('error', () => {
      res.status(500).send("❌ Failed to fetch stream");
    });
  }

  fetchStream(originalUrl);
}