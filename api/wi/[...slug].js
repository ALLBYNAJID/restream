import http from 'http';
import { parse } from 'url';

function fetchText(url, callback) {
  http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => (data += chunk));
    res.on('end', () => callback(null, res.statusCode, data));
  }).on('error', err => callback(err));
}

export default function handler(req, res) {
  let slug = req.query.slug;
  if (typeof slug === 'string') slug = [slug];

  if (!slug || !slug[0]) {
    return res.status(400).send("❌ Missing stream ID");
  }

  const id = slug[0].replace('.m3u8', '');
  const original = `http://watchindia.net:8880/live/40972/04523/${id}.m3u8`;
  const baseUrl = `http://watchindia.net:8880/live/40972/04523/`;

  fetchText(original, (err, statusCode, m3u8) => {
    if (err || statusCode !== 200) {
      return res.status(502).send(`❌ Error fetching stream: ${err?.message || statusCode}`);
    }

    // Rewrite TS segment paths to full URLs
    const fixed = m3u8.replace(/^(?!#)(.+\.ts.*)$/gm, (line) => {
      return baseUrl + line;
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(fixed);
  });
}