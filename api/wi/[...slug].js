import http from 'http';
import https from 'https';
import { parse as parseUrl } from 'url';

export default async function handler(req, res) {
  let { slug } = req.query;

  if (!slug) return res.status(400).send("❌ Missing stream ID");
  if (!Array.isArray(slug)) slug = [slug];

  const filename = slug.join('/');
  const id = filename.replace(/\.(m3u8|ts)$/i, '');
  const initialUrl = `http://watchindia.net:8880/live/40972/04523/${id}.ts`;

  const makeRequest = (url, redirectCount = 0) => {
    if (redirectCount > 5) {
      return res.status(500).send("❌ Too many redirects");
    }

    const parsed = parseUrl(url);
    const client = parsed.protocol === 'https:' ? https : http;

    client.get(url, {
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*',
      }
    }, (streamRes) => {
      if ([301, 302].includes(streamRes.statusCode) && streamRes.headers.location) {
        // follow the redirect
        return makeRequest(streamRes.headers.location, redirectCount + 1);
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
    }).on('error', (err) => {
      res.status(500).send("❌ Stream fetch error: " + err.message);
    });
  };

  makeRequest(initialUrl);
}