import http from 'http';
import https from 'https';
import { parse } from 'url';

function followRedirect(url, callback, maxRedirects = 5) {
  const client = url.startsWith('https') ? https : http;

  client.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
      const redirectUrl = new URL(res.headers.location, url).href;
      followRedirect(redirectUrl, callback, maxRedirects - 1);
    } else {
      callback(res);
    }
  }).on('error', (err) => {
    callback(null, err);
  });
}

export default function handler(req, res) {
  let slug = req.query.slug;
  if (typeof slug === 'string') slug = [slug];

  if (!slug || slug.length === 0 || !slug[0]) {
    return res.status(400).send("❌ Missing stream D");
  }

  const id = slug[0].replace('.m3u8', '');
  const upstreamUrl = `http://watchindia.net:8880/live/40972/04523/${id}.m3u8`;

  followRedirect(upstreamUrl, (upstreamRes, err) => {
    if (err || !upstreamRes || upstreamRes.statusCode !== 200) {
      return res.status(502).send(`❌ Upstream ror: ${err?.message || upstreamRes?.statusCode}`);
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    upstreamRes.pipe(res);
  });
}